# content-service

The Nest service composes the content context, observability, administrator authentication and the
OAuth-protected MCP resource. Configuration is validated in `src/config.ts`; JSON requests are capped
at 1 MB by `configureContentHttp`. Background workers process the existing content outbox.

The authored `package.json` lists production dependencies for `content-service:prune`. The MCP SDK
must remain declared there as well as in the workspace manifest, so the service and migration CLI load
inside the minimal image installed with `npm ci --omit=dev`.
After Nx prunes the dependency graph, the `prune` target lets npm finalize the generated lockfile.
This repairs nested dependency placement for the SDK's Express version without installing packages or
running lifecycle scripts; the image still installs the resulting lockfile with `npm ci`.

## MCP

The resource URI is the origin of `AUTH_ISSUER` followed by `/api/content/mcp`; tokens are checked
against `AUTH_ISSUER` and `AUTH_JWKS_URL`. No additional credential is needed. Keep identity-service's
`IDENTITY_MCP_RESOURCE` at its default so both services use this same resource audience.

See [MCP access](../../docs/operations/deployment.md#mcp-access-oauth-authorization-server-d45)
for client setup, tool permissions and revocation, and
[D49](../../docs/architecture/decisions.md#d49--content-mcp-resource) for the transport contract.

## Validation

Run `npx nx run-many -t lint typecheck test build -p content-service` and the content context tests.
