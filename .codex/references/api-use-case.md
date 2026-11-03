# Backend use-case recipe

Claude Code keeps an equivalent skill; change one, change both. Rules:
[backend hexagonal](../rules/backend-hexagonal.md), [contracts](../rules/contracts.md). Worked example: the contact context (`libs/backend/contact/`).

## 1. Domain (`libs/backend/<ctx>/domain`)

Aggregate with a private constructor, validating static factory and rehydration, transitions that keep
invariants, `version` for optimistic locking. `ContactMessage.receive({ ...command, id, receivedAt })` in
`libs/backend/contact/domain/src/lib/message/contact-message.ts`. Errors: `InvalidValueError(field, …)`
from `domain-error.ts`. No framework, ORM, Zod or I/O.

## 2. Application (`libs/backend/<ctx>/application`)

```ts
// Shape of ArchiveContactMessage (contact application), simplified.
export interface ArchiveMessageCommand {
  readonly id: string;
  readonly expectedVersion: number;
}

/** Archives a message; a stale version fails with VersionMismatchError (412). */
export class ArchiveMessage {
  public constructor(private readonly messages: ContactMessageRepository) {}

  public async execute(command: ArchiveMessageCommand): Promise<{ version: number }> {
    const message = await this.messages.get(command.id);
    if (!message) throw new NotFoundError(); // code 'contact.not-found'
    return { version: await this.messages.save(message.archive(), command.expectedVersion) };
  }
}
```

- Ports in `ports/<ctx>.ports.ts` (repositories, unit of work, `Clock`, `IdGenerator`, `RateLimiter`,
  `MailSender`), documented with ordering, locking and atomicity contracts.
- Side effects that must happen (mail, site rebuild) are outbox rows written in the same unit of work
  (`unitOfWork.run(async ({ messages, jobs }) => …)`); a worker use case claims due rows with a lease and
  records each attempt (D3).
- Errors (`application-error.ts`) carry stable dotted codes. Export from `src/index.ts`.
- Test with the in-memory fakes (`testing/<ctx>.fakes.ts`): no Nest, no database.

## 3. Contract (`libs/contracts/<ctx>`)

`zod/mini` schema plus inferred type plus a fixture in `testing/` and a spec. Field names are public;
bounds mirror the domain constants.

## 4. adapters-in

Controller method with `@Body(new ZodValidationPipe(Schema))`, explicit mapping to the command, contract
response type, `@HttpCode` when not 200/201, `@AdminOnly` for admin routes, `If-Match` read with
`libs/backend/platform/http/src/lib/if-match/if-match.ts`. Extend the context problem mapper
(`<ctx>-problem.mapper.ts`) for new errors: status, `code`, `title`, per-field `errors` named as the
contract (`CONTRACT_FIELDS` maps domain names). Statuses in use: 202, 400 `request.invalid`, 401, 404,
412, 422, 429.

## 5. adapters-out

Drizzle table in `persistence/<ctx>.schema.ts` under `pgSchema('<ctx>')`; repository mapping rows ↔
models, `version` check in the `UPDATE … WHERE version = ?` returning the new version. Then:

```bash
npx drizzle-kit generate --config apps/<ctx>-service/drizzle.config.ts   # SQL + meta in apps/<ctx>-service/migrations/
npx nx run <ctx>-service:db-migrate                                      # apply to the local PGlite database
```

Review the generated SQL; never edit `migrations/meta/`; never `drizzle-kit push` (refused by the hook).
Grants follow the roles of `docker/postgres/init/01-roles.sh` (D23).

## 6. Composition (`libs/backend/<ctx>/composition`)

Register the use case in `<ctx>.module.ts` with a `useFactory` over the port tokens and add the
controller. The service app (`apps/<ctx>-service`) changes only for new configuration (`config.ts`, Zod
over the environment) or CLI commands (`cli.ts`).

## 7. Tests per layer

| Layer        | Test                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| domain       | plain Vitest on factories and transitions                                                                                       |
| application  | fakes, outbox rows, errors                                                                                                      |
| adapters-out | repository on `pglite:memory` after `migrate<Ctx>Database` with the service migrations (`drizzle-contact.repositories.spec.ts`) |
| composition  | Nest `Test.createTestingModule` + supertest over HTTP, problem+json bodies (`contact.module.spec.ts`)                           |
| contracts    | fixture parses, invalid input fails                                                                                             |

```bash
npx nx run-many -t lint typecheck test -p <ctx>-domain <ctx>-application <ctx>-adapters-in <ctx>-adapters-out <ctx>-composition <ctx>-contracts
npx nx build <ctx>-service
npx nx run architecture:test
```

Then the frontend consumer: pf-web-data-access-builder; review: pf-api-contract-reviewer.
