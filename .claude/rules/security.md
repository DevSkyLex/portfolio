---
paths:
  - 'libs/backend/platform/auth/**'
  - 'libs/backend/identity/**'
  - 'libs/frontend/identity/**'
  - 'apps/identity-service/**'
  - 'docker/nginx/**'
---

# Security and privacy

- Never read or write secrets: service `.env` files, `.data/` (PGlite databases, development keys and
  admin password), `docker/dev/secrets/`, the Ansible vault, key files. The guard hook refuses writes and
  token-shaped or private-key text.
- Identity (D17): scrypt hashing; the account is bootstrapped password-only and the TOTP is optional,
  enrolled later from the admin "Sécurité" page (`/api/auth/totp*`, `@AdminOnly`): password asked again
  and counted towards the lockout, pending secret confirmed by a code, removal with both factors forgets
  the trusted devices, a wrong password or code answers 422 and a state conflict 409 (never 401, except
  a lock), the setup answer is the only one carrying a secret. Once enabled, two-step login (password,
  then a single-use TOTP against a 5-minute challenge, skipped on a trusted device); lockout answered
  like bad credentials, 5-minute EdDSA `at+jwt` access token with `sid`, rotating refresh token stored
  hashed (30 days sliding with "remember me", 12 hours in a session cookie otherwise, 90 days at most),
  trusted devices 30 days; cookies `__Host-portfolio_refresh` and `__Host-portfolio_device`
  (`HttpOnly; Secure; SameSite=Strict; Path=/`) over HTTPS, unprefixed with `Path=/api/auth` in HTTP
  development; family revocation on replay, JWKS verification in
  `libs/backend/platform/auth/src/lib/admin-auth/admin-auth.ts`, `@AdminOnly` on every admin route.
- MCP access (D45): identity-service is the OAuth 2.1 authorization server of the MCP resource
  `https://<host>/api/content/mcp`. Public clients with PKCE `S256` only; redirect URIs `https` or
  loopback HTTP, matched exactly (the loopback port aside); Client ID Metadata Documents fetched only
  through `HttpsClientMetadataFetcher` (https on 443, every resolved address public, no redirect, 5 kB,
  5 s) and only during an administrator's review; dynamic registration capped and flagged unverified.
  Authorization codes hashed, single use, 60 s; refresh tokens hashed and rotated with family revocation
  on replay, on tables separate from the administrator sessions. MCP access tokens are `at+jwt` with
  `aud` the resource, `client_id` and `scope`: `@AdminOnly` refuses them and `@McpScope` refuses the
  administrator's; no scope reaches the contact messages; the MCP server never passes its token on.
  The consent page `/admin/oauth/authorize` is never framed, always asks, and follows only `https` or
  loopback redirects returned by the server, with `state` and `iss`.
- Admin client (D18): the token never reaches web storage, `TransferState` or HTML; the interceptor only
  decorates admin API calls; admin pages are client-rendered and `noindex`.
- Contact privacy (D15): the origin is an HMAC fingerprint, never the plain IP; honeypot, rate limit,
  retention purge and erasure stay intact.
- Edge (D20): strict CSP `script-src 'self'` (no inline script), HSTS and the headers of
  `docker/nginx/snippets/security-headers.conf`.
- No `innerHTML` / `bypassSecurityTrust*` with content, no open redirect from query parameters.
- Uploads (D40): administrator only (`@AdminOnly` runs before Multer), one file of at most 10 MiB, SVG and
  undecodable input refused, re-encoded to WebP by sharp (pixel limit, metadata stripped), stored under a
  random uuid name; served only from the fixed pattern `/media/<uuid>(-960)?.webp` with `nosniff`, never
  under a client-supplied name or type. Nginx caps bodies (11 MB upload, 1100 kB project and legal
  document edits).

Review: the `pf-security-auditor` agent.
