# Standard Harness V2.1 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the audit gaps found after XP-01 through XP-10 so V2.1 can be evaluated as a release-ready operating contract instead of only a broad implementation candidate.

**Architecture:** Harden in dependency order: required skill completion, compound telemetry, auditable challenge review evidence, packaging/test reproducibility, and final release conformance. XP-10A must validate executable artifacts produced by earlier hardening XPs, not convert static metadata into a release pass.

**Tech Stack:** Python stdlib, `unittest`, SQLite-backed harness state, JSON-formatted YAML policy files, existing `tools/harness_cli.py`, and repository-local release scripts.

---

## Execution Rules

- Base branch: start from `codex/v21-xp-10` at commit `336aebf` or the latest reviewed descendant.
- Work one hardening XP at a time.
- Use one branch per hardening XP:
  - `codex/v21-xp-07a-required-skills`
  - `codex/v21-xp-09a-compound-hardening`
  - `codex/v21-xp-processa-challenge-evidence`
  - `codex/v21-xp-packaginga-release-hygiene`
  - `codex/v21-xp-10a-release-gate-hardening`
- Each branch is created from the previous hardening branch HEAD unless the Human Owner explicitly requests independent branches.
- Before each branch:
  - Run `git status --short`.
  - Run `python -m unittest discover -s tests`.
  - If the full suite fails because `.harness/state/harness.sqlite3` exists in the repo root, stop and ask for approval to move ignored local runtime state outside the repo before continuing.
  - If the full suite fails for any tracked-code reason, stop and report.
- Use TDD: write focused failing tests, confirm RED, implement minimal code, confirm GREEN, run full regression.
- Commit only intended files for the current hardening XP.
- Do not copy v1 `.agents`, `.harness`, plugin, runtime, generated-state, or starter payload content.

## Hardening Completion Rule

The hardening work must not convert missing implementation into static metadata-only pass conditions. Every release-blocking validator catalog entry must point to an importable implementation, a gate ID, gate metadata, at least one negative test, and a reachable validation path.

Challenge Review evidence must be audit evidence, not a synthetic pass note. Each review report must identify reviewed commit, changed files, focused test result, full regression result, challenge loop count, findings, fixes, unresolved findings, and final decision. Any `pass-with-follow-up` decision must link to a concrete hardening XP or issue.

HR-200 metrics must be generated from state, event, evidence, gate, closeout, wiki, friction, or context records, or from an explicit deterministic projection artifact with a source watermark. Synthetic input tests are allowed as unit tests but cannot be the only release evidence.

Release archives must be based on tracked source files, not recursive filesystem snapshots. Generated state, local runtime state, bytecode, virtualenvs, and temporary files must be excluded by construction.

Additional execution constraints:

- Any test using `tempfile.TemporaryDirectory()` must import `tempfile`.
- Challenge Review reports should use structured JSON-compatible front matter when practical. Validators must check structured fields, not generic prose.
- Release archive validation must prove generated files are excluded and required release artifacts are included as tracked source files.
- Validator catalog implementation paths must reference real importable class or function symbols. If an existing validator is function-based or has an incompatible shape, add a thin adapter class or function with a stable `validate()` entrypoint instead of inventing a catalog path.

## File Responsibility Map

### XP-07A Required Skill Completion

