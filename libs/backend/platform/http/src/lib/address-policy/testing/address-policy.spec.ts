import { isPublicAddress } from '@internal/backend-http/lib/address-policy/address-policy';

describe('isPublicAddress', (): void => {
  it.each([
    '93.184.215.14',
    '1.1.1.1',
    '172.32.0.1',
    '2606:4700:4700::1111',
    '2a00:1450:4007:80e::200e',
  ])('allows the public address %s', (address: string): void => {
    expect(isPublicAddress(address)).toBe(true);
  });

  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.1.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.5.4',
    '172.31.255.255',
    '192.0.0.8',
    '192.0.2.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.51.100.7',
    '203.0.113.9',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '64:ff9b::a00:1',
    '2001:db8::1',
    '2001::1',
    '2002:a00:1::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    'localhost',
    'content-service',
    '',
  ])('refuses %s', (address: string): void => {
    expect(isPublicAddress(address)).toBe(false);
  });
});
