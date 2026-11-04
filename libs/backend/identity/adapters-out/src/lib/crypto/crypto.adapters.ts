import type {
  Clock,
  IdGenerator,
  PasswordHasher,
  PkceVerifier,
  RefreshTokenCodec,
  TotpVerifier,
} from '@vfortin/identity-application';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';

/**
 * Constant SCRYPT
 *
 * @description
 * Work factors passed to Node's scrypt implementation; `maxmem` reserves headroom above the 32 MiB working set.
 *
 * @type {{ readonly N: 32768; readonly r: 8; readonly p: 1; readonly maxmem: 67108864 }}
 */
const SCRYPT: { readonly N: 32768; readonly r: 8; readonly p: 1; readonly maxmem: number } = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;

/**
 * Constant KEY_LENGTH
 *
 * @description
 * Derived password-key length, in bytes, for the persisted scrypt encoding.
 *
 * @type {number}
 */
const KEY_LENGTH = 32 as const;

/**
 * Function derive
 *
 * @description
 * Wraps Node's callback-based scrypt operation in a promise and applies the configured memory ceiling.
 *
 * @param {string} password - Plain password to derive from.
 * @param {Buffer} salt - Per-password random salt.
 * @param {{ N: number; r: number; p: number }} params - Scrypt work factors stored with the hash.
 *
 * @returns {Promise<Buffer>} Derived key bytes; rejects when Node's scrypt operation fails.
 */
function derive(
  password: string,
  salt: Buffer,
  params: { N: number; r: number; p: number },
): Promise<Buffer<ArrayBufferLike>> {
  return new Promise<Buffer>(
    (
      resolve: (value: Buffer<ArrayBufferLike> | PromiseLike<Buffer<ArrayBufferLike>>) => void,
      reject,
    ): void =>
      scrypt(
        password,
        salt,
        KEY_LENGTH,
        { ...params, maxmem: SCRYPT.maxmem },
        (error: Error | null, key: NonSharedBuffer): void => (error ? reject(error) : resolve(key)),
      ),
  );
}

/**
 * Class ScryptPasswordHasher
 * @class ScryptPasswordHasher
 *
 * @description
 * Hashes passwords with scrypt and stores algorithm parameters, salt and derived key in a base64url-delimited encoding.
 */
export class ScryptPasswordHasher implements PasswordHasher {
  // #region Methods
  /**
   * Method hash
   * @method hash
   *
   * @description
   * Generates a fresh 16-byte salt and derives a 32-byte scrypt key before encoding the parameters and values.
   *
   * @param {string} password - Plain password to hash.
   *
   * @returns {Promise<string>} Encoded scrypt verifier; rejects when key derivation fails.
   */
  public async hash(password: string): Promise<string> {
    const salt: NonSharedBuffer = randomBytes(16);
    const key: Buffer<ArrayBufferLike> = await derive(password, salt, SCRYPT);
    return [
      'scrypt',
      SCRYPT.N,
      SCRYPT.r,
      SCRYPT.p,
      salt.toString('base64url'),
      key.toString('base64url'),
    ].join('$');
  }