- `_harness/catalog/skill-catalog.yaml`: canonical V2.1 required skill catalog, including all seven minimum required skills.
- `_harness/catalog/minimum-required-skills.yaml`: frozen XP-00/XP-00A source list.
- `src/standard_harness/skills/internal/registry.py`: internal executable or manual-fallback skill registry.
- `src/standard_harness/skills/catalog.py`: catalog loading and minimum-skill coverage helpers.
- `src/standard_harness/skills/router.py`: route all minimum required skills through catalog evidence contracts.
- `src/standard_harness/cli/main.py`: implement `skill-route` and `handoff-prompt` commands if still declared by the CLI.
- `_harness/requirements/hr-coverage-matrix.yaml`: move HR-130R to complete only after all acceptance tests pass.
- `_harness/requirements/traceability-matrix.yaml`: record XP-07A artifacts and tests.
- `tests/contract/test_required_skill_catalog_completion.py`: missing minimum skill must fail.
- `tests/contract/test_skill_router_minimum_skills.py`: router must recognize every minimum required skill.
- `tests/contract/test_handoff_skill_cli_commands.py`: declared CLI commands must not fall through to `not_implemented`.
- `tests/contract/test_unknown_skill_is_blocked.py`: unknown required skill must block.
- `tests/contract/test_skill_route_preserves_p0_gate_boundary.py`: skill routes must not bypass release-blocking P0 gates.
- `tests/contract/test_every_required_skill_has_hr_trace.py`: every minimum skill must be traceable to HR-130R.

### XP-09A Compound Telemetry And Metrics Hardening

- `_harness/schemas/friction-signal.schema.json`: canonical runtime friction signal schema.
- `_harness/schemas/metric-signal.schema.json`: canonical runtime metric signal schema.
- `_harness/schemas/starter-promotion-candidate.schema.json`: align with XP-00A seed intent or document a validated migration.
- `src/standard_harness/self_improvement/recurring.py`: generate canonical `friction.signal` records and detect recurrence by `signalType`.
- `src/standard_harness/self_improvement/friction.py`: persist or expose schema-conformant friction signals.
- `src/standard_harness/self_improvement/starter_promotion.py`: validate evidence-linked starter promotion candidates.
- `src/standard_harness/metrics/success.py`: compute and write HR-200 metrics.
- `_ops/metrics/hr200-success-metrics.json`: generated deterministic release evidence artifact.
- `tests/contract/test_friction_signal_schema_conformance.py`
- `tests/contract/test_starter_promotion_candidate_schema_conformance.py`
- `tests/contract/test_success_metrics_hr200_required_fields.py`
- `tests/contract/test_success_metrics_written_to_ops_metrics.py`
- `tests/contract/test_success_metrics_include_source_watermark.py`

### XP-ProcessA Challenge Review Evidence

- `docs/reviews/v21/xp-01-challenge-review.md` through `docs/reviews/v21/xp-10-challenge-review.md`.
- `docs/reviews/v21/hardening/xp-07a-challenge-review.md`
- `docs/reviews/v21/hardening/xp-09a-challenge-review.md`
- `docs/reviews/v21/hardening/xp-processa-challenge-review.md`
- `docs/reviews/v21/hardening/xp-packaginga-challenge-review.md`
- `docs/reviews/v21/hardening/xp-10a-challenge-review.md`
- `src/standard_harness/validation/challenge_review_evidence.py`: deterministic validator for structured report fields.
- `_harness/policies/validator-catalog.yaml`: add `challenge-review-evidence-validator`.
- `tests/contract/test_challenge_review_evidence_required.py`
- `tests/contract/test_challenge_review_requires_commit_and_test_evidence.py`
- `tests/contract/test_challenge_review_blocks_unresolved_major.py`
- `tests/contract/test_challenge_review_loop_limit.py`

### XP-PackagingA Release Hygiene

- `.gitignore`: exclude generated runtime/cache artifacts.
- `.gitattributes`: normalize text files for cross-platform review.
- `tools/release_archive.py`: collect tracked release source files with `git ls-files`.
- `tools/run_full_regression.py`: run full regression with timeout and deterministic last-test reporting.
- `docs/release/release-packaging-hygiene-v21.md`: document clean archive rules.
- `docs/release/final-product-docs-command-inventory-v1.md`: add packaging/regression commands.
- `tests/contract/test_release_packaging_hygiene.py`
- `tests/contract/test_full_regression_runner_contract.py`
- `tests/contract/test_release_archive_uses_tracked_files_only.py`
- `tests/contract/test_release_archive_excludes_untracked_temp_files.py`
- `tests/contract/test_full_regression_runner_records_last_test.py`

