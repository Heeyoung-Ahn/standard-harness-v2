# PKT-25 Closeout Code Quality Review - Remediation 4

## Header
- Lens id: `code_quality_review`
- Agent id: not available in runtime; independent Codex reviewer lens
- Date: 2026-07-01
- Status: HOLD

## Sources Read
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/rules/agent_behavior.md`
- `.agents/runtime/ACTIVE_CONTEXT.json`
- `.agents/workflows/reviewer.md`
- `.agents/skills/feature-artifact-sync/SKILL.md`
- `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`
- `reference/reports/review/PKT-25-closeout-code-quality-review-remediation3.md`
- `reference/reports/review/PKT-25_REVIEW_REPORT.md`
- `reference/reports/review/PKT-25-closeout-challenge-review-remediation4.md`
- `reference/reports/review/PKT-25-closeout-challenge-review-rescope-final.md`
- `reference/reports/review/PKT-25-closeout-adversarial-security-review-remediation4.md`
- `reference/reports/developer/PKT-25_DEVELOPER_REPORT.md`
- `reference/reports/test/PKT-25_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-25-provider-topology-red-green.md`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `starter/standard-harness/_harness/README.md`

## Current Verification
- Focused provider topology suite: `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness` passed outside the sandbox after sandbox launcher failure: `Ran 21 tests in 3.342s`, `OK`.
- Custom reviewer-assignment canonicalization proof, using a temporary harness root and no repo file writes, returned: `{"diagnostics":["captured_output_record_missing:Reviewer:codex: reviewer_b "],"status":"execution_blocked"}`.
- Sandbox limitation: the first focused Python test launch failed with Windows `CreateProcessAsUserW failed: 5`; the command was rerun outside the sandbox with approval.

## Prior HOLD Disposition
- Prior `code_quality_review` HOLD: `reference/reports/review/PKT-25-closeout-code-quality-review-remediation3.md` held closeout because `workerAliases` validation and routing used different canonical forms. Exact judgment: accepted whitespace-padded alias `role` / `reviewerId` values could persist/report as valid but be ignored or fail to select the intended reviewer.
- Disposition after Remediation 4: resolved for `workerAliases`. Source confirms `_worker_alias_diagnostics` validates alias role/reviewer id with stripped canonical values, `_normalized_worker_aliases` persists `role.strip().lower()` and `reviewerId.strip()`, `_worker2_reviewer_id` routes with the same stripped/lowercase interpretation, and `test_cli_persists_and_reports_provider_topology` asserts whitespace-padded alias input reports as `{"role":"reviewer","reviewerId":"reviewer_b"}`.
- Planner/User A1/A9 rescope disposition: accepted for this code-quality lens. The packet, reviewer report, and rescope-final challenge lens now scope A1/A9 to packet-scoped topology records, not a separate project-start UI/init flow or project-scoped report independent of packet id.
- Remaining disposition: HOLD because the same accepted-raw-vs-canonical class still exists for reviewer assignment `reviewerId` / `reviewLens`, not for `workerAliases`.

## Findings

### CQ-01 - High - Reviewer assignment canonicalization still accepts raw values that can break routing and captured-output validation
- Severity: High, closeout-blocking code-quality issue.
- Source refs:
  - `conductor_worker_e2e.py:1070-1112` validates reviewer ids and lenses by stripped/nonblank values and duplicate ids by `reviewerId.strip()`.
  - `conductor_worker_e2e.py:1174-1188` normalizes topology assignments but copies allowed reviewer fields without canonicalizing `reviewerId`, `reviewLens`, or `evidenceRef`.
  - `conductor_worker_e2e.py:919-980` builds real-smoke role routes from the raw topology and forwards raw `reviewerId`, `reviewLens`, and `evidenceRef` into readiness metadata.
  - `conductor_worker_e2e.py:1418-1464` matches captured reviewer records by exact reviewer id and review lens.
  - `conductor_worker_e2e.py:1474-1500` only strips `expected_evidence_ref` during comparison; reviewer id and review lens are not canonicalized before exact matching.
  - `test_pkt14_conductor_worker_e2e.py:665-723` covers whitespace canonicalization only for `workerAliases.worker2`, not for reviewer role assignment fields.
- Evidence:
  - Existing suite passes, so the defect is not covered by current negative tests.
  - Custom proof with `roles.reviewer.reviewerId = " reviewer_b "` and canonical captured record `reviewer_id = "reviewer_b"` failed with `captured_output_record_missing:Reviewer:codex: reviewer_b `.
- Impact:
  - The validator accepts whitespace-padded reviewer assignment ids/lenses as valid logical values, but routing and captured-output validation use raw strings.
  - A copied project can persist/report a topology record as valid yet fail real-smoke capture matching for a reviewer whose canonical id is otherwise correct.
  - This repeats the prior maintainability defect pattern at a neighboring public contract surface and weakens A6/A10 confidence for reviewer evidenceRef/lens validation.
- Required action:
  - Canonicalize reviewer assignment `reviewerId` and `reviewLens` during topology normalization and role-route extraction, or reject non-canonical whitespace for these fields.
  - Apply the same decision consistently to CLI persistence/reporting, `providerTopologyEvidence`, captured-output route metadata, duplicate detection, and reviewer route selection.
  - Add focused negative/normalization tests for whitespace-padded `roles.reviewer.reviewerId` and `roles.reviewer.reviewLens`, including both CLI record/report and real-smoke captured-output validation.
- Required evidence:
  - Focused Python suite pass with new tests.
  - A custom or formal fixture proving canonical reviewer assignment ids/lenses route to canonical captured records.
  - Updated Developer/Tester evidence if remediation changes public normalization behavior.

## Code Quality Matrix
| Review area | Judgment | Evidence | Required action/evidence |
|---|---|---|---|
| Maintainability | HOLD | Provider topology logic is concentrated in `conductor_worker_e2e.py`, but canonicalization rules are split across diagnostics, normalization, routing, and capture matching. The split allowed CQ-01. | Centralize or consistently reuse canonical reviewer assignment values. |
| Module boundaries | PASS with limitation | CLI delegates validation and normalization to workflow topology helpers before event persistence (`cli/main.py:654-716`). | No new module split required for PKT-25; avoid adding more raw-field logic in CLI. |
| Duplication | PASS | Provider-to-adapter records are generated from `TOPOLOGY_PROVIDER_ADAPTER_IDS` for local adapter manifests and emitted evidence (`conductor_worker_e2e.py:23-30`, `:557-570`, `:1218-1230`). | None for current scope. |
| Error handling | PASS with limitation | Invalid topology, unknown fields, adapter mismatch, review lens mismatch, evidenceRef mismatch, unsafe descriptors, and bad capture payloads fail closed. CQ-01 is not an error-handling absence; it is inconsistent accepted input canonicalization. | Add fail-closed or canonicalized handling for padded reviewer assignment ids/lenses. |
| Transaction/state consistency | PASS | `provider-topology record` validates before `store.append_event`, persists an append-only `provider_topology.recorded` event, and `report` reads the latest event for the packet (`cli/main.py:654-716`). | None for packet-scoped rescope. |
| Testability | HOLD | Focused suite is strong and fast, but current tests cover alias whitespace only, leaving reviewer assignment whitespace untested. | Add tests described in CQ-01. |
| Negative case quality | HOLD | Negative cases cover unsupported providers, blank values, unknown roles/fields, duplicate reviewer ids, missing lens, alias fields, adapter mismatch, nested authority fields, reviewer lens mismatch, and evidenceRef mismatch. They miss accepted padded reviewer ids/lenses. | Extend negative/normalization matrix. |
| `workerAliases` canonicalization | PASS | Remediation 4 canonicalizes alias `role` and `reviewerId`; focused test asserts canonical CLI report output. | No further action for aliases. |
| Reviewer `evidenceRef` / lens validation | HOLD | `evidenceRef` mismatch is checked, and lens mismatch is checked for exact values, but accepted padded `reviewLens` / `reviewerId` can desynchronize route matching. | Canonicalize or reject non-canonical reviewer assignment fields before route/capture matching. |
| Provider adapter policy mapping | PASS | Adapter ids are normalized from `TOPOLOGY_PROVIDER_ADAPTER_IDS` rather than trusted from descriptor text. | None for current scope. |
| CLI persistence/reporting | HOLD | CLI persists normalized topology, but normalization currently preserves raw reviewer assignment fields while canonicalizing only provider/adapter and worker aliases. | Normalize reviewer fields before event persistence/reporting. |
| Regression risk | HOLD | Existing `Ran 21 tests ... OK` does not cover CQ-01; the custom proof demonstrates a realistic accepted-input regression. | Add coverage and rerun focused/root/starter checks after remediation. |

## Residual Risks And Limitations
- Real authenticated Codex CLI or Claude Code CLI provider readiness remains outside PKT-25 scope and is not proven by captured-output fixture tests.
- The A1/A9 challenge-review hold is treated as resolved only because Planner/User explicitly rescoped PKT-25 to packet-scoped topology records.
- Root `npm test`, root harness validation, and clean-export validation were not rerun by this lens; Tester and adversarial-security reports record those as passing where applicable. This lens reran the focused provider topology suite and performed one targeted custom proof.
- Existing worktree state contains multiple PKT-25 and PKT-26 changes. This review did not attempt to separate unrelated local state and did not modify implementation files.

## Final Disposition
HOLD.

The prior `workerAliases` canonicalization HOLD is resolved, and the Planner/User A1/A9 rescope is accepted for this lens. Closeout should still not pass because reviewer assignment `reviewerId` / `reviewLens` values remain accepted with whitespace but are routed and matched as raw strings. This is the same maintainability and state-consistency class as the Remediation 3 alias defect, now on the reviewer assignment contract surface.
