# Standard Harness Final Product Goal Mode Prompt v1

Use this prompt in a fresh Codex goal-mode thread after the MVP and release-quality baseline are committed and pushed.

## Prompt

Create a goal with this objective:

```text
Implement the Standard Harness final-product deferred plan end to end from docs/implementation/standard-harness-final-product-deferred-implementation-plan-v1.md, including FP-00 through FP-13 and every Requirement Coverage Addendum sub-slice FP-01A, FP-01B, FP-07A, FP-07B, FP-07C, FP-08A, FP-09A, FP-09B, FP-09C, FP-10A, FP-13A, FP-13B, and FP-13C.
```

Start by reading these files:

- `docs/implementation/standard-harness-final-product-deferred-implementation-plan-v1.md`
- `docs/implementation/standard-harness-post-mvp-work-packets-v1.md`
- `docs/implementation/standard-harness-post-mvp-release-quality-plan-v1.md`
- `docs/requirements/standard-harness-final-product-requirements-v1.md`
- `docs/requirements/standard-harness-conformance-trace-v1.csv`
- `docs/requirements/standard-harness-mvp-final-product-requirement-report-v1.csv`
- `README.md`

Execution rules:

- Treat canonical harness state as event-sourced state, not generated Markdown.
- Preserve all MVP invariants already covered by the existing test suite.
- Use test-first implementation for each workstream where behavior changes are required.
- Complete one workstream at a time in FP-00 through FP-13 order unless a dependency requires a small prerequisite edit.
- For each workstream, run its focused tests and then `python -m unittest discover -s tests`.
- Commit after each completed workstream with a focused commit message.
- Do not create a final release tag without explicit Human Owner approval.
- Do not mark the goal complete while any requirement ID still has empty final-product workstream mapping, ambiguous evidence, or an unclosed addendum sub-slice.

Required closure evidence:

- All tests pass with `python -m unittest discover -s tests`.
- `docs/requirements/standard-harness-mvp-final-product-requirement-report-v1.csv` is refreshed to reflect implemented final-product coverage.
- All 260 final-product requirement IDs have current implementation status, final-product workstream mapping, evidence references, remaining gaps, and conformance score.
- `SH-LLM-001`, `SH-LLM-002`, and `SH-LLM-003` are implemented through FP-05, FP-07, FP-09, FP-10, and FP-13 coverage, not left as narrative-only requirements.
- `SH-HUMAN-004` distinguishes packet-level approval from non-delegable human decision enforcement.
- `SH-DEGRADE-001` covers unavailable optional providers, browser tools, cloud execution, dashboards, and remote agents with explicit blocked/manual fallback diagnostics.
- `SH-DOG-002` includes replay rebuild, waiver expiry/revocation, malicious adapter output, path escape, filesystem drift reconciliation, stale evidence propagation, and non-waivable gate tests.
- A final conformance report exists and cites test/evidence paths rather than unsupported prose.

Stop and ask for Human Owner input only for:

- final release tag approval
- irreversible Git history changes
- external credentials or services that cannot be mocked locally
- policy decisions where the plan explicitly names Human Owner approval as required

When context is compacted or the session resumes, continue from the latest unchecked workstream and re-run the focused tests for the current workstream before proceeding.
