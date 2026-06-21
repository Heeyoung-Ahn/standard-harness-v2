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

Stop and ask for Human Owner input when required by the implementation plan, including:

- final release tag approval
- irreversible Git history changes
- external credentials or services that cannot be mocked locally
- policy decisions where the plan explicitly names Human Owner approval as required

Additional execution guardrails:

Before starting FP-00:

1. Run the current baseline test suite:

```powershell
python -m unittest discover -s tests
```

2. If the existing MVP/post-MVP baseline tests fail before any final-product change, stop and report the failing tests. Do not begin final-product implementation on a broken baseline.

3. Run `git status --short` and record the starting dirty state. Do not mix unrelated pre-existing changes into workstream commits.

4. Inspect `docs/requirements/standard-harness-mvp-final-product-requirement-report-v1.csv` and create or update a focused integrity test that verifies:

- exactly 260 requirement IDs are present
- every `requirement_id` is unique
- every requirement has non-empty final-product workstream mapping
- every workstream code is one of `FP-00` through `FP-13` or an explicitly named addendum sub-slice
- all addendum sub-slices `FP-01A`, `FP-01B`, `FP-07A`, `FP-07B`, `FP-07C`, `FP-08A`, `FP-09A`, `FP-09B`, `FP-09C`, `FP-10A`, `FP-13A`, `FP-13B`, and `FP-13C` are represented in implementation evidence
- no requirement remains `conformance_level=unmapped_review_required` unless `review_resolution_notes` explains the final disposition
- `SH-LLM-001`, `SH-LLM-002`, and `SH-LLM-003` each have implemented coverage evidence through `FP-05`, `FP-07`, `FP-09`, `FP-10`, and `FP-13`
- `SH-HUMAN-004` has explicit non-delegable human decision enforcement evidence, not only approval record evidence
- `SH-DEGRADE-001` has tests/evidence for unavailable optional providers, browser tools, cloud execution, dashboards, and remote agents
- `SH-DOG-002` has tests/evidence for replay rebuild, waiver expiry/revocation, malicious adapter output, path escape, filesystem drift reconciliation, stale evidence propagation, and non-waivable gates
- `SH-INHERIT-001` through `SH-INHERIT-004` are closed through the final inheritance traceability matrix

5. Correct the FP-00 RED/GREEN order:

- write the coverage test first
- run it and confirm RED
- create the conformance slice document
- run it again and confirm GREEN

6. For each addendum sub-slice, do not treat the parent FP workstream as complete until the addendum has:

- at least one focused test file
- implemented service/module behavior
- event-sourced persistence or a documented reason why no state is needed
- evidence references in the refreshed requirement report
- no unsupported narrative-only closure

7. Normalize waiver module placement before implementation:

- use `src/standard_harness/waivers/lifecycle.py` as the canonical waiver lifecycle implementation
- do not duplicate waiver lifecycle logic across `policy/waivers.py` and `waivers/lifecycle.py`

8. Do not introduce external runtime dependencies, browser automation packages, cloud SDKs, dashboard frameworks, or non-standard-library libraries unless:

- the plan explicitly requires it
- a dependency-intake packet is created
- source, license, install behavior, side effects, network behavior, trust tier, rollback path, and validation evidence are recorded
- Human Owner approval is obtained when the plan's stop conditions require it

9. Preserve all implementation-plan stop conditions. Stop and ask for Human Owner input if:

- external dependency intake is needed
- cloud credentials, device credentials, browser account login, or secret material are required
- a schema migration cannot preserve existing MVP state
- a final-product feature would weaken Kernel invariants
- dashboard or cloud work would become the only audit source
- signing, retention, privacy, legal, compliance, or enterprise policy behavior requires a policy decision
- automatic Git repair would change source files without explicit approval
- final release tag approval is required
- irreversible Git history changes are required

10. For every workstream closeout, record:

- changed files
- focused test command and result
- full test command and result
- requirement IDs closed or updated
- addendum sub-slices closed, if any
- remaining gaps, if any
- commit hash or a clear reason why commit could not be created

11. Do not mark the goal complete unless:

- `python -m unittest discover -s tests` passes
- the final requirement report is refreshed
- all 260 requirements have implemented status, workstream mapping, evidence references, remaining gaps, and conformance score
- no planned evidence reference remains purely planned for requirements claimed as implemented
- evidence references point to actual files, tests, reports, or machine-readable diagnostics
- the final conformance report cites concrete test/evidence paths
- `git status --short` shows no unintended changes
- no final release tag is created without explicit Human Owner approval

When context is compacted or the session resumes, continue from the latest unchecked workstream and re-run the focused tests for the current workstream before proceeding.
