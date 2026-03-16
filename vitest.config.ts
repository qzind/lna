import {defineConfig, ViteUserConfig} from 'vitest/config'
import {webdriverio} from '@vitest/browser-webdriverio';
import {BrowserCommand, BrowserInstanceOption} from "vitest/node";
import * as path from "node:path";

import httpEchoPlugin from "./vite/vite-plugin-http-server.js";

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

type AddressSpace = 'public' | 'local' | 'loopback';
type AddressSpaceOverrides = Record<`${string}:${number}`, AddressSpace>;

function instance(
	browser: BrowserInstanceOption['browser'],
	version?: string,
	originAddressSpace?: AddressSpace,
): BrowserInstanceOption {
	const chromeOptions: WebdriverIO.Capabilities['goog:chromeOptions'] = {};

	const addressSpaceOverrides: AddressSpaceOverrides = {};

	if (originAddressSpace) {
		addressSpaceOverrides[`${BrowserApiConfig.host ?? '127.0.0.1'}:${BrowserApiConfig.port}`] = originAddressSpace;
	}
	addressSpaceOverrides[TargetAddressLoopback] = 'loopback';
	addressSpaceOverrides[TargetAddressLocal] = 'local';
	addressSpaceOverrides[TargetAddressPublic] = 'public';

	chromeOptions.args = [
		'ip-address-space-overrides=' + Object.entries(addressSpaceOverrides)
			.map(([addr, space]) => `${addr}=${space}`).join(','),
	];

	return {
		browser,
		name: originAddressSpace
			? `${browser}-${version}-${originAddressSpace}`
			: `${browser}-${version}`,
		provider: webdriverio({
			capabilities: {
				browserVersion: version,
				'goog:chromeOptions': chromeOptions,
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
		'141', '142', '143', '144', '145', '146',
	],
	firefox: [
		'stable_148.0',
		'nightly_150.0a1'
	]
}).flatMap(([browser, versions]) => versions.map(version => [browser, version]));

function e2eTest(originAddressSpace: AddressSpace): ViteUserConfig {
	return {
		...commonConfig,
		define: {
			'lna_origin_address_space': JSON.stringify(originAddressSpace),
			'lna_loopback_url': JSON.stringify(`http://${TargetAddressLoopback}`),
			'lna_local_url': JSON.stringify(`http://${TargetAddressLocal}`),
			'lna_public_url': JSON.stringify(`http://${TargetAddressPublic}`),
		},
		test: {
			...commonConfig.test,
			name: `e2e-${originAddressSpace}`,
			dir: 'test/e2e',
			browser: {
				api: BrowserApiConfig,
				enabled: true,
				headless: true,
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
					browser: {
						enabled: true,
						headless: true,
						commands: browserCommands,
						instances: browsers.map(([b, v]) => instance(b, v)),
					}
				}
			},
			e2eTest('public'),
		],
	},
	plugins: [
		httpEchoPlugin({port: TargetPortPublic}),
		httpEchoPlugin({port: TargetPortLocal}),
		httpEchoPlugin({port: TargetPortLoopback}),
	],
})
