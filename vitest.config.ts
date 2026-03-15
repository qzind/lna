import {defineConfig, ViteUserConfig} from 'vitest/config'
import {webdriverio} from '@vitest/browser-webdriverio';
import {BrowserCommand, BrowserInstanceOption} from "vitest/node";
import * as path from "node:path";

const setPermissions: BrowserCommand<[PermissionDescriptor, PermissionState]> = async (ctx, descriptor, state) => {
	if (ctx.provider.name !== 'webdriverio') {
		throw new Error("setPermissions command only supported in webdriverio")
	}
	await ctx.provider.browser.setPermissions(descriptor, state)
}

const browserCommands = {
	setPermissions,
}


function instance(
	browser: BrowserInstanceOption['browser'],
	version?: string
): BrowserInstanceOption {
	return {
		browser,
		name: `${browser}-${version}`,
		provider: webdriverio({
			capabilities: {browserVersion: version},
		})
const commonConfig: ViteUserConfig = {
	test: {
		alias: {
			src: path.resolve(__dirname, 'src'),
		},
	}
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
						instances: [
							instance('chrome', '141'),
							instance('chrome', '142'),
							instance('chrome', '143'),
							instance('chrome', '144'),
							instance('chrome', '145'),
							instance('chrome', '146'),
							instance('firefox', 'stable_148.0'),
							instance('firefox', 'nightly_150.0a1'),
						]
					}
				}
			},
		]
	}
})
