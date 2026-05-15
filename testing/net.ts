import * as net from "node:net";

export async function findFreePort(defaultPort?: number): Promise<number> {
	return (defaultPort && await tryPort(defaultPort)) || tryPort(0);
}

async function tryPort(port: 0): Promise<number>;
async function tryPort(port: number): Promise<number | false>;

async function tryPort(port: number): Promise<number | false> {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.on('error', (e) => {
			if (e.code === 'EADDRINUSE') {
				resolve(false);
			} else {
				reject(e);
			}
		});
		server.listen(port, () => {
			const {port} = server.address() as net.AddressInfo;
			server.close((err) => err ? reject(err) : resolve(port))
		});
	})
}
