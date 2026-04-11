import {AddressSpace} from "./address-space.js";

export type AddressSpaceOverrides = {
	targetAddressSpace?: AddressSpace,
	originAddressSpace?: AddressSpace,
}

export type LnaOptions = {
	overrides?: AddressSpaceOverrides,
	isWebSocket?: boolean,
	isConnectionError?: (err: unknown) => boolean,
}

export const defaultOptions: LnaOptions = {};
