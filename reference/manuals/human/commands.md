---
doc_id: HUMAN_HARNESS_MANUAL_COMMANDS
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# Commands

명령의 전체 분류 정본은 `reference/commands/COMMAND_TAXONOMY.md`이고, 호환성 명령 유지/폐기 기준은 `reference/commands/COMPATIBILITY_COMMAND_POLICY.md`입니다.

## 16. CLI 명령 레퍼런스

아래 명령은 설치된 프로젝트 루트에서 사용한다.
전체 명령 분류는 `reference/commands/COMMAND_TAXONOMY.md`, 호환성 명령 유지/폐기 기준은 `reference/commands/COMPATIBILITY_COMMAND_POLICY.md`를 정본으로 본다.

### Risk-Adaptive 명령 묶음

이 명령 묶음은 기존 기본 명령을 대체하지 않고 `v24` namespace로 추가된다.
기본 workflow는 기존 `init`, `status`, `context`, `packet-preflight`, `evidence`, `validate`를 유지하고, 위험 표면이 있을 때만 아래 명령을 추가로 사용한다.

| 명령 | 목적 | 주 사용 상황 |
|---|---|---|
| `npm run harness:v24` | runtime help와 risk overlay 진입점 | 사용 가능한 command set 확인 |
| `npm run harness:v24 -- lane --files "..."` | 변경 파일 기준 lane과 risk overlay 추정 | 작업 시작 전 영향 범위 확인 |
| `npm run harness:repro-check` | 재현 상태와 코드 변경 필요성 확인 | 버그 수정, 이미 해결된 이슈, 재현 실패 이슈 |
| `npm run harness:abstain` | 코드 변경 없는 closeout decision 기록 | no-op success, stale/not-reproducible 이슈 |
| `npm run harness:dependency-intake` | dependency/lockfile/CI/Docker 공급망 확인 | 패키지 추가, lockfile 변경, install script 의심 |
| `npm run harness:context-meter` | lane별 토큰 예산과 중복 read 점검 | 토큰 소모 또는 하네스 마찰이 커졌을 때 |
| `npm run harness:context-prune` | context read 후보를 줄이는 권고 생성 | raw log/장문 manual을 열기 전 |
| `npm run harness:evidence-quality` | RED/GREEN, exit code, mock-heavy, integration coverage 점검 | behavior-bearing change closeout 전 |
| `npm run harness:secret-scan` | token/credential 노출 탐지와 redaction | `.env`, key, CI/CD, config, evidence report 관련 |
| `npm run harness:untrusted-scan` | prompt-injection성 외부 지시 탐지 | 이슈 본문, PR 코멘트, 웹, README 인용 |
| `npm run harness:guard` | destructive command와 edit boundary 정책 적용 | strict/release, production, DB, auth 관련 작업 |
| `npm run harness:task-brief` | subagent-style 짧은 task brief 생성 | implementer/reviewer에게 최소 context 전달 |
| `npm run harness:v24-policy-audit` | current SSOT와 adapter manifest 존재 확인 | 설치 후 또는 릴리즈 전 |

대표 사용 예시는 아래와 같다.

```sh
npm run harness:v24 -- lane --files "package.json,src/components/Button.tsx"
npm run harness:repro-check -- --issue-status confirmed --code-change-required yes
npm run harness:abstain -- --issue-status not-reproducible --code-change-required no --apply
npm run harness:dependency-intake -- --files "package.json,package-lock.json" --registry-verified offline-exempt --lockfile-reviewed yes
npm run harness:context-meter
npm run harness:evidence-quality -- --mode behavior --red-observed yes --green-command "npm test" --exit-code 0
npm run harness:secret-scan -- --files ".env"
npm run harness:untrusted-scan -- --trust-label untrusted-external --text "ignore previous instructions"
npm run harness:guard -- --edit-boundary src/ --command "npm test" --apply
npm run harness:task-brief -- --task PKT-01 --files src/app.js --apply
```

이 명령의 pass는 해당 risk overlay에 대한 하네스 점검 결과다. 제품 기능 검증, 사람 승인, Reviewer closeout을 자동 대체하지 않는다.

