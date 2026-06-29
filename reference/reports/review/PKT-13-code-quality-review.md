# PKT-13 Code Quality Review

- Lens: `code_quality_review`
- Independent agent: James (`019f1453-fb06-7cc2-8edb-2e4c98d348dd`)
- Scope: read-only code-quality review for PKT-13.
- Status: block

## Findings

1. **High: Source discovery still performs broad raw evidence loading before bounded retrieval applies.**
   - Source refs: `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`, PKT-13 A3, and `reference/reports/memory/PKT-13-context-budget.md`.
   - Affected surface: memory source discovery and `operating-qa` CLI, because CLI calls discovery directly.
   - Weakness: discovery globs `_ops/evidence/**/*` and `reference/reports/validation/**/*`, then reads each matched file fully with `_read_text()` before the answer service enforces `max_sources` or `max_answer_chars`.
   - Required action: narrow discovery to structured indexes/manifests/summaries, avoid recursive raw evidence body reads, and add file type/size/path allowlists before content loading. Raw evidence should be referenced by pointer unless explicitly selected and bounded.
   - Required evidence: add a negative test with raw log/browser/large evidence files under `_ops/evidence/**` proving discovery does not read or summarize them.
   - Route recommendation: return through Orchestrator to Developer remediation, then Tester rerun of source-model/context-budget/negative-source tests and this code-quality lens.

## Review Notes

Module boundaries are mostly cohesive: source discovery, source index building, and answer shaping are centralized in `question_answering.py`, while CLI responsibility is thin and simple. Dependency direction is acceptable: CLI calls memory services; memory does not call CLI.

The main regression pressure is not scattered logic, but the discovery layer doing too much raw filesystem ingestion before the bounded read model exists.

Answer contract shape is stable enough for the current CLI wrapper. Reset policy is directionally consistent with `ops-reset`, but should be retested after the raw-loading fix because `_ops/evidence/**` is currently both resettable and broadly read.

## Residual Risk / Untested Scope

The packet-required security evidence path was absent when this lens ran. Tester explicitly leaves provider CLI E2E, friction automation, starter-promotion rehearsal, browser UI, and release/publish out of scope.

## Recommended Route

Orchestrator should route Developer remediation. Bound source discovery before raw reads, then rerun focused PKT-13 tests and closeout lenses. Reviewer should hold PKT-13 closeout until this is remediated or explicitly adjudicated.
