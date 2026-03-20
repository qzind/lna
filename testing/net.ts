import * as net from "node:net";

export async function findFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.listen(0, () => {
			const {port} = server.address() as net.AddressInfo;
			server.close((err) => err ? reject(err) : resolve(port))
		});
	})
}
