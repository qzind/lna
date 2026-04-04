const BrowserUANames = {
	edge: 'Edg',
	chrome: 'Chrome',
	firefox: 'Firefox',
	safari: 'Safari',
} as const;
type Browser = keyof typeof BrowserUANames;

function is(browser: Browser): boolean;
function is(browser: Browser, cmp: '<' | '<=' | '=' | '>=' | '>', version: number):boolean;
function is(browser: Browser, cmp?: '<' | '<=' | '=' | '>=' | '>', version?: number) {
	const detectedBrowser = getBrowser();
	if (detectedBrowser !== browser) return false;
	const detectedVersion = getUAMajorVersion(BrowserUANames[browser]);
	if (! version) return !!detectedVersion;
	if (!detectedVersion) return false;
	switch (cmp) {
		case '<': return detectedVersion < version;
		case '<=': return detectedVersion <= version;
		case '=': return detectedVersion === version;
		case '>=': return detectedVersion >= version;
		case '>': return detectedVersion > version;
	}
}

function getBrowser(): Browser | undefined {
	if (getUAMajorVersion(BrowserUANames.edge)) return 'edge';
	if (getUAMajorVersion(BrowserUANames.chrome)) return 'chrome';
	if (getUAMajorVersion(BrowserUANames.firefox)) return 'firefox';
	if (getUAMajorVersion(BrowserUANames.safari)) return 'safari';
	return undefined;
}

function getUAMajorVersion(name: string) {
	const ua = window.navigator.userAgent;
	const match = ua.match(new RegExp(`${name}/([\\d.]+)`));
	return match ? parseInt(match[1]) : null;
}

export default is;
