# backend-auth

Server-side authorization shared by the services.

## Administrator routes (D17)

`AdminAuthModule.forRoot({ issuer, jwksUrl })` and `@AdminOnly()`: an EdDSA `at+jwt` with the
`portfolio-admin` audience, `sub`, `role`, `sid` and an age under six minutes. Tokens carrying
`client_id` or `scope` (MCP access tokens) are refused.

## MCP resource server (D45)

For the MCP endpoint of content-service (`https://<host>/api/content/mcp`):

```ts
McpAuthModule.forRoot({ issuer: AUTH_ISSUER, resource: MCP_RESOURCE, jwksUrl: AUTH_JWKS_URL });

@Post()
@McpScope('content:read') // 401 / 403 with the WWW-Authenticate challenge otherwise
public handle(@Req() request: Request): unknown {
  const principal: McpPrincipal = mcpPrincipalOf(request); // subject, clientId, scopes, tokenId
  if (!hasScopes(principal.scopes, ['content:write'])) { /* answer insufficient_scope for that tool */ }
}
```

- `JoseMcpTokenVerifier`: EdDSA `at+jwt` from the issuer, the resource as the only audience, RFC 9068
  claims (`client_id`, `scope`, `jti`), age under six minutes with 30 seconds of skew, MCP scopes only;
  administrator session tokens (`sid`, `role`) are refused.
- `McpTokenGuard` / `@McpScope(...scopes)`: a 401 carries a `WWW-Authenticate` Bearer challenge
  with `scope` and `resource_metadata` (and `error="invalid_token"` when a token was sent), a 403
  `error="insufficient_scope"` naming every required scope; the principal is `request.mcp`.
- `hasScopes`, `effectiveScopes`: `content:write`, `content:publish` and `content:delete` imply
  `content:read`.
- `protectedResourceMetadata({ resource, authorizationServer })`: the RFC 9728 document to serve at
  `/api/content/mcp/.well-known/oauth-protected-resource` (Nginx maps
  `protectedResourceMetadataUrl(resource)`, the path-insertion URL, onto it); `bearerChallenge` builds
  custom challenges. Never forward the received token to another service.

Run `npx nx test backend-auth`.
