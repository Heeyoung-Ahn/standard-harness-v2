# PKT-22 Closeout Code Quality Review

Packet: `PKT-22_DESIGN_PROJECTION_AND_BROWSER_VALIDATION_FOUNDATION`
Lens: `code_quality_review`
Verdict: PASS
Reviewed at: 2026-07-01 after second remediation

## Scope Reviewed
- `starter/standard-harness/_harness/system/standard_harness/design/projection.py`
- `starter/standard-harness/_harness/system/standard_harness/validation/planning_hardening.py`
- `starter/standard-harness/_harness/test/test_pkt22_design_projection_contract.py`
- `reference/packets/PKT-22_DESIGN_PROJECTION_AND_BROWSER_VALIDATION_FOUNDATION.md`
- `reference/reports/test/PKT-22_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-22-green.md`
- `reference/reports/security/PKT-22-security-review.json`

## Findings
No blocking or non-blocking code-quality findings.

## Evidence Checked
- Focused command run by this lens:

```text
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt22_design_projection_contract.py"
.............
----------------------------------------------------------------------
Ran 13 tests in 0.002s

OK
```

- Recorded Tester evidence also reports focused PKT-22 tests passing at 13 tests, PKT-16 regression passing at 11 tests, full starter regression passing at 176 tests with 1 skipped, starter validation passing, and root validation passing with only the already-owned PKT-23 warning.
- `reference/reports/tdd/PKT-22-green.md` records the same 13-test focused GREEN evidence and the 176-test full starter regression.
- `reference/reports/security/PKT-22-security-review.json` records the second-remediation authority, prompt-like, sensitive-text, and PKT-23 boundary checks as pass.

## Code Quality Judgment
PASS. The PKT-22 design projection validator is still a small deterministic module under `standard_harness.design`, and `PlanningHardeningValidator` consumes it through two narrow functions: `validate_design_projection` and `validate_packet_design_trace` (`planning_hardening.py:8`, `planning_hardening.py:452`, `planning_hardening.py:473`, `planning_hardening.py:498`). This keeps design-projection validation separate from the broader planning-hardening rules while preserving existing `DiagnosticRecord` output.

The second-remediation authority scanner is maintainable for the current contract. The exact claim set covers explicit authority claims, while `FORBIDDEN_AUTHORITY_TEXT_PATTERN` covers natural-language nested text in both authority-first and action-first order (`projection.py:9`, `projection.py:30`). Recursive text collection through `_iter_text_values` is localized and testable (`projection.py:302`, `projection.py:351`). The newly verified test `test_plural_nested_authority_text_is_flagged` covers the prior adversarial gap: `requirements are approved`, `bypasses packets`, `approval gates are bypassed`, and `creates requirements` (`test_pkt22_design_projection_contract.py:109`).

`PlanningHardeningValidator` integration now avoids the earlier early-return bug. UI/design packets with no `designProjections` and no `designTrace` are still checked through `validate_packet_design_trace(_design_trace_packet_payload(packet, {}, False))` before returning (`planning_hardening.py:452` through `planning_hardening.py:456`). The payload includes tags, packet type, change zones, and design-artifact status (`planning_hardening.py:919` through `planning_hardening.py:925`), which is enough to catch a UI-tagged harness-system packet without blocking non-UI packets. The focused tests cover both directions at `test_planning_hardening_fails_ui_design_packet_with_no_design_fields` and `test_planning_hardening_allows_non_ui_packet_with_no_design_fields` (`test_pkt22_design_projection_contract.py:160`, `test_pkt22_design_projection_contract.py:174`).

## Second Remediation Disposition
The prior adversarial finding was valid and is now closed for code-quality purposes:

| Prior issue | Current evidence | Disposition |
|---|---|---|
| Nested text allowed plural `requirements are approved`. | Regex uses `requirements?`; focused test asserts diagnostic. | closed |
| Nested text allowed `bypasses packets`. | Regex uses `packets?` and `bypass(?:es|ed)?`; focused test asserts diagnostic. | closed |
| Nested text allowed `approval gates are bypassed`. | Regex uses `approval gates?`; focused test asserts diagnostic. | closed |
| Nested text allowed `creates requirements`. | Action-first regex branch covers create/promote/approve/close/bypass before authority target; focused test asserts diagnostic. | closed |

## PKT-23 Boundary
PASS. PKT-22 does not implement locked reusable UI module contracts. It only rejects PKT-23-owned locked-module fields as out of scope through `locked_module_contract_out_of_scope` (`projection.py:44`, `projection.py:221`, `projection.py:343`). The test `test_locked_module_contract_fields_are_out_of_scope_for_pkt22` covers `doNotChangeRules` and `visualReference` (`test_pkt22_design_projection_contract.py:123`). This is the correct boundary: PKT-23 still owns allowed variants, do-not-change rules, visual references, responsive behavior, interaction states, used-by screen enforcement, and lock enforcement semantics.

## Maintainability And Regression Risk
- The regex is intentionally conservative and localized. If future packets need richer policy language, the next improvement should be a tokenized authority phrase table, but that is not required to close PKT-22.
- Required-field checks remain explicit tuple/set declarations, which is acceptable for this schema-sized validator and keeps negative fixtures easy to read.
- No new third-party dependency, runtime service, file-system side effect, or generated-state write path was introduced by the reviewed code.
- Remaining risk is bounded to future vocabulary expansion for projection authority phrases; current packet acceptance and adversarial probes are covered by focused tests.

## Closeout Recommendation
Proceed to Reviewer adjudication for PKT-22 once the remaining independent lenses are current and pass. This `code_quality_review` does not approve release, publish, starter promotion, product UI implementation, actual browser capture, residual-risk acceptance, User UAT, productization-complete, or PKT-23 locked-module enforcement.

## Structured Behavior Verification
- Verification type: test
- Status: pass
- Focused behavior evidence: `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt22_design_projection_contract.py"` -> 13 tests pass.
- Integration behavior evidence: `PlanningHardeningValidator` UI/design no-design-fields failure and non-UI no-design-fields pass are covered by focused tests.
- Regression behavior evidence: recorded Tester evidence reports full starter regression at 176 tests pass, 1 skipped.
- Acceptance mapping: A1-A7 code behavior is mapped in `reference/reports/test/PKT-22_TESTER_REPORT.md`.
