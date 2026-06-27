# Drift Recovery Runbook

Use this runbook when validation reports generated-doc drift, ACTIVE_CONTEXT staleness, branch-switch drift, or merge conflict residue.

For starter seed versus generated runtime output terminology, use `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md`. In pre-init clean payload state, `ACTIVE_CONTEXT.brief.md` is a starter seed read surface and not live project truth. `starter_bootstrap_pending` is an expected pre-init hold; post-init project state starts only after initialization creates project-local runtime output.

## Ordered recovery

1. Stop implementation or closeout claims.
2. Run `npm run harness:validate` and save the blocking finding codes.
3. Run `npm run harness:sync-state` to regenerate validation report, generated state docs, Active Context, and status in canonical order.
4. If Active Context remains stale, run `npm run harness:context -- --repair`.
5. Re-run `npm run harness:validate`.
6. Re-run the current stage hard gate, for example `npm run harness:packet-preflight -- --stage implementation-transition --packet <packet>`.

## Do not do this

- Do not manually edit `.agents/runtime/generated-state-docs/*` to resolve drift.
- Do not copy an old `.agents/runtime/ACTIVE_CONTEXT.json` between branches.
- Do not proceed from a `codex-ready` GO/WARN state without packet-preflight.

## Expected clean state

A clean recovery has:

- validation report `ok=true`;
- no `checksum_mismatch`, `stale_generated_view`, or `active_context_route_mismatch` finding;
- Active Context `selectedLane.workItemId` matching the active work item;
- packet-preflight passing for the current stage.


Command taxonomy: `reference/commands/COMMAND_TAXONOMY.md`.

Compatibility command policy: `reference/commands/COMPATIBILITY_COMMAND_POLICY.md`.
