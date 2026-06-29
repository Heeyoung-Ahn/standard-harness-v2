# PKT-14 Developer Report

- Work item: `PKT-14_CONDUCTOR_WORKER_E2E`
- Workflow: Developer
- Status: implementation ready for Tester route

## Implemented
- Added copied-starter `conductor-worker-e2e` CLI command.
- Added `ConductorWorkerE2ERunner` fixture E2E service over existing Conductor routing,
  provider orchestration ledger, output envelope validation, Conductor output refs, and
  adjudication records.
- Added deterministic fixture worker/verifier output envelopes for Codex-style Developer
  and Claude Code-style Reviewer paths.
- Added real CLI smoke guardrails:
  - missing explicit approval returns `manual_required`;
  - unsafe command descriptors return `execution_blocked`;
  - missing timeout/cancel/non-interactive/current-snapshot/local-auth readiness returns
    `execution_blocked`;
  - trusted captured output can pass through the worker/verifier/adjudication evidence path
    only when all readiness preconditions are explicit, the capture artifact is under
    `_ops/capture/**` with a matching SHA-256, and distinct role/provider/adapter captured
    output records are successful;
  - missing, failed, or timed-out captured output records return `execution_blocked`;
  - inline caller-supplied capture records and sensitive captured material return
    `execution_blocked`;
  - fixture mode always reports `realCliEvidenceStatus=not_applicable`.
- Added evidence-index `memorySources` discovery so worker E2E evidence is queryable
  without generating ad hoc `_ops/wiki`, `_ops/friction`, `_ops/risks`, or `_ops/decisions`
  prose and without granting gate authority.
- Added root `.gitignore` protection for generated `starter/standard-harness/_ops/`
  runtime evidence.

## Review Remediation
- Routed real CLI readiness through `ProviderOrchestrationPolicy.prepare_execution` instead
  of runner-local command validation.
- Moved unsafe command descriptor blocking ahead of CLI availability when a descriptor is
  provided, so unsafe descriptors cannot fall through to manual-required.
- Added packet-id validation before `_ops/evidence/<packet-id>` paths are constructed.
- Extended unsafe descriptor coverage to newline, pipe, redirect, subshell/interpolation,
  and `shell: true`; provider policy now rejects `>` and `<` tokens.
- Replaced the initial trusted-boolean real-smoke pass branch with role/provider-specific
  captured output record validation, hash-verified harness capture artifact provenance,
  sensitive-material rejection, and captured envelope/artifact generation.
- Removed runner synthesis of `_ops/wiki`, `_ops/friction`, `_ops/risks`, and
  `_ops/decisions`; operating QA now reads `memorySources` from the generated evidence
  index.

## Changed Files
- `.gitignore`
- `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
- `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/provider_orchestration.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_provider_neutral_orchestration.py`

## Verification
- Focused PKT-14 tests: pass, 11 tests.
- Conductor routing regression: pass, 10 tests.
- Provider-neutral orchestration regression: pass, 14 tests, 1 skipped.
- Long-memory question answering regression: pass, 8 tests.
- PKT-13 operating intelligence QA regression: pass, 10 tests.
- Full starter Python regression: pass, 134 tests, 1 skipped.
- Root validation: pass, 0 findings.
- Root Node regression: pass, 483 tests.
- Fixture CLI: pass.
- Operating QA query: pass.

## Residual Risk
- Real authenticated Codex CLI / Claude Code CLI smoke execution was not performed. A
  local attempt to generate CLI evidence using a `codex exec --json` descriptor was blocked
  by the execution approval layer as potential provider-tool use and was not bypassed.
- The implementation supports trusted captured-output ingestion under explicit readiness
  preconditions; that path is verified by unit regression, not by live provider execution.
