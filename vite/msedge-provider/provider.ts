import {WebdriverIOProvider, WebdriverIOProviderOptions} from "../webdriverio-provider.js";
import {BrowserProviderOption, TestProject} from "vitest/node";
import {Capabilities} from "@wdio/types";
import {defineBrowserProvider} from "@vitest/browser";
import {downloadMSEdge, DownloadOptions} from "./downloader.js";
import * as path from "node:path";
import * as os from "node:os";

type Capabilities = WebdriverIOProviderOptions['capabilities'];
// Make browserVersion required
type MSEdgeCapabilities = Capabilities & Required<Pick<Capabilities, 'browserVersion'>>;
type Options = WebdriverIOProviderOptions & {
	capabilities: MSEdgeCapabilities
} & Omit<DownloadOptions, 'version'>


export function msEdgeProvider(options: Options): BrowserProviderOption {
	return defineBrowserProvider({
		name: 'webdriverio-selenium',
		supportedBrowser: ['edge'],
		options,
		providerFactory(project) {
			return new MSEdgeWebdriverIOProvider(project, options);
		},
	});
}

export class MSEdgeWebdriverIOProvider extends WebdriverIOProvider<Options> {
	constructor(
		project: TestProject,
		options: Options,
	) {
		super(project, options)
		// Kick-off download to save time
		this.download();
	}

	async openPage(sessionId: string, url: string): Promise<void> {
		const download = await this.download();

		// WebdriverIO defaults to writing all msedgedriver downloads to the same directory,
		// overwriting each other if there are multiple versions used in the same test run.
		this._options.cacheDir ??= path.join(os.tmpdir(), `vitest-edge-driver-${this._options.capabilities.browserVersion}`);

		this._options.capabilities['ms:edgeOptions'] ??= {}
		this._options.capabilities['ms:edgeOptions'].binary = download.path;
		this._options.capabilities['wdio:edgedriverOptions'] ??= {}
		this._options.capabilities['wdio:edgedriverOptions']['edgeDriverVersion'] = this._options.capabilities.browserVersion;
		// this._options.capabilities['wdio:edgedriverOptions']['edgeDriverVersion'] = download.version;
		return super.openPage(sessionId, url);
	}

	protected download() {
		return downloadMSEdge({
			...this._options,
			version: this._options.capabilities.browserVersion,
		});
	}
}
