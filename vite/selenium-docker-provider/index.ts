import {WebdriverProviderOptions} from '@vitest/browser-webdriverio';
import {BrowserProviderOption, createDebugger, TestProject} from "vitest/node";
import {defineBrowserProvider} from '@vitest/browser'
import {ContainerCreateRequest, DockerClient, HostConfig} from '@docker/node-sdk'
import * as net from "node:net";
import {SeleniumWebdriverIOProvider} from "../webdriverio-provider.js";

const debug = createDebugger('vitest:browser:selenium-docker')

type Options = WebdriverProviderOptions & {
	docker?: {
		host?: string
	}
	selenium?: {
		host?: string
		publishPort?: number
		subscribePort?: number
	}
}

export default function provider(options: Options): BrowserProviderOption<Options> {
	return defineBrowserProvider({
		name: 'webdriverio-selenium-docker',
		supportedBrowser: ['firefox', 'chrome', 'edge', 'safari'],
		options,
		providerFactory(project) {
			return new SeleniumDockerBrowserProvider(project, options)
		}
	})
}

class SeleniumDockerBrowserProvider extends SeleniumWebdriverIOProvider {
	protected _options: Options

	#docker: DockerClient | null = null;

	private containerId: string | null = null

	protected get logger() {
		return this._project.vitest.logger;
	}

	constructor(
		project: TestProject,
		options: Options,
	) {
		super(project, options)
		this._options = options
	}

	async openBrowser(): Promise<WebdriverIO.Browser> {
		await this.throwIfClosing('opening the browser')
		await this.startDockerContainer();
		return await super.openBrowser();
	}

	protected async startDockerContainer(): Promise<void> {
		const docker = await this.docker();
		await this.pullImage();
		debug?.("Creating Selenium Docker container");

		const port = await findFreePort();
		const container = await docker.containerCreate(
			this.makeContainerConfig(port),
		)
		if (container.Warnings) {
			this.logger.warn(...container.Warnings);
		}
		if (!container.Id) {
			throw new Error(`Failed to create container`);
		}
		this.containerId = container.Id;
		debug?.(`Starting container ${container.Id}`);
		await docker.containerStart(container.Id);
		try {
			await this.waitForContainer(container.Id, port, 10000, 500);
			this._options.hostname = 'localhost';
			this._options.port = port;
		} catch (e) {
			this.logger.warn("Timed out waiting for container, destroying it");
			try {
				await this.removeContainer()
			} catch (e) {
			}
			throw e;
		}
	}

	protected async waitForContainer(id: string, port: number, timeout: number, interval: number) {
		const docker = await this.docker();
		const startTime = Date.now();
		// Wait until container is started up
		debug?.(`Waiting for container ${id}`)
		while (Date.now() - startTime <= timeout) {
			await sleep(interval);
			const inspect = await docker.containerInspect(id);
			const state = inspect.State?.Status;
			switch (state) {
				case 'created':
					continue
				case 'running':
					try {
						if (await this.checkNodeIsUp('localhost', port)) {
							debug?.(`Container ${id} is up and running on port ${port}`);
							return;
						}
					} catch (e) {
					}
					continue
				case 'exited':
				case 'dead':
					await this.abortContainerStart()
					throw new Error("Failed to start container")
				default:
					await this.abortContainerStart()
					throw new Error(`Container ${id} has unexpected state: ${state}`)
			}
		}
		throw new Error("Timed out waiting for container");
	}

