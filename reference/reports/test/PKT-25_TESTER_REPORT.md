# PKT-25 Tester Report

Packet: `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT`
Route: `Developer -> Tester`
Date: 2026-07-01
Tester disposition: pass, ready to return to Orchestrator for Reviewer routing

## Evidence Read
- Active packet: `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`
- Developer report: `reference/reports/developer/PKT-25_DEVELOPER_REPORT.md`
- TDD evidence: `reference/reports/tdd/PKT-25-provider-topology-red-green.md`
- Changed implementation: `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- Changed tests: `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- Changed docs: `starter/standard-harness/_harness/README.md`

## Verification Commands
| Check | Command | Result |
|---|---|---|
| Focused provider topology tests | `PYTHONPATH=system py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness` | pass, `Ran 15 tests ... OK` |
| Root regression | `npm.cmd test` from repo root | pass, `492 pass / 0 fail` |
| Root harness state validation | `npm.cmd run harness:sync-state` after `developer-to-tester` transition | pass, workflow gate open for Tester verification, 0 blockers |
| Payload-boundary command | `npm.cmd run harness:payload-boundary` from development repo root | expected scope failure; command treated root dev harness as clean payload and found root generated state |
| Actual starter top-level contamination check | `Get-ChildItem starter\standard-harness -Force` | pass; only `_harness`, `_ops`, `product`, `README.md`, `START_HERE.md` present |
| Actual starter forbidden generated-state check | recursive search for `AGENTS.md`, `ACTIVE_CONTEXT.*`, `VALIDATION_REPORT.*`, `operating_state.sqlite` files | pass; no actual files found |
| Adapter id/doc parity check | `rg "claude-code-cli-local" starter\standard-harness reference\packets\PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md` | pass; no stale adapter id matches |

## Acceptance Verification
| Acceptance | Tester status |
|---|---|
| A1 project conductor recorded | pass; topology evidence fixture records Codex conductor |
| A2 all six roles assignable | pass; focused test asserts project_manager, planner, developer, documenter, tester, reviewer |
| A3 no hard-coded Reviewer=claude_code under codex/codex topology | pass; focused regression passes with topology-derived Codex Reviewer |
| A4 default reviewer behavior preserved | pass; existing compatibility tests pass inside focused suite |
| A5 invalid declarations fail closed | pass; unsupported, blank, and conflicting provider declarations block before capture validation |
| A6 captured evidence envelope | pass; evidence envelope includes topology schema, role assignments, reviewer ids/lenses, aliases, and non-approval boundary |
| A7 Conductor does not grant approval authority | pass; no approval-state mutation path added and root regression remains green |
| A8 starter boundary validation | pass with actual starter file checks; root-scoped payload-boundary command failure is documented as command-scope mismatch |
| A9 Codex conductor with independent packet role providers | pass; fixture covers Codex conductor and mixed packet roles |
| A10 two independent mixed-provider Reviewers | pass; fixture keeps `reviewer_a` and `reviewer_b` separate by id/lens/provider |

## Tested Scope
- Normal behavior: topology-derived role routing and evidence envelope generation.
- Error behavior: unsupported, blank, and conflicting provider declarations fail closed.
- Regression behavior: legacy no-topology default and delegated-approval boundaries continue to pass.
- Documentation parity: starter README and packet examples no longer use stale `claude-code-cli-local` adapter id.
- Starter boundary: actual starter tree contains no root `AGENTS.md` or generated runtime state artifacts.

## Untested Scope
- Real authenticated Codex CLI or Claude Code CLI provider readiness is not tested and remains out of PKT-25 scope.
- Release, publish, starter promotion, UAT, and productization readiness are not tested.
- PKT-26 closeout-ledger consumption is not tested in this packet.

## Findings
No blocking Tester findings.

Non-blocking note: `npm run harness:payload-boundary` failed when run from the root development harness because it interpreted the root as the reusable payload and found legitimate root generated state. Tester used actual `starter/standard-harness` file checks to validate the PKT-25 starter boundary.

## Route Recommendation
Return to Orchestrator for Reviewer routing. Reviewer should evaluate the payload-boundary command-scope note, confirm the actual starter boundary evidence is sufficient for PKT-25, and perform the required four closeout review lenses before Planner closeout.

## Remediation Verification 1
Reviewer hold evidence remediated:
- `reference/reports/review/PKT-25-closeout-challenge-review.md`
- `reference/reports/review/PKT-25-closeout-adversarial-security-review.md`
- `reference/reports/review/PKT-25_REVIEW_REPORT.md`

Commands:
| Check | Command | Result |
|---|---|---|
| Focused provider topology remediation suite | `PYTHONPATH=system py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness` | pass, `Ran 18 tests ... OK` |
| Correct scoped starter clean-export validation | `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 -m standard_harness.cli.main --json --harness-root .. validate --starter --clean-export` from `starter/standard-harness/_harness` after deleting generated `__pycache__` | pass, `diagnostics=[]`, `status=ok` |
| Root regression | `npm.cmd test` from repo root | pass, `492 pass / 0 fail` |

Updated Tester disposition: pass. The prior A8 payload-boundary/root-scope note is superseded by correct scoped `validate --starter --clean-export` evidence. Return to Orchestrator for Reviewer rerun.

## Remediation Verification 2
Security rerun evidence:
- `reference/reports/review/PKT-25-closeout-adversarial-security-review-rerun.md`

