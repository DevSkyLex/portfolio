import {
  CSP_NONCE_PLACEHOLDER,
  cspNonce,
  withCspNonce,
} from '@internal/web/server/csp-nonce/csp-nonce';

describe('cspNonce', (): void => {
  it('keeps the nonce Nginx generated', (): void => {
    expect(cspNonce('0123456789abcdef0123456789abcdef')).toBe('0123456789abcdef0123456789abcdef');
  });

  it('draws a fresh nonce for a missing or malformed header', (): void => {
    for (const header of [
      undefined,
      '',
      'abc',
      ['0123456789abcdef0123456789abcdef'],
      "x' 'unsafe-inline",
    ]) {
      const nonce: string = cspNonce(header);
      expect(nonce).toMatch(/^[0-9a-f]{32}$/);
      expect(nonce).not.toBe(CSP_NONCE_PLACEHOLDER);
    }
    expect(cspNonce(undefined)).not.toBe(cspNonce(undefined));
  });
});

describe('withCspNonce', (): void => {
  it('replaces every placeholder of the page', (): void => {
    const html: string = `<app-root ngcspnonce="${CSP_NONCE_PLACEHOLDER}"></app-root><script nonce="${CSP_NONCE_PLACEHOLDER}"></script>`;
    expect(withCspNonce(html, 'abc')).toBe(
      '<app-root ngcspnonce="abc"></app-root><script nonce="abc"></script>',
    );
  });
});
