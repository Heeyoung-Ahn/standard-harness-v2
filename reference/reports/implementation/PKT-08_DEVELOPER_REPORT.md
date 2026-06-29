# PKT-08 Developer Report

- Packet: `PKT-08_RISK_ADAPTIVE_FAST_PATH_AND_EVIDENCE_VALIDATION`
- Developer route: Orchestrator -> Developer
- Implementation status: complete for Developer scope

## Changed Behavior
- `packet-preflight` now selects independent closeout review burden by risk:
  - strict closeout remains four passing independent lenses for high/core/contract/harness-system routes;
  - low-risk fast-path closeout can use one or more passing independent behavior-verification lenses;
  - omitted low-risk fast-path lenses require explicit N/A rationale and evidence path.
- Closeout lens evidence now rejects stale, untrusted, failed, unresolved, marker-only, file-existence-only, prose-only, and packet-local passing-lens evidence.
- Low-risk fast path closeout now derives changed-file evidence from trusted git worktree diff when available and fails closed when runtime, approval, security, release, data, schema, or harness-system paths are changed.
- Low-risk fast path is blocked when effective route classification is promoted to `packet-path`, even if packet metadata requested `fast-path`.
- Evidence paths and packet paths are now repository-bound by `path.relative` containment checks rather than string-prefix checks.
- Starter validation now fails closed when `.git` exists but actual changed-file inspection errors, instead of falling back to packet-supplied changed-file metadata.
- Packet authoring guidance now describes risk-adaptive independent lens evidence instead of a fixed four-lens rule for every packet.

## Root Contract Updates
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/workflows/reviewer.md`
- `.agents/workflows/orchestrator.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`

## Starter Updates
- `starter/standard-harness/_harness/policies/gate-profiles.yaml`
- `starter/standard-harness/_harness/system/standard_harness/validation/review_governance.py`
- `starter/standard-harness/_harness/test/test_independent_review_governance.py`

## Tests And Validation
- RED: `reference/reports/tdd/PKT-08-red.md`
- GREEN: `reference/reports/tdd/PKT-08-green.md`
- Targeted root: `node.exe --test .\.harness\test\packet-preflight.test.js` -> 41 passed, 0 failed.
- Starter targeted: `python.exe -m unittest starter.standard-harness._harness.test.test_independent_review_governance` -> 10 passed, 0 failed.
- Regression root: `node.exe --test .\.harness\test\dev05-tooling.test.js` -> 58 passed, 0 failed.
- Starter validation: `python.exe starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness validate --starter --installed-runtime` -> ok.
- Root validator: `node.exe .\.harness\runtime\state\harness-cli.js validate` -> ok.
- PKT-08 closeout preflight after Developer evidence: expected hold only on missing strict independent closeout review lenses.

## Security Evidence
- `reference/reports/security/PKT-08-security-review.json`
- Decision: pass.
- Residual risk: low after deterministic tests; closeout still requires independent review-lens evidence.

## Notes
- `npm run harness:validate` was not used as final evidence because this Windows session's npm shim cannot find `node`; the same harness validator was executed directly with the bundled Node runtime.
