import {
	WebdriverBrowserProvider,
	webdriverio,
	WebdriverProviderOptions
} from '@vitest/browser-webdriverio';
import {BrowserProviderOption, createDebugger, TestProject} from "vitest/node";
import type {Capabilities} from "@wdio/types";
import {defineBrowserProvider} from '@vitest/browser'

const debug = createDebugger('vitest:browser:wdio-selenium')

type Options = WebdriverProviderOptions;

function provider(options: Options): BrowserProviderOption<Options> {
	if (options.hostname) {
		return seleniumProvider(options)
	} else {
		return webdriverio(options)
	}
}

// Work around for broken edge browser name with Selenium in @vitest/browser-webdriverio
function seleniumProvider(options: Options): BrowserProviderOption<Options> {
	return defineBrowserProvider({
		name: 'webdriverio-selenium',
		supportedBrowser: webdriverio().supportedBrowser,
		options,
		providerFactory(project) {
			return new SeleniumWebdriverIOProvider(project, options);
		},
	});
}


export class SeleniumWebdriverIOProvider extends WebdriverBrowserProvider {
	protected _project: TestProject
	protected _options: Options
	protected _closing: boolean = false

	constructor(
		project: TestProject,
		options: Options,
	) {
		super(project, options)
		this._project = project
		this._options = options
	}

	getBrowserName(): string {
		return this._project.config.browser.name
	}

	async openBrowser(): Promise<WebdriverIO.Browser> {
		await this.throwIfClosing('opening the browser')

		if (this.browser) {
			debug?.('[%s] the browser is already opened, reusing it', this.getBrowserName())
			return this.browser
		}

		const remoteOptions: Capabilities.WebdriverIOConfig = {
			logLevel: 'silent',
			...this._options,
			capabilities: this.getCapabilities(),
		}

		const {remote} = await import('webdriverio')

		debug?.('[%s] opening the browser with options: %O', this.getBrowserName(), remoteOptions)
		this.browser = await remote(remoteOptions)
		await this.throwIfClosing()

		return this.browser
	}

	// Mirrored from superclass's `buildCapabilities`, but incorporating
	// the seleniumBrowserName fix. Method renamed because of conflict with
	// the private superclass method.
	protected getCapabilities() {
		const capabilities: Capabilities.WebdriverIOConfig['capabilities'] = {
			...this._options?.capabilities,
			browserName: this.seleniumBrowserName(),
		}

		const headlessMap: Record<string, [keyof WebdriverIO.Capabilities, string[]]> = {
			chrome: ['goog:chromeOptions', ['headless', 'disable-gpu']],
			firefox: ['moz:firefoxOptions', ['-headless']],
			edge: ['ms:edgeOptions', ['--headless']],
		}

		const browser = this.getBrowserName()
		const options = this._project.config.browser
		if (options.headless) {
			if (!(browser in headlessMap)) {
				throw new Error(
					`Headless mode is not supported for browser "${browser}"`
				)
			}
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

			// NodeJS equivalent defaults:
			// https://nodejs.org/en/learn/getting-started/debugging#enable-inspector
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

	protected seleniumBrowserName(): string {
		const browser = this.getBrowserName()
		if (!this.getSupportedBrowsers().includes(browser)) {
			throw new Error(`Unsupported browser: ${browser}`)
		}
		switch (browser) {
			case 'edge':
				// Fixes bug in original vitest/browser-webdriverio: Selenium
				// expects "MicrosoftEdge" in capabilities, not "edge"
				return 'MicrosoftEdge'
			default:
				return browser
		}
	}

	// Mirrored from superclass because it's private
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

export {provider as webdriverio}
