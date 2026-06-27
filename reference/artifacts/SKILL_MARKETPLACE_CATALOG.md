# Skill Marketplace Catalog

Version: v1

This catalog is the compact discovery surface for reusable harness skills. Use it to select a task-specific skill without loading every skill body into default context.

## Load Contract

- Default context must not include all skill bodies.
- New projects receive pointers and selected active skills, not all skill bodies in default context.
- Load a skill body when the active packet, workflow, role task, user request, request intent, or risk surface matches that skill.
- The user does not need to name a skill explicitly. Codex should select the matching skill automatically when the task intent is clear.
- `.agents/skills/*` is the single active skill surface.
- `reference/skills-src/*` is a generation source for selected active skills and is not a runtime skill surface.
- Skill output does not override packet authority, Ready For Code approval, Tester verification, Reviewer closeout, Planner closeout, or product acceptance.
- Onboarding/setup skills are explicit and versioned through this catalog or another approved pointer surface.
- Role/workflow selection remains the primary execution boundary. Skill selection happens inside the selected role/workflow boundary and inherits the stricter approval, packet, security, and role authority rules.

## Active Operational Skills

| Task type | Selected active skills | Load trigger | Authority boundary |
|---|---|---|---|
| Planning method | `.agents/skills/writing-plans/SKILL.md` | Plan, packet plan, implementation plan, refactoring plan, remaining-work plan, or sequencing request | Drafts plan only; does not approve implementation, Ready For Code, or packet closeout. |
| Execution method | `.agents/skills/executing-plans/SKILL.md` | Approved packet or approved implementation plan is being implemented | Executes only inside approved scope; does not expand scope or infer approval. |
| Completion verification | `.agents/skills/verification-before-completion/SKILL.md` | Complete/fixed/ready/closed/pass claim is about to be made | Completion claims require evidence; unverified items remain unverified. |
| Review method | `.agents/skills/requesting-code-review/SKILL.md`, `.agents/skills/receiving-code-review/SKILL.md` | Review request, subagent review, review findings, or review remediation | Review output is evidence only; does not replace Reviewer, Tester, Planner, or user authority. |
| Security and destructive-command method | `.agents/skills/security-review/SKILL.md`, `.agents/skills/destructive-command-guard/SKILL.md` | Security-sensitive, prompt/control, secret, dependency, generated-state, deployment, shell, deletion, reset, or migration surface | Guard/review only; does not authorize secrets exposure, destructive commands, deployment, or approval bypass. |
| Operator and delegation method | `.agents/skills/operator-support/SKILL.md`, `.agents/skills/subagent-driven-development/SKILL.md` | Status/next-safe-action request, or explicit subagent/delegated multi-agent request | Operator support decides nothing; subagents require explicit user request or packet authorization traceable to user approval. |
| Learning and memory method | `.agents/skills/compound-learning/SKILL.md`, `.agents/skills/memory-search/SKILL.md` | Reusable lesson, preventive memory, prior learning, or recurring issue search | Memory is evidence only; does not override approved sources. |
| Packet challenge and review | `.agents/skills/adversarial_review/SKILL.md`, `.agents/skills/code_review_checklist/SKILL.md` | Packet quality challenge or code-review checklist request | Advisory input only; does not approve Ready For Code or Reviewer closeout. |
| Requirements and architecture planning | `.agents/skills/requirements_deep_interview/SKILL.md`, `.agents/skills/architecture_design/SKILL.md` | Drafting, rebasing, or structurally updating Requirements or Architecture Guide | Stops before downstream baselines, packet drafting, or Ready For Code unless separately authorized. |
| Packet decomposition | `.agents/skills/epic_story_decompose/SKILL.md` | Turning broad epics, stories, roadmaps, or source intake into packet candidates | Produces candidate boundaries only; does not open packets or approve implementation. |
| Investigation and retrospection | `.agents/skills/forensic_investigation/SKILL.md`, `.agents/skills/retrospective/SKILL.md` | Reviewer investigation, Planner closeout lessons, repeated friction, or evidence gaps | May classify and recommend routes; does not implement remediation or close packets. |
| PM day operations | `.agents/skills/day_start/SKILL.md`, `.agents/skills/day_wrap_up/SKILL.md` | Day start, day wrap up, PM triage, or preventive-memory candidate triage | Summarizes and proposes; does not mutate approval state without a packet/workflow route. |
| Artifact safety | `.agents/skills/korean-artifact-utf8-guard/SKILL.md` | Korean artifact encoding or UTF-8 safety work | Encoding guidance only; does not waive validation or review evidence. |
| Conditional release/version closeout | `.agents/skills/version_closeout/SKILL.md` | Version or release train closeout after an approved release-lane packet | Conditional guidance only until a release packet grants authority. |
| Conditional conflict triage | `.agents/skills/conflict_resolver/SKILL.md` | Initial triage when agents, sessions, or branches collide on the same truth surface | Minimum-contract-deferred. It may identify scope and route to Planner; real multi-agent/session/branch/queue collision handling requires `OPS-SKILL-01A_CONFLICT_RESOLVER_MINIMUM_CONTRACT` or equivalent approval. |