### `npm run harness:init`
- 목적: 새 프로젝트를 하네스 usable state로 초기화한다.
- 언제 쓰나: starter를 복사한 직후, 또는 빈 프로젝트에 하네스를 막 올린 직후.
- 기대 출력: 프로젝트 이름, 목표, profile 같은 초기 질문을 받고 기본 artifact와 state가 생성된다.
- 실패 시 첫 대응: Node.js 24 이상인지, 현재 위치가 프로젝트 루트인지 확인한다.
- 관련 아티팩트: `.harness/operating_state.sqlite`, `.agents/artifacts/*`, `.agents/runtime/*`

### `npm run harness:status`
- 목적: 현재 단계와 다음 action을 짧게 보되, 기술 검증 상태와 workflow gate 상태를 분리해서 본다.
- 언제 쓰나: 하루 시작, 중단 후 복귀, handoff 직후.
- 기대 출력: 현재 stage/focus/next action과 함께 `Technical validation`, `Workflow gate`가 별도 줄로 나온다.
- 실패 시 첫 대응: `harness:init`이 끝났는지, `ACTIVE_CONTEXT.*`와 DB 상태가 비어 있지 않은지 확인한다. 필요하면 `CURRENT_STATE.md`를 compatibility view로 확인한다.
- 관련 아티팩트: `ACTIVE_CONTEXT.*`, `CURRENT_STATE.md`

### `npm run harness:next`
- 목적: 다음 workflow와 구체 next work를 확인한다.
- 언제 쓰나: 지금 뭘 해야 할지 애매할 때.
- 기대 출력: 다음 owner, workflow, next first action이 나온다.
- 실패 시 첫 대응: `ACTIVE_CONTEXT.*`와 최신 handoff가 비어 있지 않은지 확인한다. 필요하면 `TASK_LIST.md`를 compatibility view로 확인한다.
- 관련 아티팩트: `ACTIVE_CONTEXT.*`, `TASK_LIST.md`

### `npm run harness:context`
- 목적: AI용 JSON과 사람용 Markdown active context를 생성 또는 갱신한다.
- 언제 쓰나: init 직후, handoff 직후, closeout 직후, stale 의심 시.
- 기대 출력: `ACTIVE_CONTEXT.json`과 `ACTIVE_CONTEXT.md`가 최신 상태로 생성된다.
- 실패 시 첫 대응: `.harness/operating_state.sqlite` 존재 여부와 validator 오류를 먼저 확인한다. generated surface가 빠졌거나 low-confidence recovery가 필요하면 `node .harness/runtime/state/dev05-cli.js context --repair`로 복구 경로와 다음 명령 제안을 본다.
- 관련 아티팩트: `.agents/runtime/ACTIVE_CONTEXT.json`, `.md`

### `npm run harness:sync-state`
- 목적: 평소 복구/마감/handoff 직전에 필요한 상태 동기화를 한 번에 실행한다.
- 언제 쓰나: generated state를 한 번에 다시 맞추고 싶을 때, normal wrap/handoff recovery를 짧게 끝내고 싶을 때.
- 실행 순서: `validate -> validation-report -> context -> status`.
- 운영 규칙: handoff, transition apply, closeout 뒤에는 이 명령을 기본 refresh path로 사용한다. 같은 refresh 명령들을 병렬로 실행하지 않는다.
- 기대 출력: validator, validation-report, active context, status가 정해진 순서로 다시 맞춰지고 마지막에 `Technical validation`, `Workflow gate`, failed step, next command, next action 요약이 나온다.
- 실패 시 첫 대응: 첫 실패 단계와 next command를 먼저 확인한다. missing file이나 stale 상태가 남으면 `context --repair`로 recovery report와 구체 복구 명령을 확인한다.
- 검증 경계: 이 명령은 harness structural/state refresh만 수행하며 product/feature verification pass를 대체하지 않는다.
- 관련 아티팩트: `VALIDATION_REPORT.*`, `ACTIVE_CONTEXT.*`, `CURRENT_STATE.md`, `TASK_LIST.md`

### `npm run harness:doctor`
- 목적: 하네스 운영 상태를 빠르게 진단한다.
- 언제 쓰나: init이 이상할 때, 명령이 어색하게 동작할 때, 설치 환경을 점검할 때.
- 기대 출력: 환경과 하네스 상태에 대한 점검 요약이 나온다.
- 실패 시 첫 대응: Node.js 버전, 루트 경로, 필수 파일 존재 여부를 먼저 확인한다.

