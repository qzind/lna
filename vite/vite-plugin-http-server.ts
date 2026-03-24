import type {Vite} from 'vitest/node'
import * as http from "node:http";
import * as crypto from "node:crypto";

type Config = {
	host?: string,
	port?: number,
	respond?: boolean;
}

function isWebsocketUpgrade(req: http.IncomingMessage) {
	return req.headers['upgrade'] === 'websocket' && req.headers['connection'] === 'Upgrade';
}

function handleWebsocketUpgrade(req: http.IncomingMessage, res: http.ServerResponse) {
	if (!isWebsocketUpgrade(req)) return false;
	let key = req.headers['sec-websocket-key'];
	const magic = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
	const digest = crypto.createHash('sha1').update(key + magic).digest('base64')
	res.writeHead(101, {
		'Upgrade': 'websocket',
		'Connection': 'Upgrade',
		'Sec-WebSocket-Accept': digest,
	})
	res.end();
	return true;
}

export default function plugin(config: Config): Vite.Plugin {
	let server: http.Server | null = null;
	return {
		name: 'vite:http-server',
		configResolved(config) {
			if (config.mode !== 'development') return;
			server = http.createServer((req, res) => {
				try {
					if (config.respond ?? true) {
						if (handleWebsocketUpgrade(req, res)) return;
						res.writeHead(200, {
							'Content-Type': 'text/plain',
							'Access-Control-Allow-Origin': '*',
						});
						res.write('OK');
					}
					res.end();
				} catch (e) {
				}
			});
		},
		buildStart() {
			server?.listen(config.port, config.host);
		},
		buildEnd() {
			server?.close();
		}
	}
}
