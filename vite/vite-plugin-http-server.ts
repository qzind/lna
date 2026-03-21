import type {Vite} from 'vitest/node'
import * as http from "node:http";

type Config = {
	host?: string,
	port?: number,
	respond?: boolean;
}

export default function plugin(config: Config): Vite.Plugin {
	const server = http.createServer((_req, res) => {
		try {
			if (config.respond ?? true) {
				res.writeHead(200, {
					'Content-Type': 'text/plain',
					'Access-Control-Allow-Origin': '*',
				});
				res.write('OK');
			}
			res.end();
		} catch(e){}
	});
	return {
		name: 'vite:http-server',
		buildStart() {
			server.listen(config.port, config.host);
		},
		buildEnd() {
			server.close();
		}
	}
}
