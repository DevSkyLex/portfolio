# Security and privacy

- Never read or write secrets: service `.env` files, `.data/` (PGlite databases, development keys and
  admin password), `docker/dev/secrets/`, the Ansible vault, key files. The guard hook refuses writes and
  token-shaped or private-key text.
- Identity (D17): scrypt hashing, two-step login (password, then a single-use TOTP against a 5-minute
  challenge, skipped on a trusted device), lockout answered like bad credentials, 5-minute EdDSA `at+jwt`
  access token with `sid`, rotating refresh token stored hashed (30 days sliding with "remember me", 12 hours
  in a session cookie otherwise, 90 days at most), trusted devices 30 days; cookies `__Host-portfolio_refresh`
  and `__Host-portfolio_device` (`HttpOnly; Secure; SameSite=Strict; Path=/`) over HTTPS, unprefixed with
  `Path=/api/auth` in HTTP development; family revocation on replay, JWKS verification in
  `libs/backend/platform/auth/src/lib/admin-auth/admin-auth.ts`, `@AdminOnly` on every admin route.
- Admin client (D18): the token never reaches web storage, `TransferState` or HTML; the interceptor only
  decorates admin API calls; admin pages are client-rendered and `noindex`.
- Contact privacy (D15): the origin is an HMAC fingerprint, never the plain IP; honeypot, rate limit,
  retention purge and erasure stay intact.
- Edge (D20): strict CSP `script-src 'self'` (no inline script), HSTS and the headers of
  `docker/nginx/snippets/security-headers.conf`.
- No `innerHTML` / `bypassSecurityTrust*` with content, no open redirect from query parameters.

Review: the `pf-security-auditor` role.
