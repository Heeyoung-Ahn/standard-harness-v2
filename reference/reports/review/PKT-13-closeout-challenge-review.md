# PKT-13 Closeout Challenge Review

- Lens: `challenge_review`
- Independent agent: Darwin (`019f1453-8907-74f3-9889-a4018cffa69d`)
- Scope: read-only closeout challenge review for PKT-13.
- Status: block

## Findings

1. **Blocking - A3 bounded retrieval is not closed because discovery still broadly reads raw evidence bodies.**
   - Source refs: `reference/packets/PKT-13_OPERATING_INTELLIGENCE_AND_QA.md`, `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`, `starter/standard-harness/_harness/test/test_pkt13_operating_intelligence_qa.py`.
   - Challenged claim: `PKT-13-context-budget.md` and Tester report claim bounded retrieval/no raw evidence loading.
   - Weakness: `SOURCE_PATTERNS` matches all `_ops/evidence/**/*` and `reference/reports/validation/**/*`, then discovery reads each matched file body before answer-time `max_sources` is applied. The test only verifies source count trimming and a diagnostic, not that raw logs/full evidence bodies are avoided.
   - Required correction/evidence: restrict discovery to compact indexes/manifests or bounded selected files, add a negative fixture with large/raw evidence under `_ops/evidence/**`, and prove `operating-qa` does not read/load it unless explicitly selected and bounded.
   - Recommended route: Developer remediation, then Tester rerun for A3.

2. **Medium - PM operating-intelligence coverage is narrower than the scope/evidence wording.**
   - Source refs: PKT-13 packet, requirements, architecture guide, and `question_answering.py`.
   - Challenged claim: source model evidence says PM sources under `_ops/pmo/**` and `product/docs/pmo/**` are implemented.
   - Weakness: implementation only indexes Markdown PM files, while the SSOT emphasizes structured PM/WBS records such as JSON/YAML/TSV/CSV. Tests seed Markdown PM summaries only.
   - Required correction/evidence: either add structured PM/WBS source fixtures and answer evidence, or narrow the PKT-13 closeout claim with Planner-approved wording.
   - Recommended route: Planner if narrowing; Developer/Tester if preserving the broader PM source claim.

## Residual Risk / Untested Scope

PKT-13 does not appear to absorb PKT-14 provider CLI E2E or PKT-15 compound-loop/starter-promotion rehearsal. The packet and tester report keep those out of scope, and the reviewed PKT-13 memory/CLI/test changes do not add real provider CLI worker execution, automatic friction call-site integration, proposal promotion, or starter-promotion rehearsal.

Closeout cannot be claimed from this evidence set because security/adversarial review and final Reviewer adjudication were not present at the time of this lens, and the packet exit fields still had `pending`.

## Recommended Route

Hold closeout. Route the A3 raw-loading gap to Developer, then Tester. If PM structured-source coverage is intentionally out of PKT-13, route that wording/evidence boundary to Planner before Reviewer closeout.
