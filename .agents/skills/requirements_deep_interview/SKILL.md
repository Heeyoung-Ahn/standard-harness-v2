# Requirements Deep Interview

Use this skill before drafting, rebasing, or structurally rewriting the requirements baseline.

## Goal
- close implementation-critical ambiguity before downstream planning or coding
- shape product requirements without creating a separate PRD authority
- keep `.agents/artifacts/REQUIREMENTS.md` as the only requirements SSOT

## Required Reading
- `reference/artifacts/PROJECT_STARTER_DOC_PACK.md`
- `reference/planning/PLN-00_DEEP_INTERVIEW.md`
- `.agents/artifacts/REQUIREMENTS.md`
- `reference/planning/PLN-01_REQUIREMENTS_FREEZE.md`
- `.agents/artifacts/ACTIVE_PROFILES.md` when one or more profiles are active

## Use When
- A Planner is drafting, rebasing, or structurally updating `.agents/artifacts/REQUIREMENTS.md`.
- A new project, new authoritative source, scope change, or unclear Requirements Freeze needs coached product requirements authoring.
- The user has a goal but the users, scope boundary, workflow, evidence, or approval state are not decision-ready.

## Do Not Use When
- `.agents/artifacts/REQUIREMENTS.md` is only being read as a reference.
- The next step is implementation, testing, review, packet drafting, architecture sync, or Ready For Code without an approved Requirements Freeze boundary.
- The work would create a PRD, story, or interview note as a competing requirements SSOT.

## Five-Field Requirements Kernel
Map every requirements answer into this kernel before proposing a requirements update:
- `goal`: the product or operator outcome the first version must achieve.
- `users / roles`: the people, agents, systems, and approvers that interact with or govern the work.
- `scope boundary`: what is in scope, out of scope, deferred, and explicitly blocked.
- `workflow / behavior`: the concrete first-version flow, state change, policy, or operating behavior.
- `evidence / approval state`: source evidence, assumption status, human approval state, and remaining freeze blockers.

## Interview Workflow
1. Use `PROJECT_STARTER_DOC_PACK.md` as the gap checklist first.
2. State the requirements authoring target and active source authority.
3. Build the decision queue before asking questions: what must be decided, a one-line description for each item, the current assumption, and which item should be closed first.
4. Ask only one decision at a time instead of dumping every question at once.
5. For each decision, record:
   - `Assumption`: what is being assumed until the user answers.
   - `Answer Status`: `approved`, `open`, `deferred`, or `blocked`.
   - `Downstream Impact`: workflow, UX, data implications, integration, test scope, environment assumptions, and packet shape when relevant.
   - `Blocker Status`: whether this blocks Requirements Freeze, architecture sync, implementation planning, UI/design sync, packet drafting, or Ready For Code.
6. Map each answered decision into the five-field requirements kernel.
7. Convert answers into explicit `approved / open / deferred / blocked` states in `PLN-00_DEEP_INTERVIEW.md`.
8. When one decision changes the assumptions of later items, restate the updated baseline and rewrite the remaining follow-up questions to match it.
9. Tighten `.agents/artifacts/REQUIREMENTS.md` with concrete goal, users / roles, scope boundary, workflow / behavior, dependency, and evidence / approval-state language.
10. Before ending, provide a first-version product preview and request final human confirmation for the freeze boundary.
11. Stop at the requirements-freeze boundary and report what still blocks `PLN-01`.

## Minimum Questions
- goal
- users / roles
- first-version workflow
- in-scope / out-of-scope
- existing system or data dependency
- external source or policy evidence
- approval boundary
- optional profile need
- deployment or rollback expectation when it materially affects scope

## Freeze-Blocker Checks
Before architecture, implementation, UI/design, packet drafting, or Ready For Code proceeds, report whether any of these are still open:
- missing or conflicting `goal`
- unclear `users / roles`
- unresolved `scope boundary`
- vague `workflow / behavior`
- missing `evidence / approval state`
- unresolved assumption that changes UX, data implications, integration, test scope, environment assumptions, or packet shape
- missing final human confirmation for Requirements Freeze

If any blocker remains, stop at Planner clarification. Do not sync downstream baselines or draft implementation packets.

## Required Outputs
- Start with a decision list before drilling into the first decision.
- Record assumption, answer status, downstream impact, and blocker status for each decision.
- Map requirements notes into the five-field kernel.
- Each decision includes plain-language impact explanation suitable for a non-technical planner/operator.
- `PROJECT_STARTER_DOC_PACK.md` gaps are either answered or explicitly called out as blockers.
- `PLN-00_DEEP_INTERVIEW.md` records concrete decisions instead of leaving the interview only in chat.
- `.agents/artifacts/REQUIREMENTS.md` becomes specific enough to support `PLN-01` discussion.
- The closeout includes a final first-version product picture and an explicit final-confirmation request.
- The response ends with freeze blockers, not packet drafting.
- PRD-style notes, if used, are helper notes only and never replace `.agents/artifacts/REQUIREMENTS.md`.

## Forbidden Moves
- Do not sync `ARCHITECTURE_GUIDE.md`, `IMPLEMENTATION_PLAN.md`, or `UI_DESIGN.md` while `PLN-01` is still unapproved.
- Do not open or draft a first implementation packet as if kickoff closure were already complete.
- Do not propose Ready For Code until Requirements Freeze is explicit enough for the packet scope.
- Do not create a separate PRD, story, or interview artifact as implementation authority.
- Do not treat vague answers as approval just to move faster.
- Do not ask the user to resolve multiple unrelated decision items in one turn when they can be closed sequentially.