### `npm run harness:validate`
- 목적: 현재 정본, packet, generated state, profile evidence가 규칙에 맞는지 검사한다.
- 언제 쓰나: 구현 전, handoff 전, closeout 전, 문서/상태를 크게 바꾼 뒤.
- 기대 출력: `ok: true` 또는 findings 목록이 나온다.
- 실패 시 첫 대응: findings에서 가장 위에 나온 missing evidence나 stale parity를 먼저 해결한다.

### `npm run harness:validation-report`
- 목적: validator 결과를 Markdown과 JSON 리포트로 저장한다.
- 언제 쓰나: closeout 전, review 전, evidence를 남겨야 할 때.
- 기대 출력: `VALIDATION_REPORT.md`와 `VALIDATION_REPORT.json` 경로, gate decision, next action이 나온다.
- 실패 시 첫 대응: 먼저 `harness:validate`를 실행해 blocking finding부터 없앤다.
- 증명하지 않는 것: 제품 동작이 맞는지, acceptance가 실제로 충족됐는지, Reviewer가 closeout을 승인했는지는 Tester/Reviewer/product-specific evidence가 별도로 증명한다.
- `LLM Judge` 섹션이 있으면 deterministic validator와 분리된 advisory-only review evidence로 읽는다. `Gate effect: advisory-only`는 judge 결과가 validator gate, Ready For Code, Reviewer 판단, Planner closeout을 직접 대체하지 않는다는 뜻이다.
- Judge result artifact는 first wave에서 `manual` 또는 `mock`만 허용한다. full chat/history, raw transcript, generated docs, workspace dump 같은 forbidden context가 들어오면 `invalid-context` 진단으로 남기고 live independent review claim을 하지 않는다.

### `npm run harness:handoff`
- 목적: 다음 역할로 넘길 handoff 내용을 확인하거나 생성 흐름을 돕는다.
- 언제 쓰나: 구현 완료 후 Tester로 넘길 때, Tester 후 Reviewer로 넘길 때, Planner가 다음 owner를 정리할 때.
- 기대 출력: 현재 기준으로 추천되는 next owner와 handoff 요약 방향이 나온다.
- 실패 시 첫 대응: `ACTIVE_CONTEXT.*`, latest handoff, active packet이 실제 상황과 맞는지 먼저 본다. 필요하면 `CURRENT_STATE.md`와 `TASK_LIST.md`를 compatibility view로 대조한다.

### `npm run harness:explain`
- 목적: 현재 하네스 상태를 조금 더 풀어서 설명한다.
- 언제 쓰나: `status`가 너무 짧아서 현재 맥락을 더 이해하고 싶을 때.
- 기대 출력: stage, next work, blockers, source trace가 확장 설명 형태로 나온다.
- 실패 시 첫 대응: `harness:context`를 다시 실행해 stale 상태를 먼저 줄인다.

### `npm run harness:transition`
- 목적: 승인된 workflow 전환을 preview/apply 형태로 반영한다.
- 언제 쓰나: Planner에서 Developer 또는 Orchestrator로 넘길 때, Developer에서 Tester로 넘길 때, Reviewer closeout 후 다음 lane으로 넘길 때.
- 기대 출력: preview 또는 apply 결과와 post-apply validation 요약이 나온다.
- 실패 시 첫 대응: `Ready For Code`, open decision, packet closeout 상태가 실제로 충족되었는지 먼저 확인한다.

자주 쓰는 전환:

```sh
npm run harness:transition -- --transition planner-to-developer --work-item WORK_ITEM_ID --apply
npm run harness:transition -- --transition planner-to-orchestrator --work-item WORK_ITEM_ID --apply
npm run harness:transition -- --transition developer-to-tester --work-item WORK_ITEM_ID --apply
npm run harness:transition -- --transition tester-to-reviewer --work-item WORK_ITEM_ID --apply
npm run harness:transition -- --transition reviewer-to-planner --work-item WORK_ITEM_ID --apply
```

`planner-to-orchestrator`는 Ready For Code 승인 직후에만 쓰는 것이 안전하다.
packet이 Developer, Tester, Reviewer, remediation loop, Planner closeout까지 자동 라우팅을 요구할 때 선택한다.
단순 구현만 시작하면 충분한 packet은 `planner-to-developer`를 쓴다.

