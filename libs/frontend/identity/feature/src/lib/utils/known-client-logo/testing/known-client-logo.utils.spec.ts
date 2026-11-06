import { knownClientLogo } from '@internal/identity-web-feature/lib/utils/known-client-logo/known-client-logo.utils';

describe('knownClientLogo', (): void => {
  it('gives Claude and Claude Code their logo, without the pack title', (): void => {
    for (const clientId of [
      'https://claude.ai/oauth/mcp-oauth-client-metadata',
      'https://claude.ai/oauth/claude-code-client-metadata',
    ]) {
      const logo: string | null = knownClientLogo(clientId, 'metadata-document');
      expect(logo).toMatch(/^<svg/);
      expect(logo).not.toContain('<title>');
    }
  });

  it('gives nothing to an unknown host, a dynamic registration or an invalid identifier', (): void => {
    expect(knownClientLogo('https://example.com/client.json', 'metadata-document')).toBeNull();
    expect(
      knownClientLogo('https://claude.ai/oauth/mcp-oauth-client-metadata', 'dynamic'),
    ).toBeNull();
    expect(knownClientLogo('not a url', 'metadata-document')).toBeNull();
  });
});
