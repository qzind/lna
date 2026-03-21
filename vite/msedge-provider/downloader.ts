import * as path from "node:path";
import * as os from "node:os";
import * as fsP from "node:fs/promises";
import * as fs from "node:fs";
import * as child_process from "node:child_process";
import {Readable} from "node:stream";
import * as util from "node:util";
import * as apt from "apt-parser";
import {compareVersions, satisfies} from "compare-versions";
import {createDebugger} from "vitest/node";

const debug = createDebugger('vitest:browser:edge:downloader');
const DefaultRepoUrl = 'https://packages.microsoft.com/repos/edge/';
const DefaultBinPath = 'opt/microsoft/msedge/microsoft-edge';

const promises: Record<string, Promise<DownloadResult>> = {};
export type DownloadOptions = {
	version: string;
	channel?: 'stable' | 'beta' | 'dev' | 'canary';
	pkgVer?: string;
	binPath?: string; // Specify where to find binary in .deb package data
	destDir?: string; // Where to extract .deb to
	repoUrl?: string
	arch?: string;
}

export type DownloadResult = {
	path: string;
}

class MsEdgeDownloader {
	constructor(protected options: DownloadOptions) {
	}

	protected get repoUrl(): string {
		return this.options.repoUrl ?? DefaultRepoUrl;
	}

	protected get arch(): string {
		return this.options.arch ?? 'amd64';
	}

	protected get binPath(): string {
		return path.join(this.destDir, this.options.binPath ?? DefaultBinPath);
	}

	protected get channel() {
		return this.options.channel ?? 'stable';
	}

	protected get version() {
		return this.options.version;
	}

	protected get pkgVer() {
		return this.options.pkgVer ?? '1';
	}

	protected get downloadDir() {
		return path.join(os.tmpdir(), `msedge-${this.downloadKey}-download`);
	}

	protected get destDir() {
		return path.join(os.tmpdir(), `msedge-${this.downloadKey}`)
	}

	protected get pkgName() {
		return `microsoft-edge-${this.channel}`;
	}

	public get downloadKey() {
		return `${this.channel}-${this.version}-${this.pkgVer}`;
	}

	protected async findPackage(): Promise<apt.Package> {
		debug?.(`Searching for Microsoft Edge release satisfying ${this.version} on ${this.channel} channel, arch ${this.arch}`);

		const url = new URL(`dists/stable/main/binary-${this.arch}/Packages`, this.repoUrl);
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
		}
		if (!response.body) {
			throw new Error(`Failed to fetch ${url}: Empty body`);
		}
		let packages = new apt.Packages(await response.text());
		packages = packages.filter(p => p.package === this.pkgName);
		let allVersions = packages.map(p => p.version);
		if (!allVersions.some(v => v)) {
			throw new Error(`Failed to parse package versions from ${url}`);
		}
		if (allVersions.some(v => !v)) {
			console.warn(`Warning: Some packages from ${url} are missing version information, skipping them`);
		}
		allVersions = allVersions.filter(v => v);

		const versions = allVersions.filter(v => satisfies(v, `^${this.version}`));
		while (versions.length > 1) {
			const cmp = compareVersions(versions[0]!, versions[1]!);
			if (cmp === 0) {
				console.warn(`Warning: Multiple versions of Microsoft Edge satisfy ${this.version}, using the first one`);
				versions.splice(1, 1);
			} else if (cmp > 0) {
				versions.splice(1, 1);
			} else {
				versions.splice(0, 1);
			}
		}

		const v = versions[0] ?? undefined;
		if (!v) {
			throw new Error(`Failed to find Microsoft Edge version satisfying ${this.version}. Available versions: ${allVersions.join(', ')}`)
		}
		const pkg = packages.find(p => p.version === v)!;
		if (!pkg.filename) {
			throw new Error(`Microsoft Edge package ${v} has no Filename field`);
		}
		debug?.(`Matched version ${v}`);
		return pkg;
	}

	async download(): Promise<DownloadResult> {
		if (fs.existsSync(this.binPath)) {
			return {
				path: this.binPath,
			};
		}

		await fsP.mkdir(this.downloadDir, {recursive: true});
		const pkg = await this.findPackage();
		const debPath = path.join(this.downloadDir, `${this.pkgName}-${this.version}.deb`);
		await this.downloadPackage(pkg, debPath);

		// Extract xz tar
		await this.extractDeb(debPath, this.destDir);

		if (!fs.existsSync(this.binPath)) {
			throw new Error(`Failed to find ${this.binPath} after extracting ${debPath}`);
		}
		debug?.(`Removing temporary download directory ${this.downloadDir}`);
		await fsP.rm(this.downloadDir, {recursive: true});
		return {
			path: this.binPath,
		};
	}

	protected async downloadPackage(pkg: apt.Package, dest: string): Promise<void> {
		debug?.(`Downloading ${pkg.package} version ${pkg.version}`);
		const url = new URL(pkg.filename, this.repoUrl);

		const stat = await fsP.stat(dest, {throwIfNoEntry: false});
		if (stat) {
			debug?.(`${pkg.package} download already exists at ${dest}: ${stat}`);
			if (!stat.isFile()) {
				throw new Error(`Download destination already exists: ${dest}`);
			}

			if (stat.size > pkg.size) {
				throw new Error(`Download destination already exists: ${dest}`);
			} else if (stat.size === pkg.size) {
				return;
			} else {
				await fsP.unlink(dest);
			}
		}

		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
		}
		if (!response.body) {
			throw new Error(`Failed to download ${url}: no response body`)
		}
		await fsP.writeFile(dest, Readable.fromWeb(response.body));
	}

	protected async extractDeb(debPath: string, destDir: string) {
		debug?.(`Extracting ${debPath} to ${destDir}`);
		await fsP.mkdir(destDir, {recursive: true});
		const downloadDir = path.dirname(debPath)
		await util.promisify(child_process.exec)(`ar x '${debPath}' --output '${downloadDir}'`);
		const dataTar = path.join(downloadDir, 'data.tar.xz')
		await util.promisify(child_process.exec)(`tar xf '${dataTar}' -C '${destDir}'`);
	}
}

export function downloadMSEdge(options: DownloadOptions): Promise<DownloadResult> {
	const downloader = new MsEdgeDownloader(options);
	const key = downloader.downloadKey;
	if (!promises[key]) {
		promises[key] = downloader.download();
	}
	return promises[key];
}
