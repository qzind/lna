import {Address4, Address6} from 'ip-address';

export type AddressSpace = "loopback" | "local" | "public";
export type DetectedAddressSpace = AddressSpace | "unknown";

export function guessAddressSpace(hostname: string): DetectedAddressSpace {
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

	if (host.match('.*\.(local|internal)')) {
		return "local";
	}

	return "public";
}

function getIp4AddressSpace(ip: Address4): AddressSpace {
	// Loopback addresses
	if (ip.isInSubnet(new Address4('127.0.0.0/8'))) return "loopback";
	// Class A networks
	if (ip.isInSubnet(new Address4('10.0.0.0/8'))) return "local";
	// Class B networks
	if (ip.isInSubnet(new Address4('172.16.0.0/12'))) return "local";
	// Class C networks
	if (ip.isInSubnet(new Address4('192.168.0.0/16'))) return "local";
	// DHCP
	if (ip.isInSubnet(new Address4('169.254.0.0/16'))) return "local";
	// Carrier-grade NAT
	if (ip.isInSubnet(new Address4('100.64.0.0/10'))) return "local";
	return "public";
}

function getIp6AddressSpace(ip: Address6): AddressSpace {
	if (ip.isLoopback()) return "loopback";
	if (ip.isLinkLocal()) return "local";
	if (ip.isInSubnet(new Address6('fc00::/7'))) return "local";
	// IPv4-mapped IPv6
	if (ip.isInSubnet(new Address6('::ffff:0:0/96'))) {
		const ipv4 = Address4.fromHex(ip.getBitsBase16(96, 128));
		return getIp4AddressSpace(ipv4);
	}
	if (ip.is6to4()) {
		return getIp4AddressSpace(new Address4(ip.inspect6to4().gateway));
	}
	return "public";
}

// Assumes that loopback is always detected, i.e. "unknown" can't include "loopback"
export function isLessPublic(lhs: DetectedAddressSpace, rhs: DetectedAddressSpace): boolean | undefined {
	if ((lhs === "loopback" && rhs !== "loopback") ||
		(lhs === "local" && rhs === "public")) {
		return true;
	}
	if (rhs === "loopback" || lhs === "public" ||
		(lhs !== "unknown" && rhs !== "unknown")
	) {
		return false;
	}
	return undefined;
}
