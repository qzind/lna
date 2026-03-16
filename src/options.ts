import {KnownAddressSpace} from "./address-space.js";

export type AddressSpaceOverrides = {
	targetAddressSpace?: KnownAddressSpace,
	originAddressSpace?: KnownAddressSpace,
}

export type LnaOptions = {
	overrides?: AddressSpaceOverrides,
}
