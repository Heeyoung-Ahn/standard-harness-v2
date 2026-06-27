# Retrospective

Use this skill during Planner closeout when completed work produced repeated friction, remediation loops, review/test gaps, operator confusion, or a candidate lesson for `PREVENTIVE_MEMORY.md`. It helps turn closeout learning into bounded notes or promotion candidates without making preventive memory a live route authority.

Harness friction means the tokens or repeated actions spent operating the harness exceed the actual project work, or repeated actions are needed only to satisfy harness structure rather than move the project outcome forward.

## Use When
- Planner closeout needs to decide whether completed work produced a durable lesson.
- A packet had repeated remediation, review findings, test gaps, state-sync friction, operator confusion, or a recurring quality issue.
- An observation may belong in `PREVENTIVE_MEMORY.md` but needs promotion-threshold checking first.
- Planner closeout should append a bounded `Promotion Candidates` entry when a completed packet produced evidence-backed harness friction.
- Packet authoring or registration required repeated structural rewrites, especially when preflight passed but later registration semantic checks failed.
- A retrospective should produce a note-only outcome because evidence is too thin for promotion.

## Do Not Use When
- There is no completed packet, completed work item, or closeout target.
- The issue is a one-off observation with no source evidence and no repeated-friction pattern.
- The request would approve implementation, close a packet, change approval state, promote a preventive rule, or implement a real harness improvement.
- The request would edit `Active Preventive Rules`, mark a candidate `approved` or `promoted`, or treat a candidate as implementation approval.
- The skill would copy root maintainer history into `standard-template`.
- The skill would become a mandatory step or unconditional read requirement.

## Required Inputs
- Completed packet or work item path.
- Relevant Tester, Reviewer, validation, or closeout evidence.
- Observed friction, quality issue, or lesson candidate.
- Applicable `PREVENTIVE_MEMORY.md` promotion rules.
- Root versus `standard-template` boundary when starter guidance is involved.

## Retrospective Shape
Report in this order:
1. Keep: what should continue because it worked.
2. Improve: what caused friction, risk, rework, or confusion.
3. Try: a bounded experiment or follow-up candidate.
4. Promotion candidate, or non-promotion rationale.
5. Recommended route.

## Promotion Candidate Fields
Only draft a promotion candidate when repeated-friction evidence exists.

Each candidate must include:
- Trigger: the repeated situation that should activate the rule.
- Preventive Rule: the durable behavior to follow.
- Check Method: how the rule can be verified later.
- Target Layer: core, optional profile, project packet, or note-only.
- Evidence / Source: packet, review, walkthrough, validation, or user source.
- Promotion Status: proposed, pending-review, approved, rejected, or promoted.
- Linked Follow-Up Item: concrete packet/item, or none with reason.

## Candidate Append Rule
During Planner closeout, this skill may append a bounded entry to `.agents/artifacts/PREVENTIVE_MEMORY.md` under `## Promotion Candidates` when all of these are true:

- The completed packet or closeout evidence shows harness friction, remediation loops, review/test gaps, operator confusion, or another reusable process lesson.
- The candidate has explicit trigger, impact, source evidence, target layer, promotion status, and follow-up/disposition fields.
- The candidate uses `Promotion Status: proposed` unless the user has already approved a different candidate disposition in the same closeout.

Appending a candidate is memory capture only. It does not authorize implementation, baseline changes, starter changes, workflow changes, validator changes, or active-rule promotion.

## Non-Promotion Rule
If the issue is useful but does not meet the repeated-friction threshold, record it as note-only with the reason:
- one-off
- evidence too thin
- impact too low
- belongs to a project packet, not core
- needs human/Planner decision first

## Authority Boundary
This skill may draft lesson language, append bounded `Promotion Candidates`, and recommend routes. It must not approve implementation, close packets, edit `Active Preventive Rules`, mark candidates `approved` or `promoted` without user approval, implement real harness changes, change approval state, or treat preventive memory as current route authority.

## Starter Boundary
Root maintainer preventive history stays root-only. `standard-template` keeps generic retrospective guidance and project-local memory boundaries; do not mirror root maintainer incidents into starter memory.
