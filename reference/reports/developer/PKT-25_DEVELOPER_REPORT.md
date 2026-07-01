# PKT-25 Developer Report

Packet: `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT`
Route: `Orchestrator -> Developer`
Branch: `codex/pkt-25-provider-topology`
Date: 2026-07-01

## Scope Implemented
- Added topology-derived real-smoke routing for packet role assignments instead of relying on a hard-coded `Reviewer=claude_code` expectation.
- Added provider topology evidence envelope `standard-harness-provider-topology-evidence/v1` with project conductor, six logical role assignments, worker aliases, reviewer ids, review lenses, provider ids, adapter ids, evidence refs, and `approvalStateMutationAllowed=false`.
- Added mixed Reviewer routing so multiple Reviewer assignments remain separate by `reviewerId`, provider, and review lens.
- Added fail-closed validation for unsupported, blank, and conflicting topology provider declarations before capture validation runs.
- Preserved backward-compatible `reviewer_provider` fallback when no first-class topology is supplied.
- Updated copied-starter `_harness` README provider-topology example and boundary notes.

## Changed Surfaces
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `starter/standard-harness/_harness/README.md`
- `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`
- `reference/reports/tdd/PKT-25-provider-topology-red-green.md`

## TDD Evidence
- RED 1 reproduced the codex/codex reviewer mismatch: topology-declared Codex Reviewer still resulted in blocked capture behavior before implementation.
- GREEN 1 passed after deriving role providers from `providerTopology.packetTopology.roles`.
- RED 2 showed missing topology evidence envelope and missing fail-closed validation for invalid topology declarations.
- GREEN 2 passed after adding evidence envelope, six-role role matrix, mixed Reviewer separation, and topology diagnostics.
- Evidence path: `reference/reports/tdd/PKT-25-provider-topology-red-green.md`

## Developer Verification
| Command | Result |
|---|---|
| `py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness` with `PYTHONPATH=system` | pass, `Ran 15 tests ... OK` |
| `npm.cmd run harness:validate` from repo root | pass, `ok=true`, `gateDecision=pass`; existing PKT-24 high-risk warning remains non-blocking for PKT-25 |
| `npm.cmd test` from repo root | pass, `492 pass / 0 fail` |

## Acceptance Mapping
| Acceptance | Developer evidence |
|---|---|
| A1 project conductor recorded | `providerTopologyEvidence.projectTopology.conductor.provider=codex` fixture coverage |
| A2 six logical role assignments | `test_real_cli_reports_full_role_provider_matrix_and_mixed_reviewers` checks project_manager, planner, developer, documenter, tester, reviewer |
| A3 codex/codex reviewer mismatch fixed | `test_real_cli_consumes_packet_topology_for_codex_reviewer_without_string_override` |
| A4 no topology default preserved | existing backward-compatible default tests still pass |
| A5 invalid declarations fail closed | `test_real_cli_provider_topology_invalid_or_conflicting_fields_fail_closed` |
| A6 captured evidence envelope | topology evidence envelope assertions include schema, role assignments, reviewers, aliases, and approval boundary |
| A7 delegated approval boundary | existing delegated approval hard-stop regression remains in focused test suite |
| A8 starter boundary validation | README boundary notes plus root validation; no provider-specific entry contract added |
| A9 first Conductor Codex with independent packet roles | matrix fixture uses Codex conductor with Claude Code planner and Codex developer/tester |
| A10 mixed-provider Reviewers | matrix fixture keeps `reviewer_a` Claude Code and `reviewer_b` Codex separate |

## Handoff Recommendation
Status: ready for Tester verification.

Tester should read this report, the TDD report, the active packet, and the changed starter `_harness` surfaces directly. No known Developer blocker remains.

## Reviewer Remediation 1
Reviewer hold evidence:
- `reference/reports/review/PKT-25-closeout-challenge-review.md`
- `reference/reports/review/PKT-25-closeout-adversarial-security-review.md`
- `reference/reports/review/PKT-25_REVIEW_REPORT.md`

