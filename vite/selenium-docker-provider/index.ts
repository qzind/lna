import {BrowserProviderOption, TestProject} from "vitest/node";
import {defineBrowserProvider} from '@vitest/browser'
import {SeleniumDockerService} from "../../testing/selenium-docker.js";
import {SeleniumProvider} from "../selenium-provider.js";
import {WebdriverIOProviderOptions} from "../webdriverio-provider.js";

type Options = WebdriverIOProviderOptions & {
	docker?: {
		host?: string
	}
	selenium?: {
		host?: string
		publishPort?: number
		subscribePort?: number
	}
}

export default function provider(options: Options): BrowserProviderOption {
	return defineBrowserProvider({
		name: 'webdriverio-selenium-docker',
		supportedBrowser: ['firefox', 'chrome', 'edge', 'safari'],
		options,
		providerFactory(project) {
			return new SeleniumDockerBrowserProvider(project, options)
		}
	})
}

class SeleniumDockerBrowserProvider extends SeleniumProvider<Options> {
	protected _options: Options
	protected service: SeleniumDockerService;

	protected get logger() {
		return this._project.vitest.logger;
	}

	constructor(
		project: TestProject,
		options: Options,
	) {
		super(project, options)
		this._options = options
		if (!options.capabilities) {
			throw new Error("No capabilities specified");
		}
		if ('alwaysMatch' in options.capabilities) {
			throw new Error("Capabilities must be specified as a plain object, not a W3C spec-compliant capabilities object");
		}
		this.service = new SeleniumDockerService({
			docker: options.docker,
			headless: project.config.browser.headless,
			browser: {
				name: options.capabilities.browserName,
				version: options.capabilities.browserVersion,
			},
		});
	}

	async openBrowser(): Promise<WebdriverIO.Browser> {
		await this.throwIfClosing('opening the browser')
		const {port} = await this.service.start();
		this._options.hostname = 'localhost';
		this._options.port = port;
		return await super.openBrowser();
	}

	async close(): Promise<void> {
		await super.close()
		await this.service.stop()
	}
}
