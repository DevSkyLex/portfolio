import {
  type AuthorizationServerMetadata,
  MCP_SCOPES,
  OAUTH_AUTHORIZE_PATH,
  OFFLINE_ACCESS_SCOPE,
} from '@vfortin/identity-contracts';

/**
 * Function authorizationServerMetadata
 *
 * @description
 * Builds the RFC 8414 document of the authorization server (D45) from its issuer, e.g.
 * `https://valentin-fortin.pro/api/auth`: the protocol endpoints below the issuer, the consent page
 * of the administration as authorization endpoint, the identity JWKS, PKCE `S256` only, public
 * clients only, RFC 9207 `iss` and Client ID Metadata Documents.
 *
 * @param {string} issuer - Issuer identifier, without trailing slash.
 *
 * @returns {AuthorizationServerMetadata} Metadata document.
 */
export function authorizationServerMetadata(issuer: string): AuthorizationServerMetadata {
  return {
    issuer,
    authorization_endpoint: new URL(OAUTH_AUTHORIZE_PATH, issuer).href,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    jwks_uri: `${issuer}/jwks.json`,
    scopes_supported: [...MCP_SCOPES, OFFLINE_ACCESS_SCOPE],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    authorization_response_iss_parameter_supported: true,
    client_id_metadata_document_supported: true,
  };
}
