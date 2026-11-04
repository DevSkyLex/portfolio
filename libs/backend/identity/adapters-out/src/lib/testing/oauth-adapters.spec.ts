import { type JWTPayload, type JWTVerifyResult, createLocalJWKSet, jwtVerify } from 'jose';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S256PkceVerifier } from '@internal/identity-adapters-out/lib/crypto/crypto.adapters';
import {
  JoseResourceTokenSigner,
  RESOURCE_ACCESS_TTL_SECONDS,
  type SigningKeys,
  generateSigningKey,
  loadSigningKeys,
} from '@internal/identity-adapters-out/lib/jwt/signing-keys/signing-keys';

describe('S256PkceVerifier', (): void => {
  it('matches the RFC 7636 example and nothing else', (): void => {
    const pkce: S256PkceVerifier = new S256PkceVerifier();
    const verifier: string = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(pkce.matches(verifier, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')).toBe(true);
    expect(pkce.matches(verifier, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cN')).toBe(false);
    expect(pkce.matches(verifier, verifier)).toBe(false);
    expect(pkce.matches(verifier, 'short')).toBe(false);
  });
});

describe('JoseResourceTokenSigner', (): void => {
  it('signs an at+jwt audience-bound to the resource with client and scope', async (): Promise<void> => {
    const folder: string = mkdtempSync(join(tmpdir(), 'identity-oauth-keys-'));
    try {
      await generateSigningKey(folder, 'k1');
      const keys: SigningKeys = await loadSigningKeys(folder, 'k1');
      const now: Date = new Date();
      const signed: { token: string; expiresIn: number } = await new JoseResourceTokenSigner(
        keys,
        'https://exemple.fr/api/auth',
      ).sign(
        {
          accountId: 'admin',
          clientId: 'https://client.exemple.org/c.json',
          scopes: ['content:write', 'content:read'],
          resource: 'https://exemple.fr/api/content/mcp',
        },
        now,
      );
      expect(signed.expiresIn).toBe(RESOURCE_ACCESS_TTL_SECONDS);
      const verified: JWTVerifyResult<JWTPayload> = await jwtVerify(
        signed.token,
        createLocalJWKSet(keys.jwks as Parameters<typeof createLocalJWKSet>[0]),
        {
          issuer: 'https://exemple.fr/api/auth',
          audience: 'https://exemple.fr/api/content/mcp',
          typ: 'at+jwt',
        },
      );
      expect(verified.protectedHeader).toMatchObject({ alg: 'EdDSA', kid: 'k1', typ: 'at+jwt' });
      expect(verified.payload).toMatchObject({
        sub: 'admin',
        client_id: 'https://client.exemple.org/c.json',
        scope: 'content:read content:write',
      });
      expect(verified.payload['role']).toBeUndefined();
      expect(verified.payload['sid']).toBeUndefined();
      expect((verified.payload.exp ?? 0) - (verified.payload.iat ?? 0)).toBe(300);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