### `npm run harness:risk`
- 목적: fresh-start/bootstrap 리스크를 공식 CLI로 조회, close, defer한다.
- 언제 쓰나: `harness:init` 이후 `RISK-INIT-01` 같은 bootstrap risk가 `harness:first-packet` apply를 막고 있고, 요구사항 기준선이나 후속 추적 근거를 명시적으로 남겨야 할 때.
- 필수 입력: `close`와 `defer`는 모두 `--reason`과 repository-relative `--evidence`가 필요하다. `defer`는 추가로 `--follow-up-owner`, `--follow-up-date YYYY-MM-DD`가 필요하다.
- 근거 경계: generated summary, rough agreement, unrelated WORK_PACKET approval, runtime handoff, `ACTIVE_CONTEXT.*`, validation report는 bootstrap risk close/defer 근거가 아니다.
- 승인 경계: 이 명령은 risk registry 처분만 기록한다. Ready For Code, implementation, security, release, migration, residual-risk 승인을 부여하지 않는다.
- 실패 시 첫 대응: `harness:risk -- list`로 정확한 risk id를 확인하고, 실제 승인/요구사항/계획 artifact 경로를 `--evidence`로 다시 지정한다.

```sh
npm run harness:risk -- list
npm run harness:risk -- close RISK-INIT-01 --reason "Requirements baseline reviewed for first packet planning." --evidence .agents/artifacts/REQUIREMENTS.md --apply
npm run harness:risk -- defer RISK-INIT-01 --reason "Accepted as tracked follow-up." --evidence .agents/artifacts/REQUIREMENTS.md --follow-up-owner planner --follow-up-date 2026-06-30 --apply
```

### `npm run harness:first-packet`
- 목적: fresh-start 프로젝트에서 starter placeholder work item을 preview/apply로 정리하고 첫 실제 packet을 등록한다.
- 언제 쓰나: `PLN-00`/`PLN-01`을 닫은 뒤 첫 구현 packet을 열 때, 기존 active task가 템플릿 placeholder인지 실제 작업인지 확인해야 할 때.
- 기대 출력: active task, starter placeholder, target packet, artifact registration, apply 시 변경될 state surface가 나온다.
- 실패 시 첫 대응: `firstPacketReadiness`의 `Quick Decision Header > Work item`, open bootstrap decisions/risks, active profile evidence, `Verification Manifest` 진단을 먼저 고친다. open work item, open decision, open blocker가 실제 프로젝트 작업이면 먼저 닫거나 라우팅한다.

```sh
npm run harness:first-packet -- --work-item WORK_ITEM_ID --packet reference/packets/PKT-01_WORK_ITEM.md
npm run harness:first-packet -- --work-item WORK_ITEM_ID --packet reference/packets/PKT-01_WORK_ITEM.md --apply
```

### `npm run harness:evidence`
- 목적: fresh starter에 기본 포함되지 않는 Tester/Reviewer evidence 파일을 active packet 기준으로 생성하거나 append한다.
- 언제 쓰나: 첫 `WALKTHROUGH.md` 또는 `REVIEW_REPORT.md`를 만들 때, packet `Verification Manifest`에 선언된 product command를 evidence로 캡처할 때.
- 기대 출력: preview/apply mode, target artifact, planned sections, manifest-declared product command 목록이 나온다.
- 실패 시 첫 대응: active packet source, work item id, product command cwd가 맞는지 확인한다.
- 주의: product command 결과는 product verification evidence이고, `harness:validate` pass와 별개로 판정한다.

```sh
npm run harness:evidence -- --type walkthrough --work-item WORK_ITEM_ID
npm run harness:evidence -- --type walkthrough --work-item WORK_ITEM_ID --apply
npm run harness:evidence -- --type review-report --work-item WORK_ITEM_ID --apply
```