Remediation implemented:
- Added fail-closed topology validation for project conductor, unknown role keys, ambiguous non-reviewer role lists, duplicate reviewer ids, missing reviewer ids/lenses, invalid worker aliases, adapter/provider mismatches, and any mixed `reviewer_provider` plus `providerTopology` declaration.
- Normalized emitted topology evidence adapter ids from provider policy instead of trusting descriptor-supplied adapter text.
- Added `provider-topology record/report` CLI support backed by append-only operating-state events.
- Expanded role-provider matrix coverage so all six logical roles are asserted against both supported providers.
- Updated starter README with CLI persistence/reporting examples and fail-closed topology validation rules.

Remediation verification:
- `py -3 test\test_pkt14_conductor_worker_e2e.py`: pass, `Ran 18 tests ... OK`.

## Reviewer Remediation 2
Security rerun finding:
- `provider-topology record/report` could persist unknown nested assignment fields from untrusted topology JSON, including authority-looking fields such as `approvalStateMutationAllowed`.

Remediation implemented:
- Added fail-closed assignment-field validation in `conductor_worker_e2e.py`.
- Added whitelist normalization so persisted topology assignments retain only provider topology contract fields.
- Added CLI-level negative coverage proving nested `approvalStateMutationAllowed` is rejected before persistence.

Remediation verification:
- `PYTHONPATH=system py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness`: pass, `Ran 19 tests ... OK`.

## Reviewer Remediation 3
Challenge/code-quality rerun findings:
- A6 evidence envelope lacked per-captured-role `evidenceRef`, and reviewer lens mismatches were not fail-closed.
- `workerAliases` accepted unknown alias keys and nested authority-looking fields before persistence.
- Provider-to-adapter manifest records were duplicated instead of generated from one topology provider policy mapping.

Remediation implemented:
- Added captured-role `evidenceRef` emission in `providerTopologyEvidence.roleAssignments`.
- Added fail-closed reviewer lens mismatch and topology-declared `evidenceRef` mismatch diagnostics.
- Added `workerAliases` whitelist validation and normalization for allowed alias keys and fields only.
- Generated local adapter manifests from `TOPOLOGY_PROVIDER_ADAPTER_IDS` to avoid mirrored provider/adapter records.
- Added focused negative tests for alias authority fields, unknown alias keys, reviewer lens mismatch, and evidenceRef mismatch.

Remediation verification:
- `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness`: pass, `Ran 21 tests ... OK`.

## Reviewer Remediation 4
User-approved bounded remediation:
- User approved one more bounded Developer remediation for the `code_quality_review` finding.

Code-quality finding:
- `workerAliases` validation used stripped/canonical values, but normalization and routing could preserve or read raw whitespace-padded `role` / `reviewerId` values.

Remediation implemented:
- Canonicalized normalized worker alias `role` to stripped lowercase.
- Canonicalized normalized worker alias `reviewerId` to stripped value.
- Updated `worker2` reviewer routing to use the same stripped/lowercase interpretation.
- Added CLI persistence/reporting test coverage proving whitespace-padded aliases are reported in canonical form.

Remediation verification:
- `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness`: pass, `Ran 21 tests ... OK`.

## Reviewer Remediation 5
User-approved bounded remediation:
- User approved reviewer assignment canonicalization remediation and instructed the packet to proceed through closeout if verification and review pass.

Code-quality finding:
- Reviewer role assignment `reviewerId` and `reviewLens` accepted whitespace-padded values during validation, but route metadata and captured-output matching used raw strings.

Remediation implemented:
- Canonicalized reviewer assignment `reviewerId`, `reviewLens`, and `evidenceRef` during topology normalization.
- Updated reviewer route construction to consume normalized reviewer assignments.
- Updated worker2 reviewer selection to compare reviewer ids with stripped values.
- Added CLI record/report coverage proving reviewer assignment fields are reported in canonical form.
- Added real-smoke capture coverage proving padded reviewer assignment fields match canonical captured Reviewer records.

Remediation verification:
- RED: focused suite failed with raw ` reviewer_b ` report output and `execution_blocked` real-smoke status.
- GREEN: `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness`: pass, `Ran 22 tests ... OK`.
