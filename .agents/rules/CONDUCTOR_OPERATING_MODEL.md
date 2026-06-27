# Human Conductor Operating Model

Standard Harness v2.1 treats the human operator as the conductor of a specialist engineering team, not as a typist and not as a passive recipient of generated code.

## Authority Model
- Human Conductor owns taste, priority, ship value, approval boundaries, and final acceptance.
- Planner owns problem framing, packet quality, and plan-as-code readiness.
- Developer owns implementation inside approved packet scope only.
- Tester owns product verification evidence and failure reproduction.
- Reviewer owns independent closeout judgment.
- CSO / SRE / data / governance reviewers are activated when risk, profile, or changed-file evidence requires specialist review.

## Operating Loop
1. Plan: write the packet as a controlled artifact.
2. Work: implement only inside the approved scope and environment.
3. Review: use the required specialist profile set before closeout.
4. Compound: capture reusable learning and automation candidates.

## Plan-as-Code Rule
A plan is not prose decoration. It must have observable acceptance criteria, non-goals, failure cases, ship value, human taste decisions where relevant, and verification evidence that can be reviewed independently.

## 50/50 Rule
For sustained harness use, feature-building work and system-improvement work must both be tracked. Repeated manual friction becomes an automation candidate instead of remaining hidden labor.

## Agent-Native Environment Boundary
Agents may use local files, terminal logs, git inspection, browser/UI checks, Playwright reports, and operational logs only within the capability registry and only when the required evidence is recorded.
