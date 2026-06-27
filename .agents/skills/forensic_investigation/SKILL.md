# Forensic Investigation

Use this skill when a defect, review finding, validation mismatch, source-impact conflict, or remediation loop needs evidence-graded investigation before the owning workflow can choose the next route.

## Use When
- Evidence is ambiguous, contradictory, incomplete, or spread across packets, tests, reviews, logs, command output, and user statements.
- A root cause is unclear and remediation would otherwise rely on guesses.
- Tester or Reviewer evidence conflicts with implementation claims.
- Planner needs source-impact clarification before scope, closeout, or handoff can proceed.
- The investigation is complex enough to need a persistent case file under `reference/artifacts/investigations/`.

## Do Not Use When
- The issue is simple and the owning workflow can state the evidence clearly in its normal handoff or report.
- There is no investigation question, source artifact, evidence target, or active packet/work item.
- The request would implement remediation, approve implementation, close a packet, change approval state, or replace Developer, Tester, Reviewer, Planner, Orchestrator, or user boundaries.
- The skill would become an unconditional read requirement.
- The output would copy root maintainer case history into `standard-template`.

## Required Inputs
- Investigation question.
- Active packet, workflow target, or review/test finding.
- Source inventory: relevant files, packets, requirements, architecture, reviews, walkthroughs, validation reports, command output, logs, and user statements.
- Known contradictions, missing evidence, and claims that need classification.
- Decision needed from the owning workflow, if any.

## Evidence Grades
- Confirmed: directly observed in source, command output, test result, user statement, or authoritative artifact.
- Deduced: logically inferred from Confirmed facts; cite the facts used for the inference.
- Hypothesized: plausible but unconfirmed; name the missing evidence that would confirm or reject it.

Treat missing required evidence as its own Confirmed finding when that evidence is necessary to support or reject a claim.

## Investigation Shape
Report in this order:
1. Investigation Question.
2. Source Inventory.
3. Confirmed Findings.
4. Deduced Findings.
5. Hypothesized Findings.
6. Missing Evidence.
7. Contradiction Map.
8. Recommended Route.
9. Case File Path, or no-case-file rationale.

## Contradiction Map
For each conflict, name:
- Claim A and source.
- Claim B and source.
- Current grade for each claim.
- Missing evidence needed to resolve the conflict.
- Route that should own resolution.

## Recommended Route
Choose one route and explain why:
- Developer remediation.
- Tester verification.
- Reviewer closeout or review finding.
- Planner clarification.
- PM/Handoff reconciliation.
- Orchestrator routing.
- blocked-human.
- note-only.

## Case File Rule
Create or update a case file only when the investigation cannot be safely captured in the current handoff, walkthrough, review report, or packet closeout note.

Use the generic template at `reference/artifacts/investigations/CASE_FILE_TEMPLATE.md`. Case files are evidence records only. They must not become a new SSOT, approve remediation, close packets, override review findings, or replace packet acceptance.

## Missing Evidence Rule
Do not convert a Hypothesized finding into a Confirmed or Deduced finding without source evidence. If a conclusion depends on absent logs, test output, source files, packet text, or user confirmation, record the missing required evidence explicitly and route to the owner who can produce it.

## Authority Boundary
This skill may analyze, classify, map contradictions, recommend a route, and draft or update a case file. It must not implement code, verify as Tester, approve as Reviewer, close as Planner, change approval state, waive missing evidence, edit generated state docs manually, or override the owning workflow role boundary.

## Starter Boundary
Root maintainer investigation history stays root-only. `standard-template` receives only generic forensic investigation guidance and the generic case-file template; do not mirror root-specific cases or maintainer evidence into starter payloads.
