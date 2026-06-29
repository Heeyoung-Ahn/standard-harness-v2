# PKT-15 Planner Packet Challenge Review

- Work item: `PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL`
- Packet: `reference/packets/PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL.md`
- Reviewer: Mill, independent explorer subagent `019f14d5-6be3-74f3-8976-e48fa87ff8c4`
- Review type: Planner Packet Challenge Review
- Authority: evidence only; not Ready For Code approval, implementation approval, closeout, release, residual-risk acceptance, or starter-promotion approval.

## Initial Findings

### Finding 1
- Severity: blocking
- Source ref: `.agents/artifacts/IMPLEMENTATION_PLAN.md` PKT-15 readiness; packet `Acceptance`
- Affected surface: PKT-15 acceptance and hardening matrix traceability
- Challenged claim: acceptance directly covers every PKT-15 hardening matrix row and requirement ID.
- Weakness: hardening rows and requirement IDs were listed in `Hardening Concern Coverage`, but A1-A8 did not carry row IDs or requirement IDs directly.
- Required correction: add acceptance trace matrix or annotate A1-A8 with exact hardening rows and requirement IDs.
- Recommended route: Planner correction and re-review before Ready For Code.

### Finding 2
- Severity: blocking
- Source ref: `.agents/artifacts/IMPLEMENTATION_PLAN.md` PKT-15 readiness; packet `Call-Site Matrix`
- Affected surface: automatic `RuntimeFrictionCapture` integration
- Challenged claim: call-site matrix is concrete enough for implementation and closeout review.
- Weakness: alternatives such as "or central validation runner" and "or canonical review evidence gate" left Developer discretion broad enough to miss real runtime paths.
- Required correction: resolve each required surface to canonical module/function targets, or split alternatives into explicit rows with selection criteria and Planner-return rule.
- Recommended route: Planner correction and re-review.

### Finding 3
- Severity: high
- Source ref: packet `Out Of Scope`, `A6`, and security scope
- Affected surface: copied-starter contamination forbidden-set coverage
- Challenged claim: full forbidden contamination set is covered.
- Weakness: A6 covered the Implementation Plan core set but did not explicitly name auth/session/cookie files, provider caches, raw transcripts, API-key-like files, and unredacted sensitive material.
- Required correction: add explicit copied-starter negative fixtures for these classes or bind them to named security/contamination evidence that blocks smoke pass.
- Recommended route: Planner correction; later security reviewer verifies expanded fixture set.

## Initial Checks Without Findings

- Promotion dry-run/copied-starter smoke is framed as rehearsal evidence, not approval.
- Actual starter promotion/release remains out of scope.

## Revision Disposition

Planner corrected the packet by adding an acceptance trace matrix, binding the Call-Site
Matrix to exact class/method targets with fixture IDs and a Planner-return rule, expanding
the contamination forbidden-set fixtures, and preserving the no-promotion/no-release
approval boundary.

## Final Re-Review

No findings after second pass.

Second-pass note: the final re-review checked the current packet file only. The remaining
Call-Site Matrix issue was resolved: the review row now names exact `ChallengeReviewService`
methods, and the closeout row names `CloseoutReportDocumenter.validate_report`. The
Planner-return rule remains present. The packet still preserves the approval boundary:
Ready For Code is pending, actual starter promotion/release/publish is not approved, and
PKT-15 is limited to rehearsal evidence.

## Final Disposition

Planner Packet Challenge Review status: pass. This is packet-quality evidence only and
does not approve Ready For Code, implementation, closeout, release, residual risk, or
starter promotion.
