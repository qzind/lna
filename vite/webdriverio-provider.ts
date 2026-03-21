import {
	WebdriverBrowserProvider,
	webdriverio,
	WebdriverProviderOptions
} from '@vitest/browser-webdriverio';
import {BrowserProviderOption, createDebugger, TestProject} from "vitest/node";
import {defineBrowserProvider} from '@vitest/browser'
import {Capabilities} from "@wdio/types";

const debug = createDebugger('vitest:browser:wdio')

type Options = WebdriverProviderOptions & {
	capabilities: WebdriverIO.Capabilities,
};
export type WebdriverIOProviderOptions = Options;

export function webdriverioProvider(options: Options): BrowserProviderOption {
	return defineBrowserProvider<Options>({
		name: 'webdriverio',
		supportedBrowser: webdriverio().supportedBrowser,
		options,
		providerFactory(project) {
			return new WebdriverIOProvider(project, options);
		},
	});
}

// Base class, mostly copy-pasted from Vitest's original WebdriverBrowserProvider, but with some
// fields made accessible to subclasses. No change in behavior from parent class
export class WebdriverIOProvider<O extends Options = WebdriverIOProviderOptions> extends WebdriverBrowserProvider {
	protected _project: TestProject
	protected _options: O
	protected _closing: boolean = false

	constructor(
		project: TestProject,
		options: O,
	) {
		super(project, options)
		this._project = project
		this._options = options
	}

	public getBrowserName(): string {
		return this._project.config.browser.name
	}

	async openBrowser(): Promise<WebdriverIO.Browser> {
		await this.throwIfClosing('opening the browser')

		if (this.browser) {
			debug?.('[%s] the browser is already opened, reusing it', this.getBrowserName())
			return this.browser
		}

		const options = this._project.config.browser

		if (this.getBrowserName() === 'safari') {
			if (options.headless) {
				throw new Error(
					'You\'ve enabled headless mode for Safari but it doesn\'t currently support it.',
				)
			}
		}

		const {remote} = await import('webdriverio')

		const remoteOptions: Capabilities.WebdriverIOConfig = {
			logLevel: 'silent',
			...this._options,
			capabilities: this.makeCapabilities(),
		}

		debug?.('[%s] opening the browser with options: %O', this.getBrowserName(), remoteOptions)
		// TODO: close everything, if browser is closed from the outside
		this.browser = await remote(remoteOptions)
		await this.throwIfClosing()

		return this.browser
	}

	protected makeCapabilities() {
		const capabilities: Capabilities.WebdriverIOConfig['capabilities'] = {
			...this._options?.capabilities,
			browserName: this.getBrowserName(),
		}

		const headlessMap = {
			chrome: ['goog:chromeOptions', ['headless', 'disable-gpu']],
			firefox: ['moz:firefoxOptions', ['-headless']],
			edge: ['ms:edgeOptions', ['--headless']],
		} as const

		const options = this._project.config.browser
		const browser = this.getBrowserName()
		if (browser !== 'safari' && options.headless) {
			const [key, args] = headlessMap[browser]
			const currentValues = (this._options?.capabilities as any)?.[key] || {}
			const newArgs = [...(currentValues.args || []), ...args]
			capabilities[key] = {...currentValues, args: newArgs as any}
		}

		// start Vitest UI maximized only on supported browsers
		if (options.ui && (browser === 'chrome' || browser === 'edge')) {
			const key = browser === 'chrome'
				? 'goog:chromeOptions'
				: 'ms:edgeOptions'
			const args = capabilities[key]?.args || []
			if (!args.includes('--start-maximized') && !args.includes('--start-fullscreen')) {
				args.push('--start-maximized')
			}
			capabilities[key] ??= {}
			capabilities[key]!.args = args
		}

		const inspector = this._project.vitest.config.inspector
		if (inspector.enabled && (browser === 'chrome' || browser === 'edge')) {
			const key = browser === 'chrome'
				? 'goog:chromeOptions'
				: 'ms:edgeOptions'
			const args = capabilities[key]?.args || []

			// NodeJS equivalent defaults: https://nodejs.org/en/learn/getting-started/debugging#enable-inspector
			const port = inspector.port || 9229
			const host = inspector.host || '127.0.0.1'

			args.push(`--remote-debugging-port=${port}`)

			if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
				this._project.vitest.logger.warn(`Custom inspector host "${host}" will be ignored. Chrome only allows remote debugging on localhost.`)
			}
			this._project.vitest.logger.log(`Debugger listening on ws://127.0.0.1:${port}`)

			capabilities[key] ??= {}
			capabilities[key]!.args = args
		}

		return capabilities
	}

	protected async throwIfClosing(action?: string) {
		if (this._closing) {
			debug?.(`[%s] provider was closed, cannot perform the action${action ? ` ${action}` : ''}`, this.getBrowserName())
			await (this.browser?.sessionId ? this.browser?.deleteSession?.() : null)
			throw new Error(`[vitest] The provider was closed.`)
		}
	}

	async close(): Promise<void> {
		this._closing = true
		await super.close()
	}
}
