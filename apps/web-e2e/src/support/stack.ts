import { createHmac } from 'node:crypto';

/**
 * Function stackTotp
 *
 * @description
 * Computes the ephemeral administrator's RFC 6238 code. The runner supplies enrollment in memory;
 * no private database or development key file is accessed.
 *
 * @returns {string} Six-digit SHA1 code for the current thirty-second period.
 */
export function stackTotp(): string {
  const secret: string | undefined = process.env['STACK_TOTP_SECRET'];
  if (!secret || !/^[A-Z2-7]+$/.test(secret)) throw new Error('Missing stack TOTP enrollment.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' as const;
  const bits: string = [...secret]
    .map((character: string): string => alphabet.indexOf(character).toString(2).padStart(5, '0'))
    .join('');
  const key: Buffer<ArrayBuffer> = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((byte: string): number => Number.parseInt(byte, 2)),
  );
  const counter: Buffer<ArrayBuffer> = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest: Buffer<ArrayBuffer> = createHmac('sha1', key).update(counter).digest();
  const offset: number = (digest[digest.length - 1] ?? 0) & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}
