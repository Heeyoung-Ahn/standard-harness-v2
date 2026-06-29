# PKT-13 Evidence Review

- Lens: `evidence_review`
- Independent agent: Carver (`019f1454-3f2e-7303-8bbb-423aa7ea7eca`)
- Scope: read-only evidence review for PKT-13.
- Status: block

## Findings

1. **Blocking: bounded retrieval/no raw evidence loading is not proven and appears contradicted by implementation.**
   - Source refs: PKT-13 A3, `reference/reports/memory/PKT-13-context-budget.md`, `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`, and `starter/standard-harness/_harness/test/test_pkt13_operating_intelligence_qa.py`.
   - Weakness: packet requires index-first retrieval and no broad raw evidence body loading. The evidence report claims raw logs/browser pages/full evidence bodies are not loaded, but implementation globs `_ops/evidence/**/*` and `reference/reports/validation/**/*`, then reads each matched file before source selection. The focused test only proves `max_sources=3` caps answer refs and emits `source_budget_limited`.
   - Required action: Developer should make discovery/indexing index-first or bounded for raw evidence paths, then Tester should add a raw/large evidence fixture proving it is not broadly read or claim-supporting without an explicit bounded selection.

2. **Blocking: required security/adversarial evidence is absent or misclassified.**
   - Source refs: PKT-13 required evidence path, PKT-13 verification requirement, and `.agents/artifacts/VALIDATION_REPORT.json`.
   - Weakness: PKT-13 requires `reference/reports/security/PKT-13-security-review.json` to pass or record Human-approved residual risk. That file was not present, and the validation report said `securityReview.contractStatus` was `not-applicable`, which conflicts with the packet's sensitive/stale/low-authority risk profile.
   - Required action: Orchestrator/Reviewer should collect required adversarial/security review evidence or route residual risk to the Human Owner; validation metadata should not mark this surface N/A while the packet requires it.

3. **High: reset/retention evidence overclaims retained-evidence behavior.**
   - Source refs: PKT-13 A5, expected negative fixture, Tester report, and reset test.
   - Weakness: the test proves `_ops/evidence` is removed, `product/docs/packets/.../closeout.md` remains, and QA fails closed after reset. It does not prove retained `reference/**` evidence or retained evidence fixtures survive reset and can be cited after regeneration, even though the Tester report claims retained `reference/**` and product evidence refs remain valid.
   - Required action: Tester should add retained-evidence fixtures and a post-regeneration citation assertion; Developer should adjust `resetPolicy.preservedPaths` or retained-evidence contract if the intended retained path set includes `reference/**`.

## What Is Proven

The evidence does prove several behavioral surfaces, not just file existence: answer contract fields and approval refusal, source-type/trust coverage, stale/low-authority/sensitive blocking, missing/fake evidence rejection, source-count limiting, clean starter fail-closed diagnostics, starter focused/full regression, and root validation separation. Root regression is correctly labeled structural/runtime evidence, not starter product proof.

## Residual Risk

Full copied-starter rehearsal remains deferred to PKT-15, so PKT-13 should avoid claiming copied-starter promotion proof beyond the starter command/test contract. The validation report parser limitations mean it should remain supporting root-state evidence only.

## Recommended Route

Return to Developer for bounded-retrieval/raw-load remediation, then Tester for retained-evidence and bounded-retrieval proof. Keep Reviewer closeout on hold until the missing PKT-13 security/adversarial evidence is produced or explicitly risk-accepted.