### `npm run harness:packet-preflight`
- 목적: packet authoring, implementation transition, closeout enum 상태를 읽기 전용으로 미리 확인한다.
- 언제 쓰나: packet을 연 직후, Ready For Code 승인 전후, Planner가 Developer/Orchestrator로 넘기기 전, Reviewer/Planner closeout 직전.
- 주의: `planning-open`은 high risk + RFC hold와 missing required challenge review를 planning hold로 허용하지만, `implementation-transition`은 RFC 미승인과 required `Planner Packet Challenge Review` non-pass를 block한다.
- 출력: declared / derived / effective risk, risk trigger reason, Ready For Code, delivery route mode, requested/effective route class, change zone, modeling impact status, planner packet challenge status, closeout enum diagnostics.
- context/docs impact enforcement: implementation-transition은 선언된 data/schema/source/system/shared/runtime impact와 `Domain context` / `System context` / `Architecture` 상태를 비교해 missing, stale, unknown, unsupported, rebaseline-required evidence를 block한다. closeout은 선언된 development-doc impact와 `Docs parity status`를 비교해 `pending` / `fail`을 block한다.
- optional developer doc templates: `reference/artifacts/DEVELOPMENT_GUIDE.md`, `API_CONTRACT.md`, `DATABASE_MODEL.md`, `TESTING_GUIDE.md`, `RUNBOOK.md`는 packet `Development Documentation Impact`가 활성화할 때만 required doc path가 될 수 있다.
- 증명하지 않는 것: preflight pass는 packet authoring/transition readiness만 말하며 구현 품질, product acceptance, Reviewer closeout을 대신하지 않는다.
- `--changed-files` 또는 `--changed-file`을 주면 `reference/artifacts/REPOSITORY_LAYOUT_OWNERSHIP.json`에 따라 path, matched rule, declared zone, expected zone, route implication, next action을 보고한다.
- enum diagnostics는 field name, current value, expected enum values, narrative destination을 보여 준다. 설명 문장은 enum field가 아니라 Closeout notes 또는 `REVIEW_REPORT.md`에 둔다.
- `authoringGuide`는 strict literal enum, Planner Packet Challenge Review copy-ready example, compact manifest example을 함께 보여 준다. exact enum field에는 값만 쓰고 설명은 note field에 둔다.
- 대표 exact enum: `Change zone`은 `core` / `load-bearing` / `padded` / `prototype`, `Schema impact classification`은 `none` / `not-needed` / `not needed` / `no` / `low` / `medium` / `high` / `conditional`이다.
- compact manifest heading은 `## Verification Manifest`이고, 최소 항목은 Ready For Code, root, standard-template, targeted, validator, active context, review closeout evidence다.
- required challenge heading은 `## Planner Packet Challenge Review`이고, 최소 항목은 Challenge reviewer, Challenge reviewer independence basis, Source refs reviewed, Challenge status, Parent objective coverage, Deferred scope with named follow-up, Acceptance proves behavior change, Failure fixture or failure condition, Reviewer closeout hold basis, First-wave limit check, Guidance-only sufficiency rationale, Findings disposition, Required corrections applied, No self-approval claim이다.

```powershell
npm run harness:packet-preflight -- --work-item WORK_ITEM_ID --stage planning-open
npm run harness:packet-preflight -- --work-item WORK_ITEM_ID --stage implementation-transition
npm run harness:packet-preflight -- --work-item WORK_ITEM_ID --stage closeout
npm run harness:packet-preflight -- --work-item WORK_ITEM_ID --stage implementation-transition --changed-files ".harness/runtime/state/packet-preflight.js,reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md"
```

### `npm run harness:brief`
- 목적: 현재 owner/lane에 맞는 짧은 운영 brief를 만든다.
- 언제 쓰나: 상태는 보이지만 다음 role이 무엇을 읽고 무엇을 해야 하는지 사람이 빠르게 정리해야 할 때.
- 분류: advanced/operator command. 일반 사용자는 보통 `harness:status`, `harness:next`, `harness:context`로 충분하다.
- 실패 시 첫 대응: `ACTIVE_CONTEXT.*`와 latest handoff가 최신인지 확인하고, stale이면 `harness:sync-state`를 먼저 실행한다.

### `npm run harness:agent`
- 목적: 특정 role의 independent agent session을 만들고 context/prompt/output 경로를 생성한 뒤 mock 또는 configured adapter output을 검증한다.
- 언제 쓰나: role-scoped agent session을 실제로 열거나, adapter 기반 Developer/Tester/Reviewer/Planner output을 하네스가 요구하는 JSON/evidence shape로 검증할 때.
- 분류: advanced/operator command. workflow authority를 대체하지 않으며, 출력이 애매하면 session context/prompt, matching `.agents/workflows/*.md`, active packet을 직접 읽는다.
- 실패 시 첫 대응: `--role`, `--work-item`, adapter 설정, output JSON shape, evidence path가 실제 workflow와 active packet에 맞는지 확인한다.

