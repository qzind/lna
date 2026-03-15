import {AddressSpace, guessAddressSpace, isLessPublic} from "./address-space.js";

const LnaJointPermission = 'local-network-access';
const LnaLoopbackPermission = 'loopback-network';
const LnaLocalPermission = 'local-network';

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

export const SupportedPermissions = Object.fromEntries(
	await Promise.all(LnaPermissionNames.map(async name => [name, await permissionSupported(name)]))
);
export const SplitPermissionsSupported = SupportedPermissions[LnaLoopbackPermission] && SupportedPermissions[LnaLocalPermission];
export const JointPermissionSupported = SupportedPermissions[LnaJointPermission];
export const LnaPermissionsSupported = SplitPermissionsSupported || JointPermissionSupported;

export function getRequiredPermissionForAddressSpaces(targetSpace: AddressSpace, originSpace: AddressSpace) {
	const lessPublic = isLessPublic(targetSpace, originSpace);

	if (lessPublic === false || !LnaPermissionsSupported) return null;
	if (lessPublic === undefined) return undefined;

	if (!SplitPermissionsSupported) return LnaJointPermission;
	if (targetSpace === "loopback") return LnaLoopbackPermission;
	if (targetSpace === "local") return LnaLocalPermission;
	return undefined;
}

export function getRequiredPermission(hostname: string) {
	return getRequiredPermissionForAddressSpaces(
		guessAddressSpace(hostname),
		guessAddressSpace(window.location.hostname)
	)
}

export async function getLnaPermission(name: LnaPermissionName) {
	if (!SupportedPermissions[name]) {
		return null;
	}
	return await navigator.permissions.query({name} as unknown as { name: PermissionName });
}

export async function getLnaPermissionState(name: LnaPermissionName) {
	if (!SupportedPermissions[name]) {
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
