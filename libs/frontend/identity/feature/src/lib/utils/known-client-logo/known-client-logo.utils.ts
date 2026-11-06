import { simpleClaude } from '@ng-icons/simple-icons';
import type { ConnectedApplication } from '@vfortin/identity-web-data-access';

/**
 * Constant KNOWN_CLIENT_LOGOS
 *
 * @description
 * Brand logo of known MCP clients whose metadata document declares no `logo_uri`, by host of their
 * client identifier: Claude (`claude.ai/oauth/mcp-oauth-client-metadata`) and Claude Code
 * (`claude.ai/oauth/claude-code-client-metadata`) publish none, unlike Codex. The pack title is
 * dropped: the name is written beside the logo.
 *
 * @type {Readonly<Record<string, string>>}
 */
const KNOWN_CLIENT_LOGOS: Readonly<Record<string, string>> = {
  'claude.ai': simpleClaude.replace(/<title>[^<]*<\/title>/, ''),
};

/**
 * Function knownClientLogo
 *
 * @description
 * Logo to show for a client without a fetched one (D45): only for a Client ID Metadata Document,
 * whose `https` identifier proves the host; a dynamic registration may claim any name.
 *
 * @param {string} clientId - Client identifier.
 * @param {ConnectedApplication['registration']} registration - How the client is registered.
 * @returns {string | null} Brand SVG markup, or `null` for an unknown or unverified client.
 */
export function knownClientLogo(
  clientId: string,
  registration: ConnectedApplication['registration'],
): string | null {
  if (registration !== 'metadata-document' || !URL.canParse(clientId)) return null;
  return KNOWN_CLIENT_LOGOS[new URL(clientId).hostname] ?? null;
}
