# Public contact feature

## Purpose

`contact-web-feature` owns the public contact section and its Signal Form. The section coordinates
submission state; the form owns browser-safe values, validation, accessibility and field feedback.
It has no independent route: the home page composes its published section.

## Public entry points

| Entry point                    | Consumers   |
| ------------------------------ | ----------- |
| `@vfortin/contact-web-feature` | `web-shell` |

Only `ContactSectionComponent` is public. The form, value models, options and decorative details remain
private. Other owners do not import the internal form or submission store.

## Provider scope

The section provides `ContactFormStore`, so a new section starts with idle submission state. The shell
defers its hydration as documented in D22; behavior belongs to this feature once hydrated. Native and
catalogue controls supply value-control integration.

## Invariants

- The form emits validated values; the section invokes the store and returns field failures.
- A field error remains associated with its submitted value and clears when that value changes.
- Browser bounds match the API; browser-safe rules/value shapes remain form-owned.
- The honeypot stays invisible and unvalidated; it is never a user-facing required field.
- Pending sends reject duplicates; success does not disclose silent honeypot handling.
- Public copy has explicit localization IDs; the section remains readable before hydration.

## Validation

Run `npx nx run-many -t lint typecheck test -p contact-web-feature`, then
`npx nx run architecture:test`. Component tests prove submission, field errors and keyboard semantics.
Built-site tests cover deferred hydration; stack tests qualify delivery to Mailpit.
See [testing](../../../../docs/workspace/testing.md), decisions D15, D18 and D22.
