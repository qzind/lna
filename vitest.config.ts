import {defineConfig, ViteUserConfig} from 'vitest/config'
import {BrowserCommand, BrowserInstanceOption} from "vitest/node";
import * as path from "node:path";

import viteConfig, {
	OriginAddressSpaceDefineName,
	TestServerAddressDefines,
	TestServerAddressSpaceOverrides
} from './vite.config.js';

import {
	AddressSpace,
	AddressSpaceOverrides,
	ChromeAddressSpaceOverridesArgs,
	FirefoxAddressSpaceOverridesPrefs
} from "./util/address-space-override.js";
import {webdriverioProvider, WebdriverIOProviderOptions} from "./vite/webdriverio-provider.js";
import {msEdgeProvider} from "./vite/msedge-provider/provider.js";

const setPermissions: BrowserCommand<[PermissionDescriptor, PermissionState]> = async (ctx, descriptor, state) => {
	if (ctx.provider.name !== 'webdriverio') {
		throw new Error("setPermissions command only supported in webdriverio")
	}
	return await ctx.provider.browser.setPermissions(descriptor, state)
}

const browserCommands = {
	setPermissions,
}

const BrowserApiConfig = {
	port: 63325,
	strictPort: true,
}

function providerForBrowser(browser: BrowserInstanceOption['browser']) {
	switch (browser) {
		case 'edge':
			return msEdgeProvider;
		case 'chrome':
		case 'firefox':
			return webdriverioProvider;
		case 'safari':
			return (opts: WebdriverIOProviderOptions) => webdriverioProvider({
				...opts,
				hostname: 'localhost',
				port: 4444,
			});
		default:
			throw new Error(`Unsupported browser: ${browser}`);
	}
}

function instance(
	browser: BrowserInstanceOption['browser'],
	version?: string | [string, string],
	originAddressSpace?: AddressSpace,
): BrowserInstanceOption {

	const addressSpaceOverrides: AddressSpaceOverrides = {
		...TestServerAddressSpaceOverrides
	};

	if (originAddressSpace) {
		addressSpaceOverrides[`${BrowserApiConfig.host ?? '127.0.0.1'}:${BrowserApiConfig.port}`] = originAddressSpace;
	}

	let channel = undefined;
	if (version instanceof Array) {
		[channel, version] = version;
	}

	const provider = providerForBrowser(browser);
	return {
		browser,
		name: originAddressSpace
			? `${browser}-${version}-${originAddressSpace}`
			: `${browser}-${version}`,
		provider: provider({
			channel,
			capabilities: {
				browserVersion: version,
				'goog:chromeOptions': {
					args: [
						// Without this, "Chrome for Testing" builds automatically opt-in to LNA
						// experiments
						// https://chromium.googlesource.com/chromium/src/+/master/testing/variations/
						'disable-field-trial-config',
						...ChromeAddressSpaceOverridesArgs(addressSpaceOverrides),
						// WebSocket restrictions will be enabled in 147 stable release, so enable
						// it manually for tested pre-release. See
						// https://groups.google.com/a/chromium.org/g/blink-dev/c/O6GMKt44Ups
						// https://docs.google.com/document/d/1GHbpRTCnfDXq9o8WKyrG7oPAiWC6Yozac-PvbfO3KoY
						...(browser === 'chrome' && parseInt(version) >= 147 ?
							['--enable-features=LocalNetworkAccessChecksWebSockets']
							: []),
					],
				},
				'ms:edgeOptions': {
					args: [
						'disable-field-trial-config',
					],
				},
				'moz:firefoxOptions': {
					prefs: FirefoxAddressSpaceOverridesPrefs(addressSpaceOverrides),
				},
			},
		}),
	}
}

const commonConfig: ViteUserConfig = {
	test: {
		alias: {
			src: path.resolve(__dirname, 'src'),
		},
	}
}

const browsers = Object.entries({
	chrome: [
		// Last version without LNA implementation
		'135',
		// Versions with opt-in LNA
		'137', '139', '140', // 136 & 138 fail to start
		// Versions with LNA enabled by default
		'141', '142', '143', '144', '145', '146',
		// First version with WebSocket restrictions enabled
		'147',
	],
	firefox: [
		'stable_148.0',
		'stable_149.0',
		'nightly_150.0a1'
	],
	edge: [
		'144', '145', '146',
		['beta', '147'],
		// ['canary', '148'], No Linux edgedriver released yet
	],
	safari: [
		'stable',
	],
}).flatMap(([browser, versions]) => versions.map(version => [browser, version]));

function e2eTest(originAddressSpace: AddressSpace): ViteUserConfig {
	return {
		...commonConfig,
		define: {
			[OriginAddressSpaceDefineName]: JSON.stringify(originAddressSpace),
			...TestServerAddressDefines,
		},
		test: {
			...commonConfig.test,
			name: `e2e-${originAddressSpace}`,
			dir: 'test/e2e',
			browser: {
				api: BrowserApiConfig,
				enabled: true,
				headless: true,
				screenshotFailures: false,
				commands: browserCommands,
				instances: browsers.map(([b, v]) => instance(b, v, originAddressSpace)),
			}
		}
	};
}

export default defineConfig({
	...viteConfig,
	test: {
		projects: [
			{
				...commonConfig,
				test: {
					...commonConfig.test,
					name: 'unit',
					dir: 'test/unit',
				},
			},
			{
				...commonConfig,
				test: {
					...commonConfig.test,
					name: 'browser',
					dir: 'test/browser',
					api: BrowserApiConfig,
					browser: {
						enabled: true,
						headless: true,
						commands: browserCommands,
						screenshotFailures: false,
						instances: browsers.map(([b, v]) => instance(b, v)),
					}
				}
			},
			e2eTest('public'),
		],
	},
})
