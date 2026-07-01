# PKT-25 / PKT-26 A-Lane Source Summary

Workflow: Planner
Status: repo-bound source summary for Ready-For-Code preparation
Raw external source: `C:\tmp\survey-starter-review\reference\artifacts\REVIEW_REPORT.md`

## Purpose
Record the A-lane E2E lessons needed by PKT-25 and PKT-26 in a repo-bound artifact so
packet reviews do not depend on a disposable `C:\tmp` path.

## Source Summary
- The A-lane E2E surfaced a hard-coded `Reviewer=claude_code` expectation in real-smoke
  readiness even when the requested topology was Conductor=`codex`, Worker 1=`codex`,
  Worker 2=`codex`.
- A local `reviewer_provider=codex` override demonstrated the intended behavior target,
  but that override was ad hoc and must be replaced by a manifest-backed topology
  contract.
- The A-lane closeout evidence showed credible behavior evidence while the strict
  evidence -> claim -> gate -> review -> adjudication -> closeout ledger chain remained
  incomplete.
- Retrospective packet-doc review evidence must remain historical evidence only. It
  cannot satisfy the pre-RFC packet-doc review timing requirement for future packets.
- Wrapper-level approval or delegated command output must not override persisted blocked
  closeout state.

## Packet Mapping
| Lesson | Packet owner | Required planning effect |
|---|---|---|
| `Reviewer=claude_code` hardcoding | PKT-25 | Add topology-derived reviewer provider resolution and fail-first regression. |
| Ad hoc `reviewer_provider=codex` override | PKT-25 | Replace string override with schema, manifest, CLI, evidence envelope, and validation contract. |
| Need to assign roles per packet across Codex CLI and Claude Code CLI | PKT-25 | Require packet-scoped role-provider matrix coverage for PM, Planner, Developer, Documenter, Tester, and Reviewer. |
| Mixed-provider review requirement | PKT-25, consumed by PKT-26 | Require separate reviewer ids, lenses, provider ids, and evidence references. |
| Incomplete closeout support chain | PKT-26 | Productize ledger records for evidence, claims, gates, reviews, adjudication, and Planner closeout. |
| Retrospective packet-doc review timing gap | PKT-26 | Add negative fixture that retrospective review cannot satisfy pre-RFC review. |
| Wrapper-approved vs persisted-blocked mismatch | PKT-26 | Persisted closeout state is the effective decision. |

## Authority Boundary
- This summary is packet-planning source evidence only.
- It does not approve implementation, Ready For Code, closeout, release, productization,
  real provider readiness, or residual-risk acceptance.
- If future implementation needs raw A-lane transcript details beyond the summarized
  lessons above, the raw source must be re-imported into a repo-bound evidence path before
  being treated as implementation evidence.
