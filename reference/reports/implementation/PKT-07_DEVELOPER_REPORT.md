# PKT-07 Developer Report

## Scope Implemented
- Added `standard_harness.workflow.conductor` as the Conductor-facing runtime contract.
- Added Conductor selection records for Codex app and Claude Code app examples without
  granting approval authority by selection.
- Added initialized-project entry generation for selected `AGENTS.md` or `CLAUDE.md`
  files with harness authority warnings.
- Added delegated approval validation for Human direct approval and scoped Conductor
  delegation.
- Added fail-closed rejection for Planner delegated approval execution, unsupported actors,
  untrusted approval channels, packet hash drift, risk ceiling violations, expired windows,
  wrong packet/conductor/type, and missing evidence prerequisites.
- Added deterministic risk/importance routing for Conductor direct, single CLI worker,
  cross-LLM worker/verifier, and dual-provider packet-authoring loops.
- Added command descriptor and entry path safety checks for shell interpolation, newlines,
  unsupported entry files, and path escape.
- Added Conductor ledger/read-model event recording and query for selection, entry
  metadata, delegation grants, routing decisions, worker output refs, adjudication, and
  approval decisions.
- Added replay allowlist coverage for Conductor read-model events.
- Added explicit delegation lifecycle transitions and forged grant rejection.
- Added Human direct approval hard-stop validation and trusted human-decision requirement.
- Tightened evidence prerequisite validation so only `verified_by_harness` statuses pass.
- Expanded worker routing output to full WorkerTaskEnvelope-shaped records.
- Added worker output ref and Conductor adjudication read-model helpers.
- Hardened adapter artifact path validation with real-path resolution for symlink escape
  protection.
- Wired command descriptor diagnostics into provider execution readiness so unsafe argv or
  shell execution cannot reach `ready` state.

## Changed Files
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/provider_orchestration.py`
- `starter/standard-harness/_harness/test/test_conductor_routing_loop.py`
- `starter/standard-harness/_harness/test/test_provider_neutral_orchestration.py`
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/workflows/planner.md`
- `reference/packets/PKT-07_CONDUCTOR_SURFACE_AND_CLI_WORKER_ROUTING_LOOP.md`
- `reference/reports/artifact-sync/PKT-07_CONDUCTOR_SURFACE_AND_CLI_WORKER_ROUTING_LOOP.md`

## Validation Evidence
- TDD RED: `reference/reports/tdd/PKT-07-red.md`
- TDD GREEN: `reference/reports/tdd/PKT-07-green.md`
- Latest focused test evidence: 10 Conductor tests passed.
- Latest provider-neutral orchestration regression: 14 tests run; 13 passed with 1 symlink-permission skip.
- Latest starter regression: 69 tests passed, 1 symlink-permission skip.
- Starter installed-runtime validation: pass, status `ok`.
- Root harness validation: pass after task-packet artifact registration repair and
  generated-state sync; `npm run harness:validate` returned `ok: true`, findings empty.

## Known Residuals
- The provider-neutral worker loop remains a harness contract/read-model implementation.
  It does not launch real Codex CLI or Claude Code CLI processes in PKT-07.
- One symlink escape regression is skipped on Windows when symlink creation is not
  available to the current process.
