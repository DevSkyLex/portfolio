---
description: Review Docker, Compose, Nginx, Ansible and the deployment scripts. Read-only; never deploys.
argument-hint: '[path — e.g. docker/nginx or ansible/roles/site]'
---

Delegate to the **pf-ops-reviewer** subagent: $ARGUMENTS

The agent validates statically (`docker compose ... config`, `sh -n`, `--syntax-check`); nothing runs against production.

Require its report to give findings worst-first with consequence, fix and the static check that confirms it.