	protected makeContainerConfig(port: number): ContainerCreateRequest {
		const opt = this._options.selenium;
		const standalone = !opt?.host;
		const hostNetworkMode = true

		const env: string[] = []
		const hostConfig: HostConfig = {};

		if (standalone) {
			env.push('SE_BIND_BUS=false')
		} else {
			env.push(`SE_EVENT_BUS_PUBLISH_PORT=${opt.publishPort}`)
			env.push(`SE_EVENT_BUS_SUBSCRIBE_PORT=${opt.subscribePort}`)
		}
		if (hostNetworkMode) {
			hostConfig.NetworkMode = 'host';
			env.push(`SE_NODE_PORT=${port}`)
		} else {
			const innerPort = 4444;
			env.push(`SE_NODE_PORT=${innerPort}`)
			hostConfig.PortBindings = {
				[`${innerPort}/tcp`]: [{
					HostPort: port.toString(),
				}],
			}
		}
		if (this._project.config.browser.headless) {
			env.push(
				`SE_START_VNC=false`,
				`SE_START_NO_VNC=false`,
				`SE_START_XVFB=false`,
			)
		}

		return {
			Image: this.image(),
			Env: env,
			HostConfig: hostConfig,
			Labels: {
				'selenium-docker.pid': process.pid.toString(),
			},
		}
	}

	protected async pullImage() {
		const docker = await this.docker();
		const image = this.image();
		try {
			await docker.imageInspect(image);
			return;
		} catch (e) {
		}

		debug?.(`Pulling image ${image}`);
		const msgs = docker.imageCreate({
			fromImage: image,
		})
		for await (const msg of msgs.messages()) {
			if ('message' in msg && msg.message) {
				throw new Error(msg.message.toString());
			}
		}
		await msgs.wait();
	}

	private async checkNodeIsUp(host: string, port: number): Promise<boolean> {
		const ready = await fetch(`http://${host}:${port}/readyz`);
		if (!ready.ok) return false;
		// For standalone images & hubs
		const json = await fetch(`http://${host}:${port}/wd/hub/status`);
		const status = JSON.parse(await json.text());
		return status.value.ready;
	}

	private async abortContainerStart() {
		const docker = await this.docker();
		if (!this.containerId) return;
		try {
			await docker.containerLogs(
				this.containerId,
				this.logger.errorStream,
				this.logger.errorStream,
				{
					stdout: true,
					stderr: true,
				}
			)
			await this.removeContainer();
		} catch (e) {
			this.logger.error("Failed to remove container after failing to start it", e);
		}
	}

	protected async removeContainer() {
		if (!this.containerId) return;
		await this.stopContainer();
		const docker = await this.docker();
		await docker.containerDelete(this.containerId)
	}

	protected async stopContainer() {
		if (!this.containerId) return;
		debug?.("Trying to stop container " + this.containerId)
		const docker = await this.docker();
		await docker.containerStop(this.containerId);

		for (let i = 0; i < 20; i++) {
			const inspect = await docker.containerInspect(this.containerId);
			if (inspect.State?.Status === 'exited') {
				debug?.("Stopped container " + this.containerId)
				return
			}
			await sleep(500);
		}
		this.logger.error(`Failed to stop container ${this.containerId}. Killing.`);
		await docker.containerKill(this.containerId);
	}

	protected async docker() {
		if (this.#docker) {
			return this.#docker
		}
		if (this._options.docker?.host) {
			this.#docker = await DockerClient.fromDockerHost(this._options.docker.host)
		} else {
			this.#docker = await DockerClient.fromDockerConfig();
		}
		return this.#docker;
	}

	protected image(): string {
		return `${this.imageName()}:${this.imageTag()}`
	}

	protected imageName(): string {
		return `selenium/standalone-${this.getBrowserName()}`
	}

	protected imageTag(): string {
		const version = this._options.capabilities?.browserVersion?.toString();
		if (!version) return 'latest';
		if (/^\d+$/.test(version)) return `${version}.0`;
		return version;
	}

	async close(): Promise<void> {
		await super.close()
		await this.removeContainer()
	}
}

async function sleep(ms: number) {
	await new Promise(resolve => setTimeout(resolve, ms));
}

async function findFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.listen(0, () => {
			const {port} = server.address() as net.AddressInfo;
			server.close((err) => err ? reject(err) : resolve(port))
		});
	})
}
