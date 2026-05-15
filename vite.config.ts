import type {UserConfig} from 'vite'
import * as path from "node:path";
import babel from "@rollup/plugin-babel";

import httpServerPlugin from "./vite/vite-plugin-http-server";
import {AddressSpace, AddressSpaceOverrides} from "./util/address-space-override";
import {findFreePort} from "./testing/net";

import babelOptions from './rollup.babel.config.ts';
import packageJson from './package.json' with {type: 'json'};

export const TestServerAddress = '127.0.0.1';
export const TestServers = {
	success: {
		loopback: await findFreePort(10001),
		local: await findFreePort(10002),
		public: await findFreePort(10003),
	},
	fail: {
		loopback: await findFreePort(11001),
		local: await findFreePort(11002),
		public: await findFreePort(11003),
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
				babel(babelOptions),
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
