import {BrowserProviderOption} from "vitest/node";
import {defineBrowserProvider} from "@vitest/browser";
import {webdriverio, WebdriverProviderOptions} from "@vitest/browser-webdriverio";
import {WebdriverIOProvider, WebdriverIOProviderOptions} from "./webdriverio-provider.js";

type Options = WebdriverIOProviderOptions;

export function seleniumProvider(options: WebdriverProviderOptions): BrowserProviderOption {
	return defineBrowserProvider({
		name: 'selenium',
		supportedBrowser: webdriverio().supportedBrowser,
		options,
		providerFactory(project) {
			return new WebdriverIOProvider(project, options);
		},
	});
}

// Work around for wrong edge browser name with Selenium in @vitest/browser-webdriverio
export class SeleniumProvider<O extends Options = Options> extends WebdriverIOProvider<O> {
	protected makeCapabilities() {
		return {
			...super.makeCapabilities(),
			browserName: this.seleniumBrowserName(),
		}
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
}
