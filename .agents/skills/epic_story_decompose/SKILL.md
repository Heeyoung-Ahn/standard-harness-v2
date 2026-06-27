# Epic Story Decompose

Use this skill when Planner needs to turn a broad epic, story, roadmap item, feature set, source intake, requirements output, architecture output, or large user request into packet-ready candidate boundaries. It produces planning candidates only while keeping Standard packet approval, Planner authority, and Ready For Code boundaries intact.

## Use When
- The request is too broad to tell whether it should be one packet, several child packets, or a deferred candidate set.
- The user uses epic, story, roadmap, phase, module, multi-feature, or broad improvement language.
- Requirements or architecture work implies more than one implementation packet.
- A source intake affects multiple potential packets and needs a candidate sequence before packet opening.
- Repeated packet-shaping churn suggests unclear packet boundaries.

## Do Not Use When
- The work is already a narrow approved packet.
- The task is a simple single-file fix, single decision, or ordinary reference read.
- The next step is Developer implementation, Tester verification, Reviewer closeout, or Planner closeout for an already-approved packet.
- The output would be treated as a story SSOT, implementation plan, packet registration, Ready For Code approval, or closeout approval.
- The skill would import BMAD story tooling, sprint state, story YAML, module registry, installer behavior, or a separate control plane.
- The skill would become mandatory in unconditional entry paths.

## Required Inputs
- Active user request and source authority.
- Current packet, requirements, architecture, implementation plan, or source intake context that creates the broad-scope question.
- Known approval boundary and current workflow owner.
- Relevant domain, system, topology, UX/design, security gate, test, root / starter parity, and documentation implications.

## Candidate Boundary Model
For each candidate, identify:
- `candidate id`: stable short label for discussion.
- `source authority`: user statement, packet, requirements, architecture, external source, or parent planning packet.
- `user outcome`: visible product, operator, or harness outcome.
- `changed surface`: files, skills, workflows, docs, tests, product UI, data, integration, or deployment surfaces.
- `ownership boundary`: Planner, Developer, Tester, Reviewer, Orchestrator, or other role expectations.
- `dependency`: prerequisite packet, decision, source, requirements freeze, architecture decision, domain foundation, system context, topology evidence, or approval.
- `gate/risk/route`: suggested gate profile, risk class, route class, and delivery route.
- `verification burden`: targeted tests, full tests, harness validation, root / `standard-template` parity, manual check, or review evidence.
- `split reason`: why this should not be bundled with adjacent work.
- `merge reason`: why this can be safely combined with adjacent work.
- `defer reason`: why this should remain later.
- `approval state`: planning-only, Ready For Code pending, approved, blocked, not-needed, or closed.

## Decomposition Flow
1. State the decomposition target and active source authority.
2. Confirm that the current task is broad enough to need decomposition.
3. Extract candidate work units using the Candidate Boundary Model.
4. Classify each candidate as:
   - single packet;
   - child packet;
   - merge candidate;
   - defer candidate;
   - not-needed;
   - blocker.
5. Recommend an order and state why earlier candidates unblock later candidates.
6. Flag missing gates and evidence before any packet opening:
   - requirements freeze;
   - architecture decision;
   - domain foundation;
   - system context;
   - environment topology;
   - UX/design gate;
   - security gate attention;
   - root / `standard-template` parity;
   - source intake or source-wave evidence.
7. Produce a candidate list for Planner review.
8. Stop before opening packets, approving Ready For Code, changing operational records, or drafting implementation details unless the active workflow and user approval separately authorize that action.

## Output Format
Use this concise format unless the active packet asks for more detail:

```markdown
## Decomposition Target
- Source authority:
- Broad request:
- Decision horizon:

## Candidate Packets
| Candidate | Outcome | Changed Surface | Dependency | Gate/Risk/Route | Verification | Disposition |
|---|---|---|---|---|---|---|
| PKT-X | ... | ... | ... | ... | ... | single / child / merge / defer / blocker / not-needed |

## Recommended Sequence
1. ...

## Approval Boundary
- Planning aid only:
- Requires separate packet opening:
- Requires separate Ready For Code:
- Blockers before implementation:
```

## Split / Merge Heuristics
- Split when candidates have different source authorities, approval owners, verification burdens, risk classes, or root / starter parity requirements.
- Split when one candidate can close without waiting for another unresolved requirement, architecture, domain, topology, UX, or source-evidence decision.
- Merge only when the same changed surface, same owner, same verification evidence, same approval boundary, and same rollback boundary apply.
- Defer when the candidate depends on a later optional workflow, manual sharding, broader source-wave planning, or a user decision that is not needed for the immediate outcome.
- Mark not-needed when existing Standard Harness behavior already satisfies the need and adding guidance would duplicate authority.

## Blocker Checks
Stop and route to Planner clarification when:
- source authority is missing or conflicting;
- candidate boundaries depend on unresolved requirements, architecture, domain, system, topology, UX/design, security, or source-wave evidence;
- a proposed story or epic output would replace a Standard packet, requirements, architecture, implementation plan, or approval decision;
- the user appears to be asking for implementation before packet approval or Ready For Code;
- the decomposition would automatically open packets or mutate approval state.

## Authority Boundary
This skill may recommend packet candidates, sequence, split/merge/defer rationale, gate/risk/route hints, and missing evidence. It must not approve implementation, open packets, change Ready For Code, mutate derived state, replace Standard packet authority, or override Planner/user approval.
