import {describe, expect, test} from 'vitest';

import {guessAddressSpace, isLessPublic} from "src/address-space";

// Mirroring IP address test cases from firefox source
describe('guessAddressSpace', () => {
	describe('loopback', () => {
		test.each([
			'127.0.0.1',
			'0:0:0:0:0:0:0:1', '::1', '[::1]',
			'::ffff:127.0.0.1', // IPv4-mapped IPv6 address
			'2002:7f00:0001::', // 6to4
			'localhost', 'myapp.localhost',
			'localhost.example.com',
		])('%s', (address) => {
			expect(guessAddressSpace(address)).toBe('loopback');
		})
	})
	describe('local', () => {
		test.each([
			'10.0.0.1',
			'100.64.0.1', '100.127.255.254', '172.16.0.1', '172.31.255.255',
			'192.168.1.1',
			'169.254.0.1', '169.254.255.254',
			'fe80::1', 'fe80::1ff:fe23:4567:890a',
			'fc00::', 'fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',  // Unique local
			'2002:c0a8:0001::', // 6to4
			'::ffff:10.0.0.1', // IPv4-mapped IPv6
			'host.local', 'host.internal',
		])('%s', (address) => {
			expect(guessAddressSpace(address)).toBe('local');
		})
	})
	describe('public', () => {
		test.each([
			'8.8.8.8', '1.1.1.1',
			'2001:4860:4860::8888', '2606:4700:4700::1111', '2001:db8::ff00:42:8329',
			'::ffff:1.1.1.1', // IPv4-mapped IPv6
			'2002:0404:0404::', // 6to4
		])('%s', (address) => {
			expect(guessAddressSpace(address)).toBe('public');
		})
	})
	describe('public', () => {
		test.each([
			'www.google.com',
			'www.your-local-restaurant.com',
		])('%s', (address) => {
			expect(guessAddressSpace(address)).toBe(undefined);
		})
	})
})

describe('isLessPublic', () => {
	test.each([
		['loopback', 'loopback', false],
		['loopback', 'local', true],
		['loopback', 'public', true],
		['loopback', undefined, true],

		['local', 'loopback', false],
		['local', 'local', false],
		['local', 'public', true],
		['local', undefined, undefined],

		['public', 'loopback', false],
		['public', 'local', false],
		['public', 'public', false],
		['public', undefined, false],

		[undefined, 'loopback', false],
		[undefined, 'local', undefined],
		[undefined, 'public', undefined],
		[undefined, undefined, undefined],
	])('"%s" less public than "%s": %s', (lhs, rhs, expected) => {
		expect(isLessPublic(lhs, rhs)).toBe(expected);
	})
})
