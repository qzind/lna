import type {Vite} from 'vitest/node'
import * as net from "node:net";

type Config = {
	host?: string,
	port?: number,
	message?: string,
}

export default function plugin(config: Config): Vite.Plugin {
	const server = net.createServer((c) => {
		c.end();
	});
	return {
		name: 'vite:tcp-server',
		buildStart() {
			server.listen(config.port, config.host);
		},
		buildEnd() {
			server.close();
		}
	}
}