### XP-10A Final Release Gate Hardening

- `_harness/policies/validator-catalog.yaml`: expand to every HR-190R deterministic validator required by V2.1.
- `src/standard_harness/validation/catalog.py`: expose required-validator coverage and importability checks.
- `src/standard_harness/completion/v21_conformance.py`: block on missing catalog entries, partial release HRs, missing challenge evidence, missing compound telemetry, missing HR-191 metadata, and missing HR-200 metric fields.
- `src/standard_harness/validation/aggregator.py`: keep `validate_all()` for development/general validation and add `validate_release()`.
- `src/standard_harness/cli/main.py`: add `validate --v21-conformance` and `validate --release`.
- `docs/release/v21-conformance-report.md`: expand into release evidence report.
- `docs/manual/standard-harness-v21-development-scenario.md`: add concrete V2.1 product packet journey.
- `docs/manual/standard-harness-runbook-v21.md`: link scenario and release validation commands.
- `tests/contract/test_v21_conformance_blocks_missing_validator_catalog_entries.py`
- `tests/contract/test_v21_conformance_blocks_partial_required_hr.py`
- `tests/contract/test_v21_conformance_blocks_missing_compound_metrics.py`
- `tests/contract/test_validate_release_runs_v21_conformance.py`
- `tests/contract/test_v21_development_scenario_documented.py`
- `tests/contract/test_release_archive_contains_required_release_docs.py`
- `tests/contract/test_v21_conformance_reads_generated_hr200_metrics_artifact.py`
- `tests/contract/test_validator_catalog_entries_have_importable_implementations.py`
- `tests/contract/test_validator_catalog_entries_have_negative_tests.py`
- `tests/contract/test_release_blocking_validators_are_reachable_from_release_validation.py`

---

## Task 0: Preflight And Local State Isolation

- [ ] Confirm branch and status:

```powershell
git branch --show-current
git status --short
```

Expected current branch before the hardening sequence starts:

```text
codex/v21-xp-10
```

- [ ] Run baseline regression:

```powershell
python -m unittest discover -s tests
```

Expected:

```text
Ran 290 tests
OK
```

If this fails with `test_state_kernel.py` because `.harness/state/harness.sqlite3` exists, stop and ask the Human Owner before moving or deleting local generated state.

---

## Task 1: XP-07A Required Skill Completion

**Branch:** `codex/v21-xp-07a-required-skills`

- [ ] Add failing tests:

```powershell
python -m unittest tests.contract.test_required_skill_catalog_completion tests.contract.test_skill_router_minimum_skills tests.contract.test_handoff_skill_cli_commands tests.contract.test_unknown_skill_is_blocked tests.contract.test_skill_route_preserves_p0_gate_boundary tests.contract.test_every_required_skill_has_hr_trace
```

Expected before implementation: fail because only one required skill is cataloged and unknown-skill/P0-boundary/HR-trace behavior is incomplete.

- [ ] Implement all seven required skills with `taskTypes`, `permissionScope`, `evidenceContract`, `fallbackBehavior`, registry entries, router support, and CLI support.
- [ ] Block unknown required skills with `unknown_required_skill`.
- [ ] Ensure all skill route results include `evidenceRequired: true` and do not set `bypassesP0Gate`.
- [ ] Update HR-130R coverage only after every route/fallback/evidence/trace test passes.
- [ ] Verify:

```powershell
python -m unittest tests.contract.test_required_skill_catalog_completion tests.contract.test_skill_router_minimum_skills tests.contract.test_handoff_skill_cli_commands tests.contract.test_unknown_skill_is_blocked tests.contract.test_skill_route_preserves_p0_gate_boundary tests.contract.test_every_required_skill_has_hr_trace
python tools\harness_cli.py --json validate --requirements-metadata
python -m unittest discover -s tests
```

