# Standard Harness Codex Entry Contract

This file is the first-read operating contract for Codex in the root development harness v1.0. It is the complete Codex entry contract; there is no secondary `workspace.md` entry hop.

## Repository Product Target

This repository's implementation target is the clean Standard Harness v2 payload under
`starter/standard-harness/`.

This root harness is a development operating system for building that starter payload.
This file is a Codex-only development-repository instruction file for that work. It is
not a product contract and must not be copied into `starter/standard-harness/`.
이 파일은 이 개발 레포에서 Codex가 starter payload를 개발하기 위한 지침이며,
starter payload에 복사될 제품 계약이 아니다.

`starter/standard-harness/` must remain clean: it should be copyable into a new
repository and usable immediately without root development history, root harness state,
project-specific evidence, or provider-specific entry contracts. Do not add
`starter/standard-harness/AGENTS.md`.

Standard Harness v2 is intended to operate above LLM runtimes as a provider-neutral
routing harness. It must not become a harness that depends on Codex, Claude Code,
Antigravity, or any single LLM runtime as its product identity.

Historical V2.1 development knowledge from the previous root harness has been archived
under `reference/legacy/current-root-v2-docs/`. It is route-selected reference material,
not default context and not starter payload.

## Language Policy

- Human-only documents use Korean.
- AI-only documents and AI/human shared operating documents use English.
- User-facing chat uses Korean unless the user asks otherwise.
- AI-to-AI work, including subagent prompts, delegated reviews, and inter-agent task instructions, uses English.

## Mandatory Entry Load Order

Read the minimum set needed for the current task:

1. `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
2. `.agents/rules/agent_behavior.md`
3. `.agents/runtime/ACTIVE_CONTEXT.json` when present
4. the workflow or role contract that matches the requested lane or `ACTIVE_CONTEXT.nextWork.workflow`
5. `.agents/artifacts/CURRENT_STATE.md` only when `ACTIVE_CONTEXT.reentryContract.mustReadNext`, packet evidence, or troubleshooting needs the compatibility view
6. `.agents/artifacts/TASK_LIST.md` only when `ACTIVE_CONTEXT.reentryContract.mustReadNext`, packet evidence, or troubleshooting needs the compatibility view
7. the active project packet and authoritative source artifacts when the task depends on them
8. only the additional reference material required by the active task

Fresh copied starter fallback:

- If generated `ACTIVE_CONTEXT.*` or `VALIDATION_REPORT.*` files are missing before initialization, this is expected.
- Bootstrap from `START_HERE.md`, then run `npm run harness:init` or `npm run harness:context` as appropriate.
- Do not treat missing generated runtime state in a fresh starter as product failure.

## Truth Ownership

- Governance Markdown truth: `.agents/artifacts/*`
- Hot operational DB state: `.harness/operating_state.sqlite`
- Generated operational summaries: `.agents/runtime/generated-state-docs/*`
- Active Context: `.agents/runtime/ACTIVE_CONTEXT.json` and `.agents/runtime/ACTIVE_CONTEXT.md`
- Optional extension/reference material: `reference/*`
- Codex plugin material: `.codex-plugin/plugin.json`

Execution-state sources may describe current route facts, but they cannot override explicit user approval boundaries, Planner-owned scope, Reviewer-owned conformance findings, Tester-owned test evidence, or the operating contract stop rules.

## Generated-State Boundary

- Generated docs are never edited manually.
- Active Context is a generated re-entry summary, not write authority.
- Active Context must be regenerated when freshness drift appears before broad rereads continue.
- DB hot-state must be reconciled to governance truth before gate close.

## Core Operating Rules

- Respect explicit user orders exactly within the approval and security boundaries.
- Determine the route before state-changing work.
- Use the matching workflow or role contract before doing state-changing work.
- Treat `Core` as always active, `Optional Profile` as explicit-only, and `Project Packet` as required before project-specific code or cutover work.
- Keep handoff and lock changes explicit.
- Do not load `reference/*` unless the current task actually needs it.
- Do not generate, route, or clean non-Codex adapter artifacts unless an explicit migration diagnostic asks for legacy inspection.

## Skill Invocation

- `.agents/skills/*/SKILL.md` is the single active skill source for Codex.
- Before substantive work, search `.agents/skills` for skills whose name, description, trigger wording, request intent, active workflow, packet route, or risk surface matches the task.
- Use the matching skill even when the user does not explicitly name a skill. Explicit skill names are helpful, but they are not required for skill use.
- Treat planning, execution, verification, review, security, destructive-command, subagent, operator-support, learning, memory-search, requirements, architecture, investigation, dependency, frontend, publishing, day-start, day-wrap-up, retrospective, conflict, and version-closeout language as skill-selection signals.
- Load only the matching skill body needed for the task, then follow that skill within the approval, security, and packet boundaries in this contract.
- If one skill is clearly matched, use it before acting.
- If multiple skills could apply, load the minimum compatible set and state the order of use.
- If the requested skill name or alias is ambiguous, ask for clarification or decline the skill route; do not guess execution from an approximate alias.
- `reference/skills-src/*` is a generation source for selected active skills, not a second runtime skill surface.

## Approval And Packet Boundary

- Rough planning direction is not implementation approval.
- Detailed agreement is not `Ready For Code` unless explicitly stated.
- Implementation does not start before the active packet closes the required planning boundary.
- No workflow may claim approval implicitly from context, baton wording, PM summaries, Orchestrator summaries, or generated state.
- When approved direction changes, planning artifacts and packet boundaries must be updated before implementation continues.

## Stop Rules

Stop and ask the user, Planner, or the proper workflow owner when:

- route, scope, or authority is ambiguous,
- the request crosses an approval boundary,
- state conflicts with the user request,
- destructive work may be needed,
- generated summaries contradict approved sources,
- a guarded or security-sensitive change lacks review evidence,
- no verification path is available.

## Role And Workflow Boundary

- Planner owns scope, requirements, architecture, acceptance, and approval boundaries.
- Developer implements against approved SSOT and packet scope.
- Tester verifies against approved SSOT and returns defects to Developer.
- Reviewer checks source parity, evidence quality, residual debt, and closeout readiness.
- PM coordinates delivery status, priority, blockers, and handoff readability.
- Orchestrator routes approved post-plan delivery across Developer, Tester, Reviewer, bounded remediation, and Planner closeout.

No role may silently absorb another role's approval authority.

## Role And Workflow Routing

- Canonical role contracts stay under `.agents/workflows` for compatibility with existing runtime and documentation surfaces.
- Canonical workflow filenames use job-title role names, not abbreviations:
  - `project_manager` -> `.agents/workflows/project_manager.md`
  - `planner` -> `.agents/workflows/planner.md`
  - `developer` -> `.agents/workflows/developer.md`
  - `tester` -> `.agents/workflows/tester.md`
  - `reviewer` -> `.agents/workflows/reviewer.md`
  - `designer` -> `.agents/workflows/designer.md`
  - `deployer` -> `.agents/workflows/deployer.md`
  - `documenter` -> `.agents/workflows/documenter.md`
  - `analyst` -> `.agents/workflows/analyst.md`
  - `orchestrator` -> `.agents/workflows/orchestrator.md`
  - `handoff_coordinator` -> `.agents/workflows/handoff_coordinator.md`
- Legacy abbreviations are aliases only: `pm` means `project_manager`, `dev` means `developer`, `docu` means `documenter`, and `plan` means `planner`.
- Phrases such as `PM agent`, `PM workflow`, and `Project Manager` route to the `project_manager` role contract.
- Phrases such as `developer agent` and `dev workflow` route to the `developer` role contract.
- A role phrase plus a skill phrase means use both the role contract and the matching skill; apply the stricter approval, packet, security, and role authority boundary.
- `PM agent` or `developer agent` selects a role contract only. It does not spawn subagents unless the user explicitly asks for subagents, parallel agents, or delegated multi-agent work.
- Skill use is automatic when intent matches a skill. For example, implementation approval selects execution guidance, completion claims select verification guidance, review requests select review guidance, security-sensitive work selects security review, and destructive operations select the destructive-command guard even when the user did not say the skill name.
- `day wrap up`, `day-wrap-up`, and `day_wrap_up skill` route to `.agents/skills/day_wrap_up/SKILL.md`.
- If role or skill alias resolution is ambiguous, ask for clarification or decline the route before acting.

## Git And Worktree Discipline

- Default-branch direct feature development is a strong-default no.
- Use a dedicated branch or worktree for new features, risky refactors, parallel packet work, or long-running investigations unless an explicit exception is recorded.
- Narrow maintainer-only docs/template sync, very small emergency corrections, and local-only planning may stay in the current workspace when the exception is recorded.
- Before merge or handoff, review the diff, rerun required checks, and ensure unrelated drift is not riding along.

## Codex Command Surface

Use these commands for day-to-day operation:

```bash
npm run harness:codex-start
npm run harness:codex-ready
npm run harness:codex-task -- --task <id>
```

Do not start implementation when `codex-ready` returns `HOLD` or `BLOCKED`. Create or repair the packet, evidence, reviewer profile, or approval boundary first.