Developer remediation verified:
- Assignment-field validation now fails closed on unknown nested fields such as `approvalStateMutationAllowed`.
- Normalized provider topology assignments retain only whitelisted topology contract fields.
- CLI-level negative test proves `provider-topology record` rejects nested authority-looking fields before persistence.

Commands:
| Check | Command | Result |
|---|---|---|
| Focused provider topology suite | `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness` | pass, `Ran 19 tests ... OK` |
| Correct scoped starter clean-export validation | `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 -m standard_harness.cli.main --json --harness-root .. validate --starter --clean-export` from `starter/standard-harness/_harness` after deleting generated `__pycache__` | pass, `diagnostics=[]`, `status=ok`, `cleanExportProof=true` |
| Root regression | `npm.cmd test` from repo root | pass, `492 pass / 0 fail` |
| Harness validation | `npm.cmd run harness:validate` from repo root | pass, `ok=true`; existing PKT-24 high-risk warning remains non-blocking for PKT-25 |

Updated Tester disposition: pass. Return to Orchestrator for Reviewer rerun.

## Remediation Verification 3
Challenge/code-quality rerun evidence:
- `reference/reports/review/PKT-25-closeout-challenge-review-final.md`
- `reference/reports/review/PKT-25-closeout-code-quality-review.md`

Developer remediation verified:
- Captured role assignments now include `evidenceRef` in `providerTopologyEvidence.roleAssignments`.
- Captured-output validation rejects reviewer lens mismatches and topology-declared evidenceRef mismatches.
- `workerAliases` now fail closed on unsupported alias keys and unknown nested fields before persistence.
- Normalized worker aliases retain only allowed topology alias fields.
- Adapter manifest records are generated from the topology provider policy mapping.

Commands:
| Check | Command | Result |
|---|---|---|
| Focused provider topology suite | `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness` | pass, `Ran 21 tests ... OK` |
| Correct scoped starter clean-export validation | `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 -m standard_harness.cli.main --json --harness-root .. validate --starter --clean-export` from `starter/standard-harness/_harness` | pass, `diagnostics=[]`, `status=ok`, `cleanExportProof=true` |
| Root regression | `npm.cmd test` from repo root | pass, `492 pass / 0 fail` |
| Harness validation | `npm.cmd run harness:validate` from repo root | pass, `ok=true`; existing PKT-24 high-risk warning remains non-blocking for PKT-25 |

Updated Tester disposition: pass. Return to Orchestrator for final Reviewer lens rerun.

## Remediation Verification 4
Code-quality rerun evidence:
- `reference/reports/review/PKT-25-closeout-code-quality-review-remediation3.md`

Developer remediation verified:
- Worker alias `role` values are canonicalized to stripped lowercase before persistence/reporting.
- Worker alias `reviewerId` values are stripped before persistence/reporting.
- Worker2 reviewer routing reads the same canonical interpretation used by validation and normalization.
- CLI persistence/reporting coverage proves whitespace-padded aliases are reported as canonical alias records.

Commands:
| Check | Command | Result |
|---|---|---|
| Focused provider topology suite | `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness` | pass, `Ran 21 tests ... OK` |
| Correct scoped starter clean-export validation | `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 -m standard_harness.cli.main --json --harness-root .. validate --starter --clean-export` from `starter/standard-harness/_harness` | pass, `diagnostics=[]`, `status=ok`, `cleanExportProof=true` |
| Root regression | `npm.cmd test` from repo root | pass, `492 pass / 0 fail` |
| Harness validation | `npm.cmd run harness:validate` from repo root | pass, `ok=true`; existing PKT-24 high-risk warning remains non-blocking for PKT-25 |

Updated Tester disposition: pass. Return to Orchestrator for Reviewer rerun against the post-remediation-4 code and evidence set.

## Remediation Verification 5
Code-quality rerun evidence:
- `reference/reports/review/PKT-25-closeout-code-quality-review-remediation4.md`

Developer remediation verified:
- Reviewer role assignment `reviewerId`, `reviewLens`, and `evidenceRef` values are canonicalized before persistence/reporting.
- Reviewer route metadata consumes the normalized reviewer assignment record instead of raw topology input.
- Worker2 reviewer selection compares reviewer ids with stripped canonical values.
- Real-smoke captured-output matching succeeds when topology reviewer assignment fields are whitespace-padded but captured Reviewer records are canonical.

Commands:
| Check | Command | Result |
|---|---|---|
| Focused provider topology suite | `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness` | pass, `Ran 22 tests ... OK` |
| Correct scoped starter clean-export validation | `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 -m standard_harness.cli.main --json --harness-root .. validate --starter --clean-export` from `starter/standard-harness/_harness` | pass, `diagnostics=[]`, `status=ok`, `cleanExportProof=true` |
| Root regression | `npm.cmd test` from repo root with Codex node runtime PATH | pass, `492 pass / 0 fail` |
| Harness validation report | `npm.cmd run harness:validation-report` from repo root with Codex node runtime PATH | pass, `gateDecision=pass`; existing PKT-24 high-risk warning remains non-blocking for PKT-25 |
| Harness state sync | `npm.cmd run harness:sync-state` after `developer-to-tester` transition | pass, workflow gate open for Tester verification, 0 blockers |

Updated Tester disposition: pass. Route to Reviewer for final four-lens closeout review against the post-remediation-5 code and evidence set.