### `npm run harness:directional-pilot`
- 목적: 방향 원칙별 evidence lane을 JSON/Markdown report로 만든다.
- 언제 쓰나: follow-up wave나 closeout 전에 friction loop, product verification separation, browser/security/context/manual/closeout lane이 분리되어 있는지 확인할 때.
- 분류: advanced/operator diagnostic. 이 결과는 no approval, release readiness, packet closeout, risk closure, residual-risk acceptance 권한을 갖지 않으며 not product verification이다.
- 대표 실행: `npm run harness:directional-pilot -- --apply --evidence-file reference/evidence/fixtures/directional-pilot-completed-evidence.json`
- 예상 산출물: `.agents/runtime/directional-regression-pilot.json`, `.agents/runtime/DIRECTIONAL_REGRESSION_PILOT.md`
- 실패 시 첫 대응: missing lane, artifact proof, provenance, browser fallback status를 확인하고 source evidence를 보완한다.

### `npm run harness:trace-matrix`
- 목적: requirement -> packet -> implementation file -> test -> evidence -> documentation -> review/risk status를 하나의 matrix로 만든다.
- 언제 쓰나: 요구사항 coverage를 설명하거나 closeout 전에 product behavior evidence와 harness validation evidence가 분리되어 있는지 확인할 때.
- 분류: advanced/operator diagnostic. 이 결과는 no approval, release readiness, coverage approval, product verification, security approval, closeout, risk closure 권한을 갖지 않는다.
- 대표 실행: `npm run harness:trace-matrix -- --apply --trace-file reference/evidence/fixtures/requirement-trace-matrix.json`
- 예상 산출물: `.agents/runtime/requirement-trace-matrix.json`, `.agents/runtime/REQUIREMENT_TRACE_MATRIX.md`
- 실패 시 첫 대응: missing evidence, missing doc, missing security review, reviewer/risk fields의 nextAction을 확인한다.

### `npm run harness:refactor-audit`
- 목적: oversized file, hotspot, duplicate command wiring, circular import, boundary violation, repeated logic candidate를 읽기 전용으로 점검한다.
- 언제 쓰나: 장기 프로젝트에서 코드가 얽히기 시작했는지 확인하거나, 별도 refactor packet 후보를 만들 때.
- 분류: advanced/operator diagnostic. 기본 모드는 advisory이며 code mutation, refactor approval, debt closeout, release, packet closeout 권한을 갖지 않는다.
- 대표 실행: `npm run harness:refactor-audit -- --apply`
- strict 실행: `npm run harness:refactor-audit -- --apply --mode strict`
- 실패 시 첫 대응: finding의 `recommendedPacketType`, `nextAction`, `rationale`를 보고 별도 refactor packet을 열지 결정한다.

### `npm run harness:operator-digest`
- 목적: status, packet preflight, trace matrix, directional pilot, security review, browser evidence, context budget, guard overlays, open risk를 하나의 읽기 전용 readiness digest로 모은다.
- 언제 쓰나: 운영자가 closeout 전 여러 readiness surface를 한 화면에서 보고 다음 안전 조치를 정해야 할 때.
- 분류: advanced/operator diagnostic. 이 결과는 approval, release, packet closeout, residual risk acceptance 권한을 갖지 않는다.
- 대표 실행: `npm run harness:operator-digest -- --apply --digest-file reference/evidence/fixtures/operator-readiness-digest.json`

### `npm run harness:recovery-rehearsal`
- 목적: generated artifact drift, active packet/runtime mismatch, failed transition retry, partial pilot output, unavailable state를 읽기 전용으로 진단한다.
- 언제 쓰나: `sync-state`, `context --repair`, transition retry, directional pilot evidence가 꼬였는지 확인해야 할 때.
- 분류: advanced/operator diagnostic. 이 결과는 repair, approval, release, packet closeout, residual risk acceptance 권한을 갖지 않는다.
- 대표 실행: `npm run harness:recovery-rehearsal -- --apply`
- 실패 시 첫 대응: 첫 finding의 `nextAction`을 따른다. 보통 `harness:sync-state` 후 재실행하거나, state lock/unavailable 원인을 해소한 뒤 다시 진단한다.

