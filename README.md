# Standard Harness v2 Starter Payload Development

이 저장소는 2026-06-27에 표준 하네스 스타터로 초기화되었다.

## 가장 먼저
- `START_HERE.md`
- `reference/manuals/human/index.md`
- `reference/manuals/human/commands.md`
- `reference/manuals/human/HARNESS_MANUAL.md`
- `INIT_STANDARD_HARNESS.cmd`
- `npm run harness:init`

## Harness Bootstrap
- Project slug: `standard-harness-v2`
- Active optional profiles: none
- Next step: fill PROJECT_STARTER_DOC_PACK, close PLN-00 and PLN-01, then sync architecture before opening implementation.

## What This Harness Protects
- Context Window 한계 대응: Active Context and compact route-selected state keep long work resumable without loading the whole repository.
- 재진입 안정성: generated runtime state and handoff projections let a new LLM session recover the current packet, evidence, and next owner.
- 승인 경계 보존: validation, packet-preflight, reviewer, and closeout surfaces preserve human approval boundaries instead of treating AI output as authority.
- 범위 오염 방지: packet scope, evidence manifests, and starter payload checks keep product changes, operating state, and reusable harness payload separate.
- Lean by default, strict where risk demands.
- Human plans, harnessed AI executes.
- Context economy is a product feature.
- Friction is observed, recorded, and improved.
- Compound Engineering and reusable learning are captured through packet evidence and learning commands.
- The starter payload is the reusable operating payload; generated runtime state is post-init project state, not source authority.

## Entry Authority
- README는 저장소 개요이고 START_HERE.md는 사람용 시작 정본이다.
- 운영 기준과 smoke 해석의 primary authority는 `reference/manuals/human/HARNESS_MANUAL.md`다.
- `START_HERE.md`는 사람용 시작 정본이고, 세부 운영 기준은 `reference/manuals/human/HARNESS_MANUAL.md`를 따른다.
- Human manual index: `reference/manuals/human/index.md`; command chapter: `reference/manuals/human/commands.md`.
- Command taxonomy: `reference/commands/COMMAND_TAXONOMY.md`; compatibility policy: `reference/commands/COMPATIBILITY_COMMAND_POLICY.md`.
- Starter seed / generated runtime state semantics: `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md`.
- In pre-init clean payload state, `starter_bootstrap_pending` is an expected hold; post-init project state starts after `npm run harness:init` creates runtime output.

## First Commands
- `npm test`
- `npm run harness:validate`
- `npm run harness:doctor`
- `npm run harness:status`
- `npm run harness:next`
- `npm run harness:context`
- `npm run harness:validation-report`
- `npm run harness:promote-starter` - see `reference/manuals/human/starter-promotion.md` before exporting a future clean starter candidate.

## Truth Contract
- `.agents/artifacts/*` is governance Markdown truth.
- `.harness/operating_state.sqlite` is hot operational DB state.
- `.agents/runtime/generated-state-docs/*` is derived output.
- `.agents/runtime/ACTIVE_CONTEXT.json` is compact AI-facing state.
- `.agents/runtime/ACTIVE_CONTEXT.md` is Korean human-facing state.
- `reference/*` is optional reference material.

## Product Code
- Harness runtime is isolated under `.harness/runtime/`.
- Harness tests are isolated under `.harness/test/`.
- Product code may use `src/`, `app/`, `backend/`, `frontend/`, `server/`, or another project-selected path.

## README Traceability
| README 핵심 주장 | 구현 파일 | 테스트 | 운영 명령 |
| --- | --- | --- | --- |
| Context Window 한계 대응 | `.agents/runtime/ACTIVE_CONTEXT.json`, `.agents/runtime/ACTIVE_CONTEXT.md` | `.harness/test/active-context.test.js` | `npm run harness:context` |
| 재진입 안정성 | `.agents/artifacts/CURRENT_STATE.md`, `.agents/runtime/generated-state-docs/` | `.harness/test/init-project.test.js` | `npm run harness:sync-state` |
| 승인 경계 보존 | `reference/packets/`, `.harness/runtime/state/risk-adaptive-gates.js` | `.harness/test/v2-5-risk-adaptive-gates.test.js` | `npm run harness:packet-preflight` |
| Friction is observed, recorded, and improved | `.harness/runtime/state/v2-p2-conductor.js` | `.harness/test/v2-p2-conductor.test.js` | `npm run harness:friction-report` |
| Compound Engineering and reusable learning | `.harness/runtime/state/compound-learning.js` | `.harness/test/v2-evidence-gates.test.js` | `npm run harness:learn` |
| Starter payload는 clean reusable operating payload다 | `.harness/runtime/state/payload-boundary.js`, `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md` | `.harness/test/payload-boundary.test.js` | `npm run harness:payload-boundary` |
| Codex 지향 표면 | `.codex-plugin/plugin.json`, `.agents/skills/` | `.harness/test/agent-routing.test.js` | `npm run harness:codex-ready` |
| Packet and evidence gates protect scope | `reference/packets/`, `reference/evidence/` | `.harness/test/v2-7-evidence-manifest.test.js` | `npm run harness:packet-preflight` |
