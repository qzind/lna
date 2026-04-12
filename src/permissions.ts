import {
	AddressSpace,
	DetectedAddressSpace,
	guessAddressSpace,
	isLessPublic
} from "./address-space.js";
import {LnaOptions} from "./options.js";
import {getBrowserQuirks} from "./quirks.js";

const LnaJointPermission = 'local-network-access' as const;
const LnaLoopbackPermission = 'loopback-network' as const;
const LnaLocalPermission = 'local-network' as const;

export type LnaPermissionName =
	typeof LnaJointPermission
	| typeof LnaLoopbackPermission
	| typeof LnaLocalPermission;

async function permissionSupported(name: PermissionName | LnaPermissionName): Promise<boolean> {
	if (!navigator?.permissions?.query) return false;
	try {
		await navigator.permissions.query({name} as { name: PermissionName });
		return true;
	} catch (err) {
		if (err instanceof TypeError) {
			return false;
		} else {
			throw err;
		}
	}
}

const LnaPermissionNames: LnaPermissionName[] = [
	LnaLoopbackPermission, LnaLocalPermission, LnaJointPermission,
];

type PermissionSupportMap = Record<LnaPermissionName, boolean>;

type BrowserSupport = {
	PermissionNames: LnaPermissionName[],
	LnaJointPermission: boolean,
	LnaSplitPermissions: boolean,
	LnaPermissionsEffective: boolean,
};

export async function getBrowserSupport(): Promise<BrowserSupport> {
	const PermissionSupport = Object.fromEntries(
		await Promise.all(LnaPermissionNames.map(async name => [name, await permissionSupported(name)]))
	) as PermissionSupportMap;
	const SupportedPermissions = Object.entries(PermissionSupport)
		.filter(([, s]) => s)
		.map(([n]) => n) as LnaPermissionName[];
	const anySupported = !! SupportedPermissions.length;

	return {
		PermissionNames: SupportedPermissions,
		LnaPermissions: anySupported,
		LnaJointPermission: PermissionSupport[LnaJointPermission],
		LnaSplitPermissions: PermissionSupport[LnaLoopbackPermission] && PermissionSupport[LnaLocalPermission],
		LnaPermissionsEffective: anySupported && ! getBrowserQuirks().permissionsAreOptIn,
	}
}

export async function getRequiredPermissionForAddressSpace(targetSpace: AddressSpace): Promise<LnaPermissionName | null> {
	const support = await getBrowserSupport();
	if (! support.LnaPermissionsEffective) return null;
	if (! support.LnaSplitPermissions) return LnaJointPermission;
	return {
		'loopback': LnaLoopbackPermission,
		'local': LnaLocalPermission,
		'public': null,
	}[targetSpace] ;
}

export async function getRequiredPermissionForAddressSpaces(targetSpace: DetectedAddressSpace, originSpace: DetectedAddressSpace) {
	const support = await getBrowserSupport();
	if (! support.LnaPermissionsEffective) return null;
	const lessPublic = isLessPublic(targetSpace, originSpace);
	const permission = targetSpace
		? await getRequiredPermissionForAddressSpace(targetSpace)
		: undefined;

	if (lessPublic === false || permission === null) return null;
	if (lessPublic === undefined) return undefined;
	return permission;
}

export async function getRequiredPermissionName(url: URL, options?: LnaOptions) {
	if ((options?.isWebSocket || url.protocol === 'ws:' || url.protocol === 'wss:') && getBrowserQuirks().webSocketsUnrestricted) {
		return null;
	}
	return await getRequiredPermissionForAddressSpaces(
		options?.overrides?.targetAddressSpace ?? guessAddressSpace(url.hostname, options),
		options?.overrides?.originAddressSpace ?? guessAddressSpace(window.location.hostname, options),
	)
}

export async function getRequiredPermission(url: URL, options?: LnaOptions) {
	const name = await getRequiredPermissionName(url, options);
	return name ? await getLnaPermission(name) : name;
}

export async function getLnaPermission(name: LnaPermissionName) {
	const support = await getBrowserSupport();
	if (! support.PermissionNames.includes(name)) {
		return null;
	}
	return await navigator.permissions.query({name} as unknown as { name: PermissionName });
}

export async function getLnaPermissionState(name: LnaPermissionName) {
	const support = await getBrowserSupport();
	if (! support.PermissionNames.includes(name)) {
		return null;
	}
	return (await getLnaPermission(name))!.state;
}

export type LnaPermissionStates = Record<LnaPermissionName, PermissionState | null>;

export async function getLnaPermissionStates(): Promise<LnaPermissionStates> {
	return Object.fromEntries(await Promise.all(
		LnaPermissionNames.map(async name => [name, await getLnaPermissionState(name)]))
	);
}