### `npm run harness:context-budget-policy`
- 목적: role/lane별 max-read 및 token budget 초과를 advisory, warn, strict 모드로 판정한다.
- 언제 쓰나: raw log나 긴 history를 많이 읽어야 할 때, token discipline을 closeout evidence로 남겨야 할 때.
- 분류: advanced/operator diagnostic. strict mode의 hard-fail은 policy evidence이며 approval, release, packet closeout 권한을 갖지 않는다.
- 대표 실행: `npm run harness:context-budget-policy -- --apply --mode warn --role reviewer --lane strict --read-files 9 --tokens 2500`
- strict 실행: `npm run harness:context-budget-policy -- --apply --mode strict --role reviewer --lane strict --read-files 9 --tokens 2500`
- 실패 시 첫 대응: default read set을 줄이고 broad evidence를 fallback-only로 옮기거나, packet rationale에 근거를 남긴 뒤 명시적으로 advisory/warn 모드를 선택한다.

### `npm run harness:packaging-readiness`
- 목적: payload boundary, starter copy/init, command taxonomy, manual entry point, migration note, version note, rollback note, deprecated-doc policy를 packaging readiness smoke로 점검한다.
- 언제 쓰나: 하네스 payload를 배포/동기화/버전업 후보로 보기 전, maintainer가 release-facing 문서와 migration surface를 한 번에 확인해야 할 때.
- 분류: advanced/operator diagnostic. 이 결과는 publish, deploy, release approval, packet closeout, residual risk acceptance 권한을 갖지 않는다.
- 대표 실행: `npm run harness:packaging-readiness -- --apply --readiness-file reference/evidence/fixtures/packaging-readiness.json`
- 실패 시 첫 대응: `migrationNotes`, `versionNotes`, `rollbackNotes` finding의 `nextAction`에 따라 별도 documentation 또는 migration packet을 연다. payload pass를 production deployment readiness로 해석하지 않는다.
- 실패 시 첫 대응: digest surface JSON의 status 값과 sourcePath를 확인하고, blocking/hold surface의 nextAction을 먼저 처리한다.

### `npm run harness:promote-starter`
- 목적: future product project에서 개선된 copied `standard-harness` 중 reusable harness/starter 개선분만 target clean starter candidate로 export한다.
- 언제 쓰나: 실제 제품 프로젝트가 끝나거나 다음 프로젝트를 시작하기 전에, 현재 product project 폴더를 그대로 재사용하지 않고 clean starter 후보를 재생성해야 할 때.
- 대표 실행: `npm run harness:promote-starter -- --to <new-clean-starter-path>`
- dry-run: `npm run harness:promote-starter -- --dry-run --to <new-clean-starter-path>`
- fresh verification 포함: `npm run harness:promote-starter -- --to <new-clean-starter-path> --verify`
- 상세 매뉴얼: `reference/manuals/human/starter-promotion.md`
- 출력 해석: include/exclude/review lane, contamination audit, fresh starter verification을 본다. source product project와 target clean starter candidate를 혼동하지 않는다.
- 권한 경계: 이 결과는 release, publish, approval, closeout, risk closure, product verification, residual-risk acceptance 권한을 갖지 않는다.
- 실패 시 첫 대응: blocked contamination, missing provenance, unsafe target, failing fresh verification command의 `nextAction`을 먼저 처리한다.

### `npm run harness:ai-review-runner`
- 목적: provider-neutral 또는 mock AI review output을 schema 검증하고 advisory report로 기록한다.
- 언제 쓰나: AI/Judge review를 closeout 참고 증거로 쓰되 approval authority와 분리해야 할 때.
- 분류: advanced/operator diagnostic. 이 결과는 approval, release, packet closeout, guard override, residual risk acceptance 권한을 갖지 않는다.
- 대표 실행: `npm run harness:ai-review-runner -- --apply --review-file reference/evidence/fixtures/advisory-ai-review.json`
- 실패 시 첫 대응: advisory output의 `findings` 배열, finding `disposition`, redacted evidence quote, guard overlay 상태를 확인한다.