- [ ] Commit:

```powershell
git add _harness/catalog/skill-catalog.yaml _harness/requirements/hr-coverage-matrix.yaml _harness/requirements/traceability-matrix.yaml src/standard_harness/skills src/standard_harness/cli/main.py tests/contract/test_required_skill_catalog_completion.py tests/contract/test_skill_router_minimum_skills.py tests/contract/test_handoff_skill_cli_commands.py tests/contract/test_unknown_skill_is_blocked.py tests/contract/test_skill_route_preserves_p0_gate_boundary.py tests/contract/test_every_required_skill_has_hr_trace.py
git commit -m "Harden XP-07A required skill routing"
```

---

## Task 2: XP-09A Compound Telemetry And Metrics Hardening

**Branch:** `codex/v21-xp-09a-compound-hardening`

- [ ] Add failing tests:

```powershell
python -m unittest tests.contract.test_friction_signal_schema_conformance tests.contract.test_starter_promotion_candidate_schema_conformance tests.contract.test_success_metrics_hr200_required_fields tests.contract.test_success_metrics_written_to_ops_metrics tests.contract.test_success_metrics_include_source_watermark
```

Expected before implementation: fail because friction/starter-promotion output and HR-200 metrics are not schema/state-backed enough.

- [ ] Make `friction_signal_from_record()` emit schema-conformant fields:

```json
{
  "eventType": "friction.signal",
  "sourceXp": "XP-02",
  "signalType": "missing_evidence",
  "severity": "high",
  "observedAtGate": "evidence-trust-gate",
  "evidenceIds": ["ev-001"],
  "dedupeKey": "XP-02:evidence-trust-gate:missing_evidence",
  "preventableByHarness": true,
  "candidateFixType": "validator",
  "remediationTarget": "evidence-trust"
}
```

- [ ] Expand `candidateFixType` or add `remediationTarget` so skill, handoff, context, evidence, test, workflow, and starter-promotion remediations are representable.
- [ ] Align starter promotion candidate schema with source XP, source, proposed change, expected benefit, risk, harness packet requirement, promotion status, and evidence IDs.
- [ ] Add `SuccessMetricsReporter.write_state_backed_report(repo_root, source_records)` that writes `_ops/metrics/hr200-success-metrics.json` with `metricId: HR-200`, required metrics, and `sourceWatermark`.
- [ ] Verify:

```powershell
python -m unittest tests.contract.test_friction_signal_schema_conformance tests.contract.test_starter_promotion_candidate_schema_conformance tests.contract.test_success_metrics_hr200_required_fields tests.contract.test_success_metrics_written_to_ops_metrics tests.contract.test_success_metrics_include_source_watermark
python tools\harness_cli.py --json validate --requirements-metadata
python -m unittest discover -s tests
```

- [ ] Commit:

```powershell
git add _harness/schemas/friction-signal.schema.json _harness/schemas/starter-promotion-candidate.schema.json _harness/requirements/hr-coverage-matrix.yaml _harness/requirements/traceability-matrix.yaml src/standard_harness/self_improvement src/standard_harness/metrics/success.py tests/contract/test_friction_signal_schema_conformance.py tests/contract/test_starter_promotion_candidate_schema_conformance.py tests/contract/test_success_metrics_hr200_required_fields.py tests/contract/test_success_metrics_written_to_ops_metrics.py tests/contract/test_success_metrics_include_source_watermark.py
git commit -m "Harden XP-09A compound telemetry"
```

---

## Task 3: XP-ProcessA Challenge Review Evidence

**Branch:** `codex/v21-xp-processa-challenge-evidence`

- [ ] Add failing tests:

```powershell
python -m unittest tests.contract.test_challenge_review_evidence_required tests.contract.test_challenge_review_requires_commit_and_test_evidence tests.contract.test_challenge_review_blocks_unresolved_major tests.contract.test_challenge_review_loop_limit
```

