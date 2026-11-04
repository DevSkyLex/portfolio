import { BlockList, isIP } from 'node:net';

/**
 * Constant BLOCKED_IPV4
 *
 * @description
 * IPv4 ranges an outbound client-metadata fetch must never reach (RFC 6890 special-purpose
 * registry): this host, private networks, shared address space, loopback, link-local (cloud metadata
 * services), documentation, benchmarking, 6to4 relay, multicast and reserved.
 *
 * @type {ReadonlyArray<readonly [string, number]>}
 */
const BLOCKED_IPV4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

/**
 * Constant BLOCKED_IPV6
 *
 * @description
 * IPv6 ranges refused likewise: unspecified, loopback and IPv4-compatible, IPv4-mapped, NAT64 (which
 * embed an IPv4 address), discard, IETF protocol assignments (Teredo), documentation, 6to4, unique
 * local, link-local and multicast.
 *
 * @type {ReadonlyArray<readonly [string, number]>}
 */
const BLOCKED_IPV6: ReadonlyArray<readonly [string, number]> = [
  ['::', 96],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
];

/**
 * Function blockList
 *
 * @description
 * Builds a block list for one address family. Each family has its own list: Node matches IPv4
 * addresses against IPv6 rules through their mapped form, so one shared list holding
 * `::ffff:0:0/96` would refuse every IPv4 address.
 *
 * @param {ReadonlyArray<readonly [string, number]>} ranges - Networks and prefix lengths.
 * @param {'ipv4' | 'ipv6'} family - Address family.
 *
 * @returns {BlockList} Block list.
 */
function blockList(
  ranges: ReadonlyArray<readonly [string, number]>,
  family: 'ipv4' | 'ipv6',
): BlockList {
  const list: BlockList = new BlockList();
  for (const [network, prefix] of ranges) list.addSubnet(network, prefix, family);
  return list;
}

/**
 * Constant BLOCKED_V4
 *
 * @description
 * IPv4 block list.
 *
 * @type {BlockList}
 */
const BLOCKED_V4: BlockList = blockList(BLOCKED_IPV4, 'ipv4');

/**
 * Constant BLOCKED_V6
 *
 * @description
 * IPv6 block list.
 *
 * @type {BlockList}
 */
const BLOCKED_V6: BlockList = blockList(BLOCKED_IPV6, 'ipv6');

/**
 * Function isPublicAddress
 *
 * @description
 * Whether an IP address may be contacted by an outbound fetch (D45): a literal IPv4 or IPv6 address
 * outside every special-purpose range above. Anything else, including a host name, is refused.
 *
 * @param {string} address - Resolved or literal address (IPv6 without brackets).
 *
 * @returns {boolean} Whether the address is publicly routable.
 */
export function isPublicAddress(address: string): boolean {
  const family: number = isIP(address);
  if (family === 4) {
    return !BLOCKED_V4.check(address, 'ipv4');
  }
  if (family === 6) {
    return !BLOCKED_V6.check(address, 'ipv6');
  }
  return false;
}
