# content-service

The Nest service composes the content context, observability, administrator authentication and the
OAuth-protected MCP resource. Configuration is validated in `src/config.ts`; JSON requests are capped
at 1 MB by `configureContentHttp`. Background workers process the existing content outbox.

## MCP

The resource URI is the origin of `AUTH_ISSUER` followed by `/api/content/mcp`; tokens are checked
against `AUTH_ISSUER` and `AUTH_JWKS_URL`. No additional credential is needed. Keep identity-service's
`IDENTITY_MCP_RESOURCE` at its default so both services use this same resource audience.

See [MCP access](../../docs/operations/deployment.md#mcp-access-oauth-authorization-server-d45)
for client setup, tool permissions and revocation, and
[D49](../../docs/architecture/decisions.md#d49--content-mcp-resource) for the transport contract.

## Validation

Run `npx nx run-many -t lint typecheck test build -p content-service` and the content context tests.
