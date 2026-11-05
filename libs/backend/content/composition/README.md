# content-composition

Composes content persistence, application use cases, HTTP adapters and optional background workers.
`ContentModule.register` owns and closes the database it opens. Tests can replace the clock, outbound
sources, build dispatcher and database preparation without enabling workers.

## MCP resource (D49)

The optional `mcp` setting enables `ContentMcpController`, `ContentMcpTools` and
`McpAuthModule.forRoot` with the trusted issuer, resource URI and JWKS. The service app supplies these
from its existing authentication configuration. Omitting the option leaves MCP routes unregistered.
The HTTP adapter calls the same application use cases as the admin API; it does not forward access
tokens to the admin routes or persistence adapters.

## Validation

Run `npx nx run-many -t lint typecheck test -p content-composition` and
`npx nx build content-service`. Composition tests exercise disposable PGlite and close Nest handles.
