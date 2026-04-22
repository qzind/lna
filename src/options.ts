import {AddressSpace} from "./address-space.js";

export type AddressSpaceOverrides = {
	targetAddressSpace?: AddressSpace,
	originAddressSpace?: AddressSpace,
}

export type LnaOptions = {
	overrides?: AddressSpaceOverrides,
	// Address space to assume for domains
	defaultAddressSpace?: AddressSpace,
	isWebSocket?: boolean,
	isConnectionError?: (err: unknown) => boolean,
}

export const defaultOptions: LnaOptions = {
	defaultAddressSpace: 'public',
};

export function getOptions(options?: LnaOptions) {
	return {...defaultOptions, ...options};
}
