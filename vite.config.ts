import type {UserConfig} from 'vite'
import * as path from "node:path";

import httpServerPlugin from "./vite/vite-plugin-http-server";
import {AddressSpace, AddressSpaceOverrides} from "./util/address-space-override";

import packageJson from './package.json' with {type: 'json'};
import babel from "@rollup/plugin-babel";

export const TestServerAddress = '127.0.0.1';
export const TestServers = {
	success: {
		loopback: 10001,
		local: 10002,
		public: 10003,
	},
	fail: {
		loopback: 11001,
		local: 11002,
		public: 11003,
	},
}

export const OriginAddressSpaceDefineName = 'lna_origin_address_space';

export const TestServerAddressDefines = Object.fromEntries(
	Object.entries(TestServers).flatMap(([type, spaces]) =>
		Object.entries(spaces).map(
			([space, port]) => [
				`lna_${space}_${type}_url`,
				JSON.stringify(`http://${TestServerAddress}:${port}`)
			]
		)
	)
)

export const TestServerAddressSpaceOverrides: AddressSpaceOverrides = Object.fromEntries(
	[...Object.entries(TestServers.success), ...Object.entries(TestServers.fail)].map(
		([space, port]) => [`${TestServerAddress}:${port}`, space as AddressSpace]
	)
);

export default {
	resolve: {
		alias: {
			"src": path.resolve(__dirname, "src"),
		}
	},
	build: {
		lib: {
			entry: path.resolve(__dirname, 'src/index.ts'),
			name: packageJson.name,
			formats: ['umd'],
		},
		rollupOptions: {
			plugins: [
				babel({
					babelHelpers: 'bundled',
					extensions: ['.js', '.ts'],
					targets: ['cover 99.9%', 'IE 11'],
					// Exclude every package except ip-address, avoids core-js
					// itself being transpiled, causing errors.
					// https://github.com/rollup/plugins/tree/master/packages/babel#external-dependencies
					// https://gist.github.com/bwindels/7eff8a2cf02ba6ad13ace061a8d68c3c
					exclude: /node_modules\/(?!ip-address\/)/,
					presets: [
						[
							'@babel/preset-env',
							{
								useBuiltIns: 'usage',
								corejs: "3.49",
							}
						],
					],
				}),
			],
		}
	},
	plugins: [
		httpServerPlugin({port: TestServers.success.public}),
		httpServerPlugin({port: TestServers.success.local}),
		httpServerPlugin({port: TestServers.success.loopback}),
		// HTTP server sending empty responses (for testing connection errors that aren't permission
		// errors)
		httpServerPlugin({respond: false, port: TestServers.fail.public}),
		httpServerPlugin({respond: false, port: TestServers.fail.local}),
		httpServerPlugin({respond: false, port: TestServers.fail.loopback}),
	],
} satisfies UserConfig
