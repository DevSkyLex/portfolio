# identity-composition

Nest composition of the identity context (`IdentityModule.register`), imported by
`apps/identity-service`. It wires the administrator authentication (D17, D27: login, optional one-time
code, trusted devices, rotating refresh sessions, JWKS) and the OAuth 2.1 authorization server that
lets MCP clients act on the content administration after the owner's consent (D45).

## OAuth authorization server (D45)

| Route                                                   | Caller        | Purpose                                          |
| ------------------------------------------------------- | ------------- | ------------------------------------------------ |
| `GET /api/auth/.well-known/oauth-authorization-server`  | MCP clients   | RFC 8414 metadata (Nginx maps the insertion URL) |
| `POST /api/auth/oauth/token`                            | MCP clients   | Code with PKCE `S256`, rotating refresh          |
| `POST /api/auth/oauth/revoke`                           | MCP clients   | RFC 7009, revokes a refresh-token family         |
| `POST /api/auth/oauth/register`                         | MCP clients   | RFC 7591 dynamic registration, capped            |
| `POST /api/auth/admin/oauth/authorizations`             | consent page  | Review of the authorization query (`@AdminOnly`) |
| `POST /api/auth/admin/oauth/authorizations/:id/approve` | consent page  | « Autoriser »: code redirect with `state`, `iss` |
| `POST /api/auth/admin/oauth/authorizations/:id/deny`    | consent page  | « Refuser »: `access_denied` redirect            |
| `GET /api/auth/admin/oauth/applications`                | security page | Connected applications                           |
| `DELETE /api/auth/admin/oauth/applications/:id`         | security page | Revokes a consent and its refresh tokens         |

Options: `issuer` (also the OAuth issuer), `mcpResource` (defaults to the issuer's origin followed by
`/api/content/mcp`) and, for tests, `clientMetadataFetcher` (defaults to the SSRF-safe
`HttpsClientMetadataFetcher`) and `clock`. MCP access tokens are signed with the identity keys and
verified on the resource side by `McpAuthModule` of `@vfortin/backend-auth`.

## Validation

`npx nx run-many -t lint typecheck test -p identity-domain identity-application identity-adapters-out identity-adapters-in identity-composition`.
`src/lib/testing/oauth.module.spec.ts` runs every OAuth endpoint over HTTP on PGlite: the full flow,
PKCE mismatch, wrong redirect URI, reused and expired codes, refresh replay, other resource, scope
escalation, registration limits, metadata-document SSRF refusals and the separation of administrator
and MCP tokens.
