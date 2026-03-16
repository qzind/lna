import {
	AddressSpace,
	DetectedAddressSpace,
	guessAddressSpace,
	isLessPublic
} from "./address-space.js";
import {AddressSpaceOverrides} from "./options.js";
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

export const PermissionSupport = Object.fromEntries(
	await Promise.all(LnaPermissionNames.map(async name => [name, await permissionSupported(name)]))
) as Record<LnaPermissionName, boolean>;
export const SupportedPermissions = Object.entries(PermissionSupport).filter(([, s]) => s).map(([n]) => n) as LnaPermissionName[];
export const SplitPermissionsSupported = PermissionSupport[LnaLoopbackPermission] && PermissionSupport[LnaLocalPermission];
export const JointPermissionSupported = PermissionSupport[LnaJointPermission];
export const LnaPermissionsSupported = SplitPermissionsSupported || JointPermissionSupported;

const permissionsEffective = LnaPermissionsSupported && !getBrowserQuirks().permissionsAreOptIn;

export function getRequiredPermissionForAddressSpace(targetSpace: AddressSpace): LnaPermissionName | null {
	if (! permissionsEffective) return null;
	if (!SplitPermissionsSupported) return LnaJointPermission;
	return {
		'loopback': LnaLoopbackPermission,
		'local': LnaLocalPermission,
		'public': null,
	}[targetSpace] ;
}

export function getRequiredPermissionForAddressSpaces(targetSpace: DetectedAddressSpace, originSpace: DetectedAddressSpace) {
	if (! permissionsEffective) return null;
	const lessPublic = isLessPublic(targetSpace, originSpace);
	const permission = targetSpace !== 'unknown'
		? getRequiredPermissionForAddressSpace(targetSpace)
		: undefined;

	if (lessPublic === false || permission === null) return null;
	if (lessPublic === undefined) return undefined;
	return permission;
}

export function getRequiredPermission(hostname: string, overrides?: AddressSpaceOverrides) {
	return getRequiredPermissionForAddressSpaces(
		overrides?.targetAddressSpace ?? guessAddressSpace(window.location.hostname),
		overrides?.originAddressSpace ?? guessAddressSpace(hostname),
	)
}

export async function getLnaPermission(name: LnaPermissionName) {
	if (!PermissionSupport[name]) {
		return null;
	}
	return await navigator.permissions.query({name} as unknown as { name: PermissionName });
}

export async function getLnaPermissionState(name: LnaPermissionName) {
	if (!PermissionSupport[name]) {
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
