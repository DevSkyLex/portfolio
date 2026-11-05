# content-adapters-in

Inbound HTTP controllers, publication jobs and the OAuth-protected content MCP resource. Controllers
validate transport inputs and invoke the content application use cases; domain rules and persistence
remain outside this library.

## MCP resource

`ContentMcpController` serves stateless Streamable HTTP at `/api/content/mcp` and public RFC 9728
discovery at `/api/content/mcp/.well-known/oauth-protected-resource`. A fresh official SDK server and
transport handle each request; no token or session is shared across clients. Supplied browser origins
must match the configured resource origin. CORS runs before authentication, and credentials are never
read from cookies.

`ContentMcpTools` advertises 15 tools for projects, timeline entries, profile and legal documents. Input
JSON Schemas come from the existing administrator Zod contracts in input mode, including normalized
fields. Every conditional mutation requires the caller's `expectedVersion`. Known content failures
become safe tool errors; protocol/input failures remain JSON-RPC errors and unexpected failures are
redacted.

The initial challenge requests `content:read`. Tool calls require their own scopes and return an HTTP
403 OAuth challenge before execution when consent is insufficient. Draft project edits require
`content:write`; published project edits, timeline changes, profile and legal edits additionally require
`content:publish`. Publishing and unpublishing require `content:publish`; timeline deletion requires
`content:delete` and `content:publish`. Failed project lookups never relax this policy. See
[D49](../../../../docs/architecture/decisions.md#d49--content-mcp-resource) for the complete table.

Uploads, SEO reporting and contact messages have no MCP tools. Tool calls use application use cases
directly and never forward the incoming token to another service.

## Running unit tests

Run `npx nx run-many -t lint typecheck test -p content-adapters-in`. The real database, JWT and SDK
HTTP client journeys belong to `content-composition` (`content-mcp.spec.ts`).
