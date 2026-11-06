# content-adapters-out

This library was generated with [Nx](https://nx.dev).

## Demonstration content

`src/lib/seed/` contains a fictional Morgan Exemple profile, invented projects and an invented career.
Contacts use reserved example domains. These records exercise the content model and are not the
portfolio owner's résumé or production legal documents.

Seeding replaces content collections, profile and legal copy. Run it only against an explicitly
disposable local/test database. It is not a migration for an existing portfolio or a way to update
production content. Public browser fixtures are generated through the same seed, published-content
use case and HTTP presenter with an in-memory PGlite database.

## Running unit tests

Run `nx test content-adapters-out` to execute the unit tests via [Vitest](https://vitest.dev/).
