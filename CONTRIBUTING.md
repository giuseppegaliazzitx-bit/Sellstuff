# Contributing

Two people: the builder and the brother (hosting). CI is the reviewer.
This file is the procedure. Design source of truth: `DESIGN.md` §6.2–6.8.

## Local-first exception (Phase 0)

Docker is **not** installed on the builder laptop. Until it is:

- Run and test with Python + Node (see README).
- Dockerfiles and Compose still land in every relevant PR so they do not rot.
- `make` is optional; Git Bash users can call the same targets, Windows users use the README commands or `python scripts/run_dev.py`.
- Do not merge red CI. If GitHub cannot *enforce* branch protection (free private plan), the rule is still the rule.

## Branches

| Branch | From | Merges into | Purpose |
|---|---|---|---|
| `main` | — | — | Always green. Nobody commits to it directly. |
| `phase/NN-slug` | `main` | `main` | One phase. |
| `feat/NN-slug` / `fix/NN-slug` | phase branch | phase branch | Optional slice. |
| `spike/slug` | `main` or phase | **never merged** | Experiment; findings → `docs/decisions/`. |
| `hotfix/slug` | `main` | `main`, then cherry-pick into open phase | Production bug. |

## Commits

Conventional Commits: `type(scope): subject`

Types: `feat fix test docs chore refactor perf ci build revert`

Scopes: `auth deals browse chat mail crm offers showings metrics web db infra ci docs phase-NN`

Footer:

```
Phase: NN
Tests: P0-T4,P0-T5
```

Push after every checkpoint. `wip:` is allowed on a phase branch and must be squashed before the PR. One Alembic revision per PR.

## Checkpoints (every phase)

1. Open: branch + `docs/phases/NN-slug.md`
2. Schema: Alembic + models
3. Backend: schemas, services, routes
4. Backend tests
5. Frontend
6. Component + E2E (or worker tests)
7. Env + docs
8. Close: CHANGELOG + green-run record

## PR → `main`

Title: `Phase NN — <name>`

- Merge commit (`--no-ff`) for `phase/*` → `main`
- Squash for `feat/*` → phase and `hotfix/*` → `main`
- CI green. Demo script followed once.
- Tags on the merge commit: `phase-NN` and `v0.NN.0` (annotated)

Never `git push --force` on `main`. `--force-with-lease` only on your own `phase/*` / `feat/*` after rebase.
