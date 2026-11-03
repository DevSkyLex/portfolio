import {
  AdminClaimsSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  SessionResponseSchema,
  TotpRequestSchema,
} from '@internal/identity-contracts/lib/identity.contract';
import login from '@internal/identity-contracts/lib/testing/login-request.fixture.json';
import responses from '@internal/identity-contracts/lib/testing/login-response.fixture.json';
import totp from '@internal/identity-contracts/lib/testing/totp-request.fixture.json';

describe('LoginRequestSchema', (): void => {
  it('accepts the fixture shared by the service and the login screen', (): void => {
    expect(LoginRequestSchema.parse({ ...login, email: ' moi@exemple.fr ' }).email).toBe(
      'moi@exemple.fr',
    );
  });

  it.each([
    ['an empty password', { password: '' }],
    ['a huge password', { password: 'x'.repeat(201) }],
    ['a missing "remember" choice', { remember: undefined }],
    ['a "remember" given as text', { remember: 'true' }],
  ])('rejects %s', (_label, override): void => {
    expect(LoginRequestSchema.safeParse({ ...login, ...override }).success).toBe(false);
  });
});

describe('LoginResponseSchema', (): void => {
  it('tells an open session from a one-time-code challenge', (): void => {
    const [authenticated, challenge] = responses.map((response) =>
      LoginResponseSchema.parse(response),
    );
    expect(authenticated?.status).toBe('authenticated');
    expect(challenge?.status).toBe('totp-required');
  });

  it('rejects an unknown status or a short challenge', (): void => {
    expect(LoginResponseSchema.safeParse({ ...responses[0], status: 'pending' }).success).toBe(
      false,
    );
    expect(LoginResponseSchema.safeParse({ ...responses[1], challenge: 'short' }).success).toBe(
      false,
    );
  });
});

describe('TotpRequestSchema', (): void => {
  it('accepts the fixture of the second login step', (): void => {
    expect(TotpRequestSchema.parse(totp)).toEqual(totp);
  });

  it.each([
    ['a five-digit code', { totp: '12345' }],
    ['a code with letters', { totp: '12345a' }],
    ['a missing device choice', { trustDevice: undefined }],
    ['a short challenge', { challenge: 'abc' }],
  ])('rejects %s', (_label, override): void => {
    expect(TotpRequestSchema.safeParse({ ...totp, ...override }).success).toBe(false);
  });
});

describe('SessionResponseSchema', (): void => {
  it('describes the access token and its lifetime', (): void => {
    expect(SessionResponseSchema.parse({ accessToken: 'jwt', expiresIn: 600 })).toEqual({
      accessToken: 'jwt',
      expiresIn: 600,
    });
    expect(SessionResponseSchema.safeParse({ accessToken: 'jwt', expiresIn: '600' }).success).toBe(
      false,
    );
  });
});

describe('AdminClaimsSchema', (): void => {
  it('only accepts the admin role with a subject and a session', (): void => {
    expect(AdminClaimsSchema.safeParse({ sub: 'a', role: 'admin', sid: 'f' }).success).toBe(true);
    expect(AdminClaimsSchema.safeParse({ sub: 'a', role: 'user', sid: 'f' }).success).toBe(false);
    expect(AdminClaimsSchema.safeParse({ sub: '', role: 'admin', sid: 'f' }).success).toBe(false);
    expect(AdminClaimsSchema.safeParse({ sub: 'a', role: 'admin' }).success).toBe(false);
  });
});
