import type {Vite} from 'vitest/node'
import * as http from "node:http";

type Config = {
	host?: string,
	port?: number,
	message?: string,
}

export default function plugin(config: Config): Vite.Plugin {
	const server = http.createServer((_req, res) => {
		res.writeHead(200, {
			'Content-Type': 'text/plain',
			'Access-Control-Allow-Origin': '*',
		});
		res.write(config.message || 'OK');
		res.end();
	});
	return {
		name: 'vite:http-echo',
		buildStart() {
			server.listen(config.port, config.host);
		},
		buildEnd() {
			server.close();
		}
	}
}
