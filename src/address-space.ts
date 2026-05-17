import {Address4, Address6} from 'ip-address';
import {LnaOptions} from "./options";

export type AddressSpace = "loopback" | "local" | "public";
export type DetectedAddressSpace = AddressSpace | undefined;

export function guessAddressSpace(hostname: string, options?: LnaOptions): DetectedAddressSpace {
	let host = hostname.toLowerCase();

	// Remove IPv6 host brackets
	if (host.match('\[[0-9a-fA-f:]+\]')) {
		host = host.slice(1, -1);
	}
	if (Address6.isValid(host)) return getIp6AddressSpace(new Address6(host));
	if (Address4.isValid(host)) return getIp4AddressSpace(new Address4(host));

	if (host.indexOf('localhost') !== -1) {
		return "loopback";
	}

	if (host.match('\.(local|internal|home|lan|home\.arpa)$')) {
		return "local";
	}

	if (host.match('^(internal|lan)\.')) {
		return "local";
	}

	return options?.defaultAddressSpace ?? undefined;
}

function getIp4AddressSpace(ip: Address4): AddressSpace {
	if (ip.isLoopback()) return "loopback";
	// Class A,B,C networks (10.0.00/8, 172.16.0.0/12, 192.168.0.0/16), DHCP
	// link-local (9169.254.0.0/16), or Carrier-grade NAT (100.64.0.0/10)
	if (ip.isPrivate() || ip.isLinkLocal() || ip.isCGNAT()) return "local";
	return "public";
}

function getIp6AddressSpace(ip: Address6): AddressSpace {
	if (ip.isLoopback()) return "loopback";
	if (ip.isLinkLocal() || ip.isULA()) return "local";
	if (ip.isMapped4()) {
		return getIp4AddressSpace(ip.to4());
	}
	if (ip.is6to4()) {
		return getIp4AddressSpace(new Address4(ip.inspect6to4().gateway));
	}
	return "public";
}

// Assumes that loopback is always detected, i.e. undefined can't include "loopback"
export function isLessPublic(lhs: DetectedAddressSpace, rhs: DetectedAddressSpace): boolean | undefined {
	if ((lhs === "loopback" && rhs !== "loopback") ||
		(lhs === "local" && rhs === "public")) {
		return true;
	}
	if (rhs === "loopback" || lhs === "public" || (lhs && rhs)) {
		return false;
	}
	return undefined;
}
