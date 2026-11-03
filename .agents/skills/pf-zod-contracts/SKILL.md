---
name: pf-zod-contracts
description: 'Create or evolve shared Zod 4 Mini HTTP or content-snapshot contracts, fixtures, problem fields and transport adapters. Use when request/response schemas or public field names change; keep runtime schema validation out of domain/application and browser controls.'
---

# Zod contracts and transport mapping

Read the context contract README and [D5/D10 in the decisions](../../../docs/architecture/decisions.md).
The contract is the public wire format; domain objects and form values may have different names and
lifetimes. Check installed Zod before copying an API example: these libraries use `zod/mini` and its
functional checks, not a mixture of full-Zod chain methods and Mini schemas.

## Evolve the owned contract

- Define the schema and its inferred transport type together in `libs/contracts/<context>`. Keep this
  layer free of frameworks and I/O. Preserve the meaning of optional, missing, nullable, trimmed and
  empty values when changing a field; validation order can affect the accepted value.
- Treat public field names, error codes, enum values and nullability as consumer contracts. Review the
  controller/presenter, problem mapper, snapshot builder and browser data-access consumers together.
  When domain names differ, translate them at that boundary instead of renaming the domain for HTTP.
- Keep domain invariants independently enforceable without Zod. Align contract limits and feature-
  owned Signal Form rules deliberately; do not move form value types into transport data access to
  share a type alias. Browser consumers import contract types only; public snapshots are schema-
  validated at their existing build/server boundary.
- Map DTOs to presentation projections in the owning data-access adapter. Keep nested and indexed
  server-error paths intact until the feature maps them to its form controls. Retain an error until
  the corresponding submitted value changes, rather than clearing all fields on any keystroke.

The [contact request schema](../../../libs/contracts/contact/src/lib/contact-message.contract.ts),
[validation pipe](../../../libs/backend/platform/http/src/lib/pipes/zod-validation/zod-validation.pipe.ts),
[problem mapper](../../../libs/backend/contact/adapters-in/src/lib/http/mappers/contact-problem/contact-problem.mapper.ts) and
[admin projection adapter](../../../libs/frontend/content/data-access/src/lib/admin/adapters/admin-project/admin-project.adapter.ts)
show the four separate responsibilities. Use the [official Zod Mini guide](https://zod.dev/packages/mini)
for schema APIs; the repository owns where those APIs run.

## Verify acceptance and consumers

Add valid fixtures and rejected boundary cases that prove the changed behavior, including exact bounds,
normalization and nested paths when relevant. Update HTTP integration and adapter/form tests for the
consumer effect. Run the contract's and affected owners' Nx lint, typecheck and test targets; run the
web build when public snapshot shape or browser-facing templates change, so prerender validation and
strict template checks participate. See the [testing matrix](../../../docs/workspace/testing.md).
