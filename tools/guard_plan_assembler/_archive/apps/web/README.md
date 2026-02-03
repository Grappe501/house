# apps/web — Contactos Web UI

This app is governed by **Phase 07–09**.

Phase summary:
- **Phase 07 (SEALED):** UI scaffolding only (pages + components + stubs)
- **Phase 08 (SEALED):** read-only integration (Next route handlers + /dashboard + /status)
- **Phase 09 (OPEN):** contacts persistence + CRUD (route handlers + operator pages)

## Boundary (hard rule)

### Allowed in Phase 09
- `apps/web/**`
- Phase governance artifacts: `plans/**`, `docs/**`

### Not allowed in Phase 09
- Any modifications to: `scripts/**`, `build/**`, `artifacts/**`, `contracts/**`, `policy/**`, `infra/**`, `services/**` (unless Phase 09 explicitly expands to services — it does **not**)
- Any change that alters deterministic artifact packaging or plan-guard machinery

If you need new repo-wide tooling (migrations framework, CI wiring changes, executor work), split into a **new phase**.

## Operator surfaces

- `/dashboard` — raw view of governance + execution data (Phase 08)
- `/status` — health (OK / NO_DATA) + raw responses (Phase 08)
- `/contacts` — contacts list/search/create (Phase 09)
- `/contacts/[id]` — contact detail/edit/delete (Phase 09)

## API contract

All route handlers must return the shared `ApiResult<T>` contract:
- `apps/web/src/lib/api_contract.ts`

Do not introduce ad-hoc response shapes.

## Phase 08 runtime source override env vars (optional)

These allow reading from local artifact snapshots without touching the executor.

- `CONTACTOS_GUARD_STATUS_PATH`
- `CONTACTOS_EXECUTIONS_DIR`
- `CONTACTOS_EXECUTIONS_INDEX_PATH`
- `CONTACTOS_AUDIT_PATH`

## Phase 09 persistence

Phase 09 uses the existing Postgres client already present in the web app (`pg`).

- `DATABASE_URL` — required

Local-first means **local Postgres in dev** (for example via docker compose), not a hosted dependency.

## Smoke checks

Run from `apps/web/`.

### Install
```bash
npm install
```

### Dev
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Start
```bash
npm run start
```

> Note: lint/typecheck scripts may vary by build. Phase 07–09 do not change root tooling.