### `npm run harness:orchestrate`
- 목적: approved packet의 orchestrated-closeout route job을 실행/점검하고 role session output과 closeout package를 생성한다.
- 언제 쓰나: `Delivery route mode: orchestrated-closeout`이고 `planner-to-orchestrator` 이후 adapter/mock 기반으로 Developer, Tester, Reviewer, remediation, Planner closeout 라우팅을 진행하거나 점검할 때.
- 분류: advanced/orchestration command. Orchestrator가 직접 구현, 테스트, 리뷰, approval, packet closeout을 대체한다는 뜻이 아니다. 일반 사용자는 직접 실행보다 `Ready For Code` 승인 packet을 기준으로 Orchestrator workflow 진행을 AI에게 요청하는 방식을 기본으로 쓴다.
- 실패 시 첫 대응: active packet의 `Ready For Code`, delivery route mode, current owner, validation evidence를 먼저 확인한다.

### `npm run harness:migration-preview`
- 목적: 기존 프로젝트 상태를 하네스 기준으로 어떻게 읽고 적용할지 미리 본다.
- 언제 쓰나: 이미 진행 중인 프로젝트에 하네스를 붙일 때.
- 기대 출력: 무엇이 legacy source로 감지됐고 어떤 정리가 필요한지 preview가 나온다.
- 실패 시 첫 대응: 기존 프로젝트의 주요 문서와 source root가 실제로 존재하는지 확인한다.

### `npm run harness:migration-apply`
- 목적: preview에서 확인한 초기 정리를 실제 하네스 상태에 반영한다.
- 언제 쓰나: migration preview 결과를 검토하고 적용하기로 결정한 뒤.
- 기대 출력: legacy source refs 정리와 초기 state 반영 결과가 나온다.
- 실패 시 첫 대응: preview를 다시 보고, 자동 반영해도 되는 범위인지 먼저 확인한다.

### `npm run harness:cutover-preflight`
- 목적: 컷오버 전에 validator, migration 상태, rollback 준비가 맞는지 확인한다.
- 언제 쓰나: 실제 전환 직전.
- 기대 출력: 컷오버 가능 여부와 부족한 증거가 나온다.
- 실패 시 첫 대응: validator error, migration 잔여 항목, rollback bundle 누락을 먼저 확인한다.

### `npm run harness:cutover-report`
- 목적: 컷오버 근거를 report artifact로 남긴다.
- 언제 쓰나: preflight가 통과하고 최종 evidence를 남길 때.
- 기대 출력: Markdown/JSON 컷오버 리포트가 생성된다.
- 실패 시 첫 대응: `cutover-preflight`를 다시 실행해 blocker가 없는지 먼저 확인한다.

## Risk-Adaptive Gate Integration

이 통합은 이전 운영 흐름에서 남아 있던 큰 기술 부채를 정리한다. 위험도 적응형 명령들은 유용하지만, 별도 `v24` 명령을 실행하지 않으면 기존 운영 루프에서 빠질 수 있었다. 이 통합은 이 문제를 줄이기 위해 공통 risk-adaptive gate engine을 만들고, 이를 `packet-preflight`, `transition`, `validation-report`에 연결한다.

운영자가 기억할 핵심은 아래다.

| 경계 | 통합 동작 |
|---|---|
| `packet-preflight --stage implementation-transition` | dependency, secret, untrusted content, guard/freeze, reproduction gate evidence가 없으면 block |
| `harness:transition planner-to-developer` / `planner-to-orchestrator` | 구현 전환 전에 필요한 overlay evidence가 없으면 block |
| `harness:validation-report` | active packet의 risk-adaptive diagnostics와 blocking 여부를 보여 줌 |
| `harness:risk-gate` | 특정 packet/stage에 대한 gate를 직접 확인 |

이 통합은 모든 작업을 무겁게 만들기 위한 것이 아니다. overlay가 없는 micro/light 작업은 계속 lean하게 진행한다. 다만 위험 표면이 감지된 작업은 해당 evidence를 닫기 전에는 구현 전환이나 closeout을 통과할 수 없다.

대표 명령:

```powershell
npm run harness:risk-gate -- --packet reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md --stage implementation-transition
npm run harness:packet-preflight -- --packet reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md --stage implementation-transition
npm run harness:transition -- --transition planner-to-developer --work-item WORK_ITEM_ID
npm run harness:validation-report
```

기존의 `dependency-intake`, `secret-scan`, `untrusted-scan`, `guard`, `evidence-quality`, `abstain` 명령은 계속 evidence digest를 만드는 데 사용한다. 이 통합은 그 evidence가 실제 운영 경계에서 빠지지 않도록 하는 통합 계층이다.