Expected before implementation: fail because structured review artifacts and validator are missing.

- [ ] Implement `ChallengeReviewEvidenceValidator` using JSON-compatible front matter. Required fields:

```json
{
  "xpId": "XP-01",
  "reviewedCommit": "c3e3c9e",
  "reviewedFiles": ["src/standard_harness/domain/packets.py"],
  "focusedTestCommand": "python -m unittest tests.contract.test_v02_packet_schema",
  "focusedTestResult": "passed",
  "fullRegressionCommand": "python -m unittest discover -s tests",
  "fullRegressionResult": "passed",
  "challengeLoopCount": 1,
  "findings": [
    {"severity": "major", "status": "resolved-by-follow-up", "summary": "Runtime release gates were weaker than static V2.1 coverage."}
  ],
  "unresolvedFindings": [],
  "fixesApplied": ["Covered by XP-10A release gate hardening."],
  "followUpHardeningXp": "XP-10A",
  "finalDecision": "pass-with-follow-up"
}
```

- [ ] Block if:
  - front matter is absent,
  - required fields are missing,
  - `challengeLoopCount > 3`,
  - `finalDecision=pass` with unresolved blocker/major findings,
  - `pass-with-follow-up` lacks one of XP-07A, XP-09A, XP-ProcessA, XP-PackagingA, XP-10A.
- [ ] Add original XP and hardening XP review reports.
- [ ] Register `challenge-review-evidence-validator` in validator catalog.
- [ ] Verify:

```powershell
python -m unittest tests.contract.test_challenge_review_evidence_required tests.contract.test_challenge_review_requires_commit_and_test_evidence tests.contract.test_challenge_review_blocks_unresolved_major tests.contract.test_challenge_review_loop_limit
python tools\harness_cli.py --json validate --requirements-metadata
python -m unittest discover -s tests
```

- [ ] Commit:

```powershell
git add docs/reviews/v21 src/standard_harness/validation/challenge_review_evidence.py _harness/policies/validator-catalog.yaml _harness/requirements/hr-coverage-matrix.yaml _harness/requirements/traceability-matrix.yaml tests/contract/test_challenge_review_evidence_required.py tests/contract/test_challenge_review_requires_commit_and_test_evidence.py tests/contract/test_challenge_review_blocks_unresolved_major.py tests/contract/test_challenge_review_loop_limit.py
git commit -m "Add XP challenge review evidence gate"
```

---

## Task 4: XP-PackagingA Release Hygiene

**Branch:** `codex/v21-xp-packaginga-release-hygiene`

- [ ] Add failing tests:

```powershell
python -m unittest tests.contract.test_release_packaging_hygiene tests.contract.test_full_regression_runner_contract tests.contract.test_release_archive_uses_tracked_files_only tests.contract.test_release_archive_excludes_untracked_temp_files tests.contract.test_full_regression_runner_records_last_test
```

Expected before implementation: fail because tracked-source archive and deterministic last-test reporting do not exist.

- [ ] Implement `tools/release_archive.py` using:

```python
subprocess.run(["git", "ls-files", "-z"], cwd=root, check=True, capture_output=True)
```

- [ ] Exclude `.harness/state`, `__pycache__`, `*.pyc`, caches, and local build outputs.
- [ ] Implement `tools/run_full_regression.py` with command:

```python
[sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"]
```

- [ ] Add `last_test_from_output()` so timeout/failure diagnostics include the last started test id.
- [ ] Add `.gitattributes` for line-ending normalization.
- [ ] Document packaging rules in `docs/release/release-packaging-hygiene-v21.md`.
- [ ] Verify:

```powershell
python -m unittest tests.contract.test_release_packaging_hygiene tests.contract.test_full_regression_runner_contract tests.contract.test_release_archive_uses_tracked_files_only tests.contract.test_release_archive_excludes_untracked_temp_files tests.contract.test_full_regression_runner_records_last_test
python tools\harness_cli.py --json validate --requirements-metadata
python -m unittest discover -s tests
```