## Additional Active Skills

| Task type | Selected active skills | Load trigger |
|---|---|---|
| Dependency and artifact operations | `.agents/skills/dependency_audit/SKILL.md`, `.agents/skills/feature-artifact-sync/SKILL.md` | Active packet asks for dependency audit or artifact sync guidance. |
| Frontend and publishing support | `.agents/skills/frontend_design/SKILL.md`, `.agents/skills/general_publish/SKILL.md`, `.agents/skills/github_deploy/SKILL.md` | Active packet asks for frontend design, publishing, GitHub deployment, or related optional guidance. |
| Operating rollout | `.agents/skills/operating-common-rollout/SKILL.md` | Active packet asks for operating rollout guidance. |

## Role Skill Affinity

This matrix helps Codex select skills automatically after the role/workflow is selected. It is an affinity map, not a separate authority grant.

| Role/workflow | Common matching skills | Notes |
|---|---|---|
| Planner | `writing-plans`, `requirements_deep_interview`, `architecture_design`, `epic_story_decompose`, `memory-search`, `adversarial_review` | Planner owns scope and approval boundaries; these skills cannot approve implementation by themselves. |
| Developer | `executing-plans`, `receiving-code-review`, `destructive-command-guard`, `memory-search`, `security-review` | Developer implements only approved scope and uses guard/security skills when risk surfaces appear. |
| Tester | `verification-before-completion`, `forensic_investigation`, `destructive-command-guard` | Tester verifies evidence and may investigate mismatches; Tester does not approve scope. |
| Reviewer | `requesting-code-review`, `receiving-code-review`, `adversarial_review`, `code_review_checklist`, `security-review`, `forensic_investigation` | Reviewer evidence does not replace Planner or user approval. |
| Project Manager | `operator-support`, `day_start`, `day_wrap_up`, `compound-learning`, `memory-search`, `retrospective` | PM coordinates status and handoff readability without closing owner-specific gates. |
| Orchestrator | `operator-support`, `executing-plans`, `subagent-driven-development`, `receiving-code-review` | Orchestrator routes approved work; subagent use still requires explicit user or approved packet authorization. |
| Designer | `frontend_design`, `architecture_design`, `requirements_deep_interview` | Designer uses skill guidance inside approved design/UX scope. |
| Deployer | `general_publish`, `github_deploy`, `security-review`, `destructive-command-guard`, `version_closeout` | Release/deploy skills remain conditional on explicit release/deploy packet authority. |
| Documenter | `verification-before-completion`, `version_closeout`, `korean-artifact-utf8-guard`, `retrospective` | Documentation skill output is not approval or generated-state authority. |
| Handoff Coordinator | `operator-support`, `day_wrap_up`, `memory-search`, `conflict_resolver` | Handoff work routes owners and preserves evidence; it does not implement or approve. |

## Reviewer Hold Conditions

Reviewer may hold closeout when implementation:

- adds all skill bodies to default context, default role briefs, or default Planner read sets;
- omits the matching `standard-template` catalog/guidance update;
- claims skill output can approve implementation, replace Tester or Reviewer evidence, close packets, or override packet scope;
- treats `conflict_resolver` as proven infrastructure for multi-agent, multi-session, branch, queue, or merge collisions;
- implements runtime marketplace automation, package publishing, plugin installation, or skill body hardening without a separate approved packet.
