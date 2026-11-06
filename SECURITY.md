# Security policy

## Report a vulnerability privately

Email [contact@valentin-fortin.pro](mailto:contact@valentin-fortin.pro) with the subject
`Portfolio security report`. If GitHub offers **Report a vulnerability** in this repository's Security
tab, you may use that private channel instead.

Do not publish exploit details in an issue, PR or discussion before coordinating disclosure with the
maintainer. Include:

- The affected release tag or commit SHA and component or endpoint.
- Preconditions, the minimum reproduction steps and expected versus actual behavior.
- The concrete impact and a proof of concept using synthetic data.
- Sanitized logs or screenshots and a way to contact you.

Never include passwords, private keys, live tokens, administrator sessions, private contact messages
or database dumps. If a credential has already been exposed, identify its location without sending
the credential again. The maintainer will coordinate verification, remediation and disclosure; this
repository does not promise a fixed response time or a bounty.

## Versions and scope

Include the exact affected version even when reporting an older release. Assessment focuses on
the current `main` code and the deployed release; older deployments may need to upgrade to receive a
fix. There is no separate long-term-support branch policy.

The application includes the Angular public site and private administration area, the identity,
content and contact services, their shared contracts, and the repository's build and deployment
configuration. Important assets include administrator credentials and sessions, OAuth/MCP tokens,
private messages, unpublished content, uploaded media and deployment credentials.

Relevant reports include authentication or authorization bypass, access to private or unpublished
data, unauthorized mutation, token misuse, injection, SSRF, unsafe uploads and credible compromises of
the build or deployment path. Describe realistic reachability and impact; a dependency advisory or
missing header alone does not establish exploitability, but may be useful evidence.

## Expected security properties

- Public requests cannot read or mutate administrator-only data. Permission and scope checks apply
  before protected operations, including MCP calls and optimistic-concurrency updates.
- Session and OAuth/MCP tokens are validated for their intended issuer, audience and purpose;
  administrator tokens and delegated tool tokens are not interchangeable.
- Untrusted rich content, uploads and remote URLs remain bounded and cannot execute code or access
  private network resources.
- Credentials and private contact data stay out of responses, client bundles, public caches and logs.
- Build and deployment credentials have the minimum required permissions, and deployments use the
  release commit rather than an arbitrary moving branch.

These are review requirements, not a claim that every implementation is free of vulnerabilities.
Architecture and deployment details are documented under [docs/architecture](docs/architecture/)
and [operations](docs/operations/deployment.md).

## Safe reproduction and disclosure

Prefer a local checkout and synthetic accounts, content and messages. Do not access other people's
data, perform destructive actions, send bulk messages, attempt denial of service or test systems you
do not own or have permission to assess. Stop if a reproduction reveals private information and
report the minimum necessary evidence through the private channel.

Coordinate a public advisory or release note after a fix and deployment plan are agreed. Ordinary
correctness problems and feature requests belong in the public issue forms.