- [ ] Commit:

```powershell
git add .gitignore .gitattributes tools/release_archive.py tools/run_full_regression.py docs/release/release-packaging-hygiene-v21.md docs/release/final-product-docs-command-inventory-v1.md tests/contract/test_release_packaging_hygiene.py tests/contract/test_full_regression_runner_contract.py tests/contract/test_release_archive_uses_tracked_files_only.py tests/contract/test_release_archive_excludes_untracked_temp_files.py tests/contract/test_full_regression_runner_records_last_test.py
git commit -m "Harden V2.1 release packaging hygiene"
```

---

## Task 5: XP-10A Final V2.1 Release Gate Hardening

**Branch:** `codex/v21-xp-10a-release-gate-hardening`

- [ ] Add failing tests:

```powershell
python -m unittest tests.contract.test_v21_conformance_blocks_missing_validator_catalog_entries tests.contract.test_v21_conformance_blocks_partial_required_hr tests.contract.test_v21_conformance_blocks_missing_compound_metrics tests.contract.test_validate_release_runs_v21_conformance tests.contract.test_v21_development_scenario_documented tests.contract.test_release_archive_contains_required_release_docs tests.contract.test_v21_conformance_reads_generated_hr200_metrics_artifact tests.contract.test_validator_catalog_entries_have_importable_implementations tests.contract.test_validator_catalog_entries_have_negative_tests tests.contract.test_release_blocking_validators_are_reachable_from_release_validation
```

Expected before implementation: fail because final conformance is still static and catalog/release validation are not executable enough.

- [ ] Expand `validator-catalog.yaml`. Each release-blocking entry must include:

```json
{
  "validatorId": "evidence-trust-validator",
  "hrIds": ["HR-040R", "HR-041R", "HR-042R", "HR-043", "HR-044", "HR-045", "HR-190R"],
  "gateId": "evidence-trust-gate",
  "implementation": "standard_harness.validation.evidence_trust:EvidenceTrustValidator",
  "cliEntrypoint": "validate --release",
  "negativeTests": [
    "tests.contract.test_evidence_trust_model_v02",
    "tests.evals.test_manual_only_evidence_cannot_closeout"
  ],
  "reachableFrom": ["validate --release", "validate --v21-conformance"],
  "releaseBlocking": true,
  "gateResultMetadata": {
    "gateId": "evidence-trust-gate",
    "validatorId": "evidence-trust-validator",
    "policyVersion": "0.2.0"
  }
}
```

- [ ] Use real importable class/function symbols. Add thin adapter classes/functions when existing validators do not expose a stable `validate()` entrypoint.
- [ ] Strengthen `V21ConformanceGate` to block on:
  - missing release-blocking catalog entry,
  - missing importable implementation,
  - missing negative tests,
  - missing `reachableFrom: validate --release`,
  - missing gate metadata,
  - partial release HR without approved non-applicability,
  - missing original/hardening Challenge Review evidence,
  - missing or incomplete HR-200 metrics artifact,
  - missing required release archive artifacts.
- [ ] Add `ValidationService.validate_release()` and CLI `validate --release`.
- [ ] Keep `validate --all` as development/general validation unless the Human Owner explicitly accepts release failures during normal development validation.
- [ ] Add `docs/manual/standard-harness-v21-development-scenario.md` covering:
  - product-feature packet creation,
  - test-first flow,
  - trusted evidence,
  - E2E/review/security/refactor gates,
  - wiki proposal/apply,
  - handoff/context,
  - friction/metric signals,
  - `validate --all`,
  - `validate --v21-conformance`,
  - `validate --release`.
- [ ] Expand `docs/release/v21-conformance-report.md` with XP commits, HR coverage, validator catalog, gate metadata, focused tests, full regression, Challenge Review evidence, compound metrics, migration/compatibility, residual risks, and release decision.
- [ ] Verify:

```powershell
python -m unittest tests.contract.test_v21_conformance_blocks_missing_validator_catalog_entries tests.contract.test_v21_conformance_blocks_partial_required_hr tests.contract.test_v21_conformance_blocks_missing_compound_metrics tests.contract.test_validate_release_runs_v21_conformance tests.contract.test_v21_development_scenario_documented tests.contract.test_release_archive_contains_required_release_docs tests.contract.test_v21_conformance_reads_generated_hr200_metrics_artifact tests.contract.test_validator_catalog_entries_have_importable_implementations tests.contract.test_validator_catalog_entries_have_negative_tests tests.contract.test_release_blocking_validators_are_reachable_from_release_validation
python tools\harness_cli.py --json validate --requirements-metadata
python tools\harness_cli.py --json validate --v21-conformance
python tools\harness_cli.py --json validate --release
python tools\harness_cli.py --json validate --all
python -m unittest discover -s tests
```

- [ ] Commit:

```powershell
git add _harness/policies/validator-catalog.yaml _harness/requirements/hr-coverage-matrix.yaml _harness/requirements/traceability-matrix.yaml src/standard_harness/validation/catalog.py src/standard_harness/completion/v21_conformance.py src/standard_harness/validation/aggregator.py src/standard_harness/cli/main.py docs/release/v21-conformance-report.md docs/manual/standard-harness-v21-development-scenario.md docs/manual/standard-harness-runbook-v21.md tests/contract/test_v21_conformance_blocks_missing_validator_catalog_entries.py tests/contract/test_v21_conformance_blocks_partial_required_hr.py tests/contract/test_v21_conformance_blocks_missing_compound_metrics.py tests/contract/test_validate_release_runs_v21_conformance.py tests/contract/test_v21_development_scenario_documented.py tests/contract/test_release_archive_contains_required_release_docs.py tests/contract/test_v21_conformance_reads_generated_hr200_metrics_artifact.py tests/contract/test_validator_catalog_entries_have_importable_implementations.py tests/contract/test_validator_catalog_entries_have_negative_tests.py tests/contract/test_release_blocking_validators_are_reachable_from_release_validation.py
git commit -m "Harden XP-10A V2.1 release conformance"
```

---

## Final Verification

After XP-10A commit:

```powershell
python tools\harness_cli.py --json validate --requirements-metadata
python tools\harness_cli.py --json validate --v21-conformance
python tools\harness_cli.py --json validate --release
python tools\harness_cli.py --json validate --all
python tools\run_full_regression.py
python -m unittest discover -s tests
git status --short
```

Final report must include:

- changed files by hardening XP
- branch and commit hash per hardening XP
- focused test command and result per hardening XP
- full regression result
- requirements metadata result
- V2.1 conformance result
- release validation result
- HR-130R disposition
- HR-190R validator catalog disposition
- HR-191 gate metadata disposition
- HR-200 compound metrics disposition
- Challenge Review evidence disposition
- packaging hygiene disposition
- residual risks

## Self-Review Checklist

- [ ] HR-130R is not marked complete from catalog ID presence alone; route, fallback, evidence contract, unknown-skill block, P0 boundary, and HR trace are verified.
- [ ] HR-200 release evidence is state-backed or projection-backed and includes a source watermark.
- [ ] Challenge Review evidence identifies commit, files, focused test, full regression, loop count, findings, fixes, unresolved findings, and final decision.
- [ ] Validator catalog entries are importable, have negative tests, include gate metadata, and are reachable from `validate --release`.
- [ ] Release archive collection is based on tracked source files, not recursive filesystem snapshots.
- [ ] No task copies v1 payload, v1 runtime, `.agents`, `.harness`, plugin, generated state, or starter payload content.
- [ ] Every hardening XP has focused tests, full regression, metadata validation, and one focused commit.
