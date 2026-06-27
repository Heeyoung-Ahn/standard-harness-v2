# Adversarial Review

Use this skill when a review, planning check, or closeout decision needs a deliberate challenge pass. It helps find weak assumptions, missing evidence, acceptance gaps, and understated risk without replacing the active workflow authority.

## Use When
- Reviewer needs a stricter pass before closeout.
- Planner needs a challenge pass against packet scope or acceptance.
- Orchestrator routes evidence back from Tester or Reviewer and needs the next owner to see the exact weakness.
- A packet has no findings but the scope is important enough to require a second-pass explanation.

## Do Not Use When
- There is no active packet, changed scope, review target, or evidence target.
- The request would redefine requirements, architecture, packet acceptance, or approval state.
- The skill would become an unconditional read requirement.
- Product-specific review rules are needed but are not present in the approved packet or project SSOT.

## Required Inputs
- Active packet path.
- Relevant SSOT or approved source artifact.
- Changed-scope summary or review target.
- Tester evidence when the packet requires Tester verification.
- Validation or closeout evidence when reviewing packet exit readiness.
- Challenge evidence artifact path or packet-local evidence ledger when reviewing Planner packet quality.

## Review Lenses
1. Source alignment: check whether the implementation or proposed closeout matches user requirements, approved sources, packet scope, and applicable SSOT.
2. Acceptance and evidence coverage: check every packet acceptance item against concrete evidence; treat missing evidence as a finding.
3. Risk and regression pressure: look for understated risk, weak rollback thinking, skipped regression coverage, or untested edge cases.
4. Authority-boundary preservation: verify that Planner, Developer, Tester, Reviewer, packet, SSOT, Ready For Code, and generated-doc boundaries were not bypassed.

## Finding Format
Report findings first, ordered by severity.

Each finding must include:
- Severity: blocking, high, medium, or low.
- Source ref: packet, SSOT, test evidence, review evidence, or changed file.
- Affected surface.
- Section or line target when available.
- Challenged claim: the assumption or conclusion being questioned.
- Weakness: why the claim may be wrong, incomplete, or unsupported.
- Required correction or evidence.
- Recommended route: Developer, Tester, Reviewer, Planner, Orchestrator, or blocked-human.

Missing source refs, missing Tester evidence, missing packet evidence, matching vocabulary without behavior evidence, prior assistant answers, and user-expected conclusions are not pass evidence.

## Zero-Finding Rule
If no finding remains, include a short second-pass note naming what was rechecked:
- source alignment
- acceptance and evidence coverage
- risk and regression pressure
- authority boundaries
- the evidence path or packet-local ledger used for the pass rationale

Do not say "no issues" without this second-pass note.

## Output Shape
Use this order:
1. Findings, or "No findings after second pass."
2. Second-pass note when there are no findings.
3. Residual risk or untested scope.
4. Recommended next route.

## Authority Boundary
This skill may recommend a route or required evidence. It must not approve implementation, close a packet, waive missing evidence, change approval state, or override Reviewer or Planner judgment.