  /**
   * Method verify
   * @method verify
   *
   * @description
   * Parses the stored scrypt parameters, rejects malformed encodings, derives the candidate key and compares equal-length keys with a timing-safe comparison.
   *
   * @param {string} password - Candidate plain password.
   * @param {string} hash - Encoded scrypt verifier.
   *
   * @returns {Promise<boolean>} Whether the candidate matches; rejects if key derivation fails.
   */
  public async verify(password: string, hash: string): Promise<boolean> {
    const [scheme, n, r, p, salt, key] = hash.split('$');
    const params: { N: number; r: number; p: number } = {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    };
    const valid: boolean = Object.values(params).every(
      (value: number): boolean => Number.isSafeInteger(value) && value > 0,
    );
    if (scheme !== 'scrypt' || !salt || !key || !valid) {
      return false;
    }
    const expected: Buffer<ArrayBuffer> = Buffer.from(key, 'base64url');
    const actual: Buffer<ArrayBufferLike> = await derive(
      password,
      Buffer.from(salt, 'base64url'),
      params,
    );
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  // #endregion
}

/**
 * Constant BASE32
 *
 * @description
 * RFC 4648 base32 alphabet used for authenticator secrets without padding.
 *
 * @type {string}
 */
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' as const;

/**
 * Function base32Encode
 *
 * @description
 * Encodes bytes using the uppercase RFC 4648 base32 alphabet and omits padding.
 *
 * @param {Buffer} buffer - Bytes to encode.
 *
 * @returns {string} Unpadded base32 value.
 */
export function base32Encode(buffer: Buffer): string {
  let bits: number = 0;
  let value: number = 0;
  let output: string = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Function base32Decode
 *
 * @description
 * Decodes case-insensitive base32 input after removing trailing padding. Invalid alphabet characters reject synchronously with an error.
 *
 * @param {string} input - Padded or unpadded base32 value.
 *
 * @returns {Buffer} Decoded bytes.
 *
 * @throws {Error} When the input contains a character outside the base32 alphabet.
 */
export function base32Decode(input: string): Buffer {
  const clean: string = input.replace(/=+$/, '').toUpperCase();
  let bits: number = 0;
  let value: number = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index: number = BASE32.indexOf(char);
    if (index < 0) {
      throw new Error('Invalid TOTP secret (base32 expected).');
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Constant STEP_SECONDS
 *
 * @description
 * RFC 6238 time-counter interval used for one-time-password generation, in seconds.
 *
 * @type {number}
 */
const STEP_SECONDS = 30 as const;

/**
 * Constant DIGITS
 *
 * @description
 * Number of decimal digits emitted for a generated TOTP code.
 *
 * @type {number}
 */
const DIGITS = 6 as const;

/**
 * Function totpAt
 *
 * @description
 * Computes the six-digit RFC 6238 code for the supplied counter using HMAC-SHA1 and dynamic truncation. Throws when the secret is malformed or the counter cannot be encoded as an unsigned 64-bit integer.
 *
 * @param {string} secret - Base32-encoded TOTP secret.
 * @param {number} step - Time counter to encode.
 *
 * @returns {string} Zero-padded six-digit TOTP code.
 *
 * @throws {Error} When the secret is malformed or the counter cannot be encoded as an unsigned 64-bit integer.
 */
export function totpAt(secret: string, step: number): string {
  const counter: Buffer<ArrayBuffer> = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest: NonSharedBuffer = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset: number = (digest[digest.length - 1] ?? 0) & 0xf;
  const binary: number = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Class RfcTotpVerifier
 * @class RfcTotpVerifier
 *
 * @description
 * Generates RFC 6238 authenticator secrets and verifies six-digit codes in a three-step drift window.
 */
export class RfcTotpVerifier implements TotpVerifier {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the issuer label embedded in authenticator provisioning URIs.
   *
   * @param {string} issuer - Issuer displayed by the authenticator; defaults to `Portfolio`.
   */
  public constructor(private readonly issuer: string = 'Portfolio') {}
  // #endregion

  // #region Methods
  /**
   * Method generateSecret
   * @method generateSecret
   *
   * @description
   * Generates 160 random bits and encodes them as an unpadded base32 authenticator secret.
   *
   * @returns {string} New base32 secret.
   */
  public generateSecret(): string {
    return base32Encode(randomBytes(20));
  }

  /**
   * Method provisioningUri
   * @method provisioningUri
   *
   * @description
   * Builds an `otpauth://` URI carrying the configured issuer, account label and RFC 6238 parameters.
   *
   * @param {string} secret - Base32 secret to enroll.
   * @param {string} account - Account label shown in the authenticator.
   *
   * @returns {string} Encoded provisioning URI.
   */
  public provisioningUri(secret: string, account: string): string {
    const label: string = encodeURIComponent(`${this.issuer}:${account}`);
    const params: URLSearchParams = new URLSearchParams({
      secret,
      issuer: this.issuer,
      algorithm: 'SHA1',
      digits: String(DIGITS),
      period: String(STEP_SECONDS),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  /**
   * Method verify
   * @method verify
   *
   * @description
   * Accepts only six decimal digits, then checks the previous, current and next 30-second counter to tolerate limited clock drift.
   *
   * @param {string} secret - Account's base32 TOTP secret.
   * @param {string} code - Candidate six-digit code.
   * @param {Date} now - Time used to derive the current counter.
   *
   * @returns {number | null} Matching counter for replay tracking, or `null` when invalid.
   */
  public verify(secret: string, code: string, now: Date): number | null {
    if (!/^\d{6}$/.test(code)) {
      return null;
    }
    const current: number = Math.floor(now.getTime() / 1000 / STEP_SECONDS);

    // Tolerates a one-step drift (phone clock slightly off).
    for (const step of [current - 1, current, current + 1]) {
      const expected: Buffer<ArrayBuffer> = Buffer.from(totpAt(secret, step));
      if (timingSafeEqual(expected, Buffer.from(code))) {
        return step;
      }
    }
    return null;
  }
  // #endregion
}

/**
 * Class Sha256RefreshTokenCodec
 * @class Sha256RefreshTokenCodec
 *
 * @description
 * Generates 256-bit opaque refresh tokens and derives SHA-256 lookup hashes for persistence.
 */
export class Sha256RefreshTokenCodec implements RefreshTokenCodec {
  // #region Methods
  /**
   * Method generate
   * @method generate
   *
   * @description
   * Generates a 32-byte cryptographically random bearer token encoded as base64url.
   *
   * @returns {string} Opaque refresh credential.
   */
  public generate(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Method hash
   * @method hash
   *
   * @description
   * Computes a deterministic SHA-256 hex digest for repository lookup.
   *
   * @param {string} token - Opaque bearer credential.
   *
   * @returns {string} SHA-256 digest in hexadecimal form.
   */
  public hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  // #endregion
}

/**
 * Class SystemClock
 * @class SystemClock
 *
 * @description
 * Supplies wall-clock time from the system for identity use cases.
 */
export class SystemClock implements Clock {
  // #region Methods
  /**
   * Method now
   * @method now
   *
   * @description
   * Reads the current system date and time.
   *
   * @returns {Date} Current system instant.
   */
  public now(): Date {
    return new Date();
  }
  // #endregion
}

/**
 * Class RandomIdGenerator
 * @class RandomIdGenerator
 *
 * @description
 * Generates identifiers using Node's cryptographically random UUID implementation.
 */
export class RandomIdGenerator implements IdGenerator {
  // #region Methods
  /**
   * Method next
   * @method next
   *
   * @description
   * Returns a new random UUID for an identity record or session family.
   *
   * @returns {string} Generated UUID.
   */
  public next(): string {
    return randomUUID();
  }
  // #endregion
}

/**
 * Class S256PkceVerifier
 * @class S256PkceVerifier
 * @implements PkceVerifier
 *
 * @description
 * Checks a PKCE verifier against an `S256` challenge (RFC 7636 §4.6): `BASE64URL(SHA256(verifier))`,
 * compared in constant time.
 */
export class S256PkceVerifier implements PkceVerifier {
  // #region Methods
  /**
   * Method matches
   * @method matches
   *
   * @description
   * Hashes the verifier and compares it with the challenge.
   *
   * @param {string} verifier - Presented `code_verifier`.
   * @param {string} challenge - Stored `code_challenge`.
   *
   * @returns {boolean} Whether they match.
   */
  public matches(verifier: string, challenge: string): boolean {
    const expected: Buffer = Buffer.from(
      createHash('sha256').update(verifier, 'ascii').digest('base64url'),
    );
    const presented: Buffer = Buffer.from(challenge);
    return expected.length === presented.length && timingSafeEqual(expected, presented);
  }
  // #endregion
}
