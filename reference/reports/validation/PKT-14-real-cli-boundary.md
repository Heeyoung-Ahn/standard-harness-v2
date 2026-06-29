# PKT-14 Real CLI Boundary Evidence

- Work item: `PKT-14_CONDUCTOR_WORKER_E2E`
- Scope: real provider CLI smoke boundary
- Status: pass with explicit captured-evidence and manual-required boundaries

## Commands
- `py -3 starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness conductor-worker-e2e --packet PKT-14 --mode real-smoke`
  - Exit code: 0
  - Result status: `manual_required`
  - `realCliEvidenceStatus`: `manual_required`
  - Diagnostics: `real_cli_smoke_requires_explicit_approval`
- `py -3 starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness conductor-worker-e2e --packet PKT-14 --mode fixture`
  - Exit code: 0
  - Result status: `pass`
  - `realCliEvidenceStatus`: `not_applicable`
  - Diagnostics: `fixture_mode_real_cli_not_attempted`
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"`
  - Exit code: 0
  - Result: pass, 11 tests.
  - Positive captured path coverage:
    `test_real_cli_captured_smoke_records_worker_verifier_path`.
  - Captured path expectation: explicit approval, CLI availability, timeout,
    cancellation support, non-interactive capture, current input snapshot, external
    authentication, a hash-verified `_ops/capture/**` harness capture artifact, and
    distinct role/provider/adapter capture records for Developer/Codex and
    Reviewer/Claude Code.
  - Negative captured path coverage:
    `test_real_cli_capture_records_are_required_per_role_provider` and
    `test_real_cli_failed_or_timeout_capture_cannot_pass`.
  - Sensitive-material coverage:
    `test_real_cli_rejects_inline_or_sensitive_capture_material`.

## Boundary Decision
No unauthenticated or implicit Codex CLI / Claude Code CLI smoke is attempted. The runner
now supports a trusted captured-output path only when readiness preconditions are explicit
and safe, and only when a hash-verified harness capture artifact under `_ops/capture/**`
provides role/provider-specific captured output records with successful exit status,
non-timeout status, command argv, artifact content, and evidence id. Inline caller-supplied
records and sensitive captured material are blocked before persistence. Otherwise it
returns `manual_required` or `execution_blocked`.

An attempted local CLI evidence generation using a descriptor shaped as `codex exec --json`
was blocked by the execution approval layer as potential provider-tool use. That block is
accepted and not bypassed. The implementation-level positive captured path is therefore
covered by unit regression, while fixture CLI evidence remains clearly marked
`realCliEvidenceStatus=not_applicable`.

## Fixture Evidence Trace
- Fixture evidence-index path:
  `starter/standard-harness/_ops/evidence/PKT-14/conductor-worker-e2e/evidence-index.json`
- SHA-256:
  `79CB3B91B65063EACD252298A2FA6898DF4D350E83F50ADDFA7C0D0D2B915415`
