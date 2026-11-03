---
description: Add or change an application use case with its ports, errors, outbox writes and fakes.
argument-hint: '<VerbNoun> in <ctx> — e.g. "ArchiveContactMessage in contact"'
---

Delegate to the **pf-api-use-case-builder** subagent: $ARGUMENTS

The agent carries the use-case template and the outbox rule (D3); do not restate them. HTTP, persistence and wiring go to **pf-api-adapter-builder**.

Require its report to give the use cases, commands, ports and errors added, the tests, the wiring left to the adapter builder, and the check results.
