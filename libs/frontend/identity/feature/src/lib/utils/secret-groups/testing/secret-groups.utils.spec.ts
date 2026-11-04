import { toSecretGroups } from '@internal/identity-web-feature/lib/utils/secret-groups/secret-groups.utils';

describe('toSecretGroups', () => {
  it('groups a secret by four characters', () => {
    expect(toSecretGroups('JBSWY3DPEHPK3PXP')).toEqual(['JBSW', 'Y3DP', 'EHPK', '3PXP']);
  });

  it('keeps a shorter last group and an empty secret empty', () => {
    expect(toSecretGroups('ABCDEF')).toEqual(['ABCD', 'EF']);
    expect(toSecretGroups('')).toEqual([]);
  });
});
