import {defineConfig, ViteUserConfig} from 'vitest/config'
import {BrowserCommand, BrowserInstanceOption} from "vitest/node";
import * as path from "node:path";

import httpServerPlugin from "./vite/vite-plugin-http-server.js";
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

const TargetPortLoopback = 10001;
const TargetPortLocal = 10002;
const TargetPortPublic = 10003;
const TargetAddressLoopback = `127.0.0.1:${TargetPortLoopback}`;
const TargetAddressLocal = `127.0.0.1:${TargetPortLocal}`;
const TargetAddressPublic = `127.0.0.1:${TargetPortPublic}`;
const TargetPortLoopbackFail = 11001;
const TargetPortLocalFail = 11002;
const TargetPortPublicFail = 11003;
const TargetAddressLoopbackFail = `127.0.0.1:${TargetPortLoopbackFail}`;
const TargetAddressLocalFail = `127.0.0.1:${TargetPortLocalFail}`;
const TargetAddressPublicFail = `127.0.0.1:${TargetPortPublicFail}`;

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
	version?: string,
	originAddressSpace?: AddressSpace,
): BrowserInstanceOption {

	const addressSpaceOverrides: AddressSpaceOverrides = {};

	if (originAddressSpace) {
		addressSpaceOverrides[`${BrowserApiConfig.host ?? '127.0.0.1'}:${BrowserApiConfig.port}`] = originAddressSpace;
	}
	addressSpaceOverrides[TargetAddressLoopback] = 'loopback';
	addressSpaceOverrides[TargetAddressLocal] = 'local';
	addressSpaceOverrides[TargetAddressPublic] = 'public';
	addressSpaceOverrides[TargetAddressLoopbackFail] = 'loopback';
	addressSpaceOverrides[TargetAddressLocalFail] = 'local';
	addressSpaceOverrides[TargetAddressPublicFail] = 'public';

	const provider = providerForBrowser(browser);
	return {
		browser,
		name: originAddressSpace
			? `${browser}-${version}-${originAddressSpace}`
			: `${browser}-${version}`,
		provider: provider({
			capabilities: {
				browserVersion: version,
				'goog:chromeOptions': {
					args: [
						// Without this, "Chrome for Testing" builds automatically opt-in to LNA
						// experiments
						// https://chromium.googlesource.com/chromium/src/+/master/testing/variations/
						'disable-field-trial-config',
						...ChromeAddressSpaceOverridesArgs(addressSpaceOverrides),
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
	],
	firefox: [
		'stable_148.0',
		'nightly_150.0a1'
	],
	edge: [
		'145', '144',
	],
	safari: [
		'stable',
	],
}).flatMap(([browser, versions]) => versions.map(version => [browser, version]));

function e2eTest(originAddressSpace: AddressSpace): ViteUserConfig {
	return {
		...commonConfig,
		define: {
			'lna_origin_address_space': JSON.stringify(originAddressSpace),
			'lna_loopback_url': JSON.stringify(`http://${TargetAddressLoopback}`),
			'lna_local_url': JSON.stringify(`http://${TargetAddressLocal}`),
			'lna_public_url': JSON.stringify(`http://${TargetAddressPublic}`),
			'lna_loopback_fail_url': JSON.stringify(`http://${TargetAddressLoopbackFail}`),
			'lna_local_fail_url': JSON.stringify(`http://${TargetAddressLocalFail}`),
			'lna_public_fail_url': JSON.stringify(`http://${TargetAddressPublicFail}`),
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
	plugins: [
		httpServerPlugin({port: TargetPortPublic}),
		httpServerPlugin({port: TargetPortLocal}),
		httpServerPlugin({port: TargetPortLoopback}),
		// HTTP server sending empty responses (for testing connection errors that aren't permission
		// errors)
		httpServerPlugin({respond: false, port: TargetPortPublicFail}),
		httpServerPlugin({respond: false, port: TargetPortLocalFail}),
		httpServerPlugin({respond: false, port: TargetPortLoopbackFail}),
	],
})
