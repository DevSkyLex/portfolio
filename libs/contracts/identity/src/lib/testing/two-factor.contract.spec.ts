import {
  TwoFactorDisableRequestSchema,
  TwoFactorEnableRequestSchema,
  TwoFactorSetupRequestSchema,
  TwoFactorSetupResponseSchema,
  TwoFactorStatusResponseSchema,
} from '@internal/identity-contracts/lib/two-factor.contract';
import setup from '@internal/identity-contracts/lib/testing/two-factor-setup-response.fixture.json';

describe('two-factor contracts', (): void => {
  it('accepts the setup fixture and the request shapes', (): void => {
    expect(TwoFactorSetupResponseSchema.parse(setup).secret).toBe(setup.secret);
    expect(TwoFactorStatusResponseSchema.parse({ enabled: false })).toEqual({ enabled: false });
    expect(TwoFactorSetupRequestSchema.safeParse({ password: 'x' }).success).toBe(true);
    expect(TwoFactorEnableRequestSchema.safeParse({ totp: '123456' }).success).toBe(true);
    expect(TwoFactorDisableRequestSchema.safeParse({ password: 'x', totp: '123456' }).success).toBe(
      true,
    );
  });

  it.each([
    ['a five-digit code', TwoFactorEnableRequestSchema, { totp: '12345' }],
    ['a code with letters', TwoFactorEnableRequestSchema, { totp: '12a456' }],
    ['an empty password', TwoFactorSetupRequestSchema, { password: '' }],
    ['a disable without code', TwoFactorDisableRequestSchema, { password: 'x' }],
    [
      'a lowercase secret',
      TwoFactorSetupResponseSchema,
      { ...setup, secret: setup.secret.toLowerCase() },
    ],
    [
      'an http provisioning URI',
      TwoFactorSetupResponseSchema,
      { ...setup, provisioningUri: 'https://x' },
    ],
  ])(
    'rejects %s',
    (
      _label: string,
      schema: { safeParse: (value: unknown) => { success: boolean } },
      value: unknown,
    ): void => {
      expect(schema.safeParse(value).success).toBe(false);
    },
  );
});
