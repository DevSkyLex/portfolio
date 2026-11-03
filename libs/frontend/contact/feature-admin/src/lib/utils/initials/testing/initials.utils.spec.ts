import { initials } from '@internal/contact-web-feature-admin/lib/utils/initials/initials.utils';

describe('initials', () => {
  it('takes the first letters of the first and last words', () => {
    expect(initials('Camille Martin')).toBe('CM');
    expect(initials('Jean Pierre de La Fontaine')).toBe('JF');
  });

  it('keeps one letter for a single word and none for a blank name', () => {
    expect(initials('  léa  ')).toBe('L');
    expect(initials('   ')).toBe('');
  });
});
