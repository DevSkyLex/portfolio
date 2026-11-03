import { createLocalJWKSet, jwtVerify } from 'jose';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  RandomIdGenerator,
  RfcTotpVerifier,
  ScryptPasswordHasher,
  Sha256RefreshTokenCodec,
  SystemClock,
  base32Decode,
  base32Encode,
  totpAt,
} from '@internal/identity-adapters-out/lib/crypto/crypto.adapters';
import {
  ACCESS_TTL_SECONDS,
  JoseTokenSigner,
  generateSigningKey,
  loadSigningKeys,
  type SigningKeys,
} from '@internal/identity-adapters-out/lib/jwt/signing-keys/signing-keys';

describe('TOTP (RFC 6238)', (): void => {
  // RFC 6238 test vector (SHA-1): ASCII secret "12345678901234567890", T = 59 s.
  /**
   * Variable secret
   *
   * @description
   * Base32 form of the RFC 6238 reference secret used by the published SHA-1 test vector.
   *
   * @type {string}
   */
  const secret: string = base32Encode(Buffer.from('12345678901234567890'));

  it('reproduces the RFC vector', (): void => {
    expect(totpAt(secret, 1)).toBe('287082');
  });

  it('accepts a one-step drift and returns the step used', (): void => {
    const verifier: RfcTotpVerifier = new RfcTotpVerifier();
    expect(verifier.verify(secret, '287082', new Date(59_000))).toBe(1);
    expect(verifier.verify(secret, '287082', new Date(89_000))).toBe(1);
    expect(verifier.verify(secret, '287082', new Date(150_000))).toBeNull();
    expect(verifier.verify(secret, 'abcdef', new Date(59_000))).toBeNull();
  });

  it('produces a URI to scan', (): void => {
    const verifier: RfcTotpVerifier = new RfcTotpVerifier();
    expect(verifier.provisioningUri('ABC', 'moi@exemple.fr')).toBe(
      'otpauth://totp/Portfolio%3Amoi%40exemple.fr?secret=ABC&issuer=Portfolio&algorithm=SHA1&digits=6&period=30',
    );
  });
});

describe('ScryptPasswordHasher', (): void => {
  it('verifies the right password and rejects the others', async (): Promise<void> => {
    const hasher: ScryptPasswordHasher = new ScryptPasswordHasher();
    const hash: string = await hasher.hash('a-strong-password');
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    await expect(hasher.verify('a-strong-password', hash)).resolves.toBe(true);
    await expect(hasher.verify('other', hash)).resolves.toBe(false);
    await expect(hasher.verify('x', 'corrupted')).resolves.toBe(false);
    await expect(hasher.verify('x', 'scrypt$0$8$1$c2FsdA$a2V5')).resolves.toBe(false);
    await expect(hasher.verify('x', 'scrypt$abc$8$1$c2FsdA$a2V5')).resolves.toBe(false);
  });
});

describe('base32', (): void => {
  it('round-trips and rejects a character outside the alphabet', (): void => {
    const bytes: Buffer<ArrayBuffer> = Buffer.from('portfolio');
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(base32Decode(`${base32Encode(bytes).toLowerCase()}==`)).toEqual(bytes);
    expect((): Buffer<ArrayBufferLike> => base32Decode('ABC1')).toThrow(/base32/);
  });
});

describe('system adapters', (): void => {
  it('generates opaque refresh tokens and stores only a SHA-256 hash', (): void => {
    const codec: Sha256RefreshTokenCodec = new Sha256RefreshTokenCodec();
    const token: string = codec.generate();
    expect(token).toMatch(/^[\w-]{43}$/);
    expect(codec.generate()).not.toBe(token);
    expect(codec.hash(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(codec.hash(token)).toBe(codec.hash(token));
  });

  it('reads the time and draws unique identifiers', (): void => {
    expect(Math.abs(new SystemClock().now().getTime() - Date.now())).toBeLessThan(1_000);
    const ids: RandomIdGenerator = new RandomIdGenerator();
    expect(ids.next()).not.toBe(ids.next());
  });
});

describe('JoseTokenSigner', (): void => {
  /**
   * Variable folder
   *
   * @description
   * Temporary directory holding generated signing keys for the signer integration tests.
   *
   * @type {string}
   */
  let folder: string;
  beforeAll((): void => {
    folder = mkdtempSync(join(tmpdir(), 'keys-'));
  });
  afterAll((): void => rmSync(folder, { recursive: true, force: true }));

  it('signs an EdDSA JWT verifiable with the published JWKS', async (): Promise<void> => {
    await generateSigningKey(folder, 'k1');
    await generateSigningKey(folder, 'k2');
    const keys: SigningKeys = await loadSigningKeys(folder, 'k2');
    expect(keys.jwks.keys.map((k): string => k.kid).sort()).toEqual(['k1', 'k2']);
    expect(JSON.stringify(keys.jwks)).not.toContain('"d"');

    const signer: JoseTokenSigner = new JoseTokenSigner(
      keys,
      'https://exemple.fr/api/auth',
      'portfolio-admin',
    );
    const now: Date = new Date();
    const { token, expiresIn } = await signer.sign('a1', 'family-1', now);
    const { payload, protectedHeader } = await jwtVerify(token, createLocalJWKSet(keys.jwks), {
      issuer: 'https://exemple.fr/api/auth',
      audience: 'portfolio-admin',
      algorithms: ['EdDSA'],
      typ: 'at+jwt',
    });
    const issuedAt: number = Math.floor(now.getTime() / 1000);
    expect(protectedHeader).toMatchObject({ alg: 'EdDSA', kid: 'k2', typ: 'at+jwt' });
    expect(payload).toMatchObject({
      sub: 'a1',
      role: 'admin',
      sid: 'family-1',
      iat: issuedAt,
      nbf: issuedAt,
      exp: issuedAt + 300,
      jti: expect.any(String),
    });
    expect(expiresIn).toBe(ACCESS_TTL_SECONDS);
    expect(ACCESS_TTL_SECONDS).toBe(300);
  });

  it('refuses to overwrite an existing key or an invalid key ID', async (): Promise<void> => {
    await expect(generateSigningKey(folder, 'k1')).rejects.toThrow();
    await expect(generateSigningKey(folder, '../escape')).rejects.toThrow(/Invalid key ID/);
  });

  it('requires the signing key and Ed25519 keys only', async (): Promise<void> => {
    await expect(loadSigningKeys(folder, 'absent')).rejects.toThrow(/missing/);
    const other: string = mkdtempSync(join(tmpdir(), 'keys-'));
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    writeFileSync(join(other, 'ec.pem'), privateKey.export({ format: 'pem', type: 'pkcs8' }));
    await expect(loadSigningKeys(other, 'ec')).rejects.toThrow(/Ed25519 expected/);
    rmSync(other, { recursive: true, force: true });
  });
});
