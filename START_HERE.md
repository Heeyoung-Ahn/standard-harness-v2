---
doc_id: ROOT_START_HERE
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
canonical_human_start: true
canonical_human_manual: reference/manuals/human/HARNESS_MANUAL.md
summary_for_llm: reference/manuals/operator/MANUAL_INDEX.md
---
# Standard Harness 시작 안내

이 파일은 **사람 운영자가 처음 읽는 정본 시작 문서**입니다.
AI가 자동으로 읽는 문서가 아니며, AI가 준수해야 하는 정본은 `.agents/ssot/*`입니다.

## 1. 핵심 원칙

```text
Human manuals are for humans.
SSOT is for agents.
Lean by default.
Strict where risk demands.
```

- 사람은 Human Conductor로서 우선순위, 취향, 승인 경계, 리스크 감수, ship/hold/revise 결정을 내립니다.
- AI는 routed SSOT, active context brief, evidence digest를 우선 읽습니다.
- 사람용 장문 매뉴얼, 개발 기초 설명, 전체 로그는 AI 자동 참조 대상이 아닙니다.
- 작은 작업에는 micro/light lane을 쓰고, 승인·보안·DB·릴리즈 작업에만 strict/release gate를 적용합니다.

## 2. AI와 사람이 읽는 문서 구분

| 목적 | 사람이 읽는 문서 | AI가 기본으로 읽는 문서 |
|---|---|---|
| 시작 안내 | `START_HERE.md` | `.agents/runtime/DOC_ROUTE.json` |
| 전체 매뉴얼 | `reference/manuals/human/HARNESS_MANUAL.md`, `reference/manuals/human/index.md` | `.agents/ssot/AI_OPERATING_CONTRACT.md` |
| 명령 상세 | `reference/manuals/human/commands.md` | `reference/commands/COMMAND_TAXONOMY.md` |
| 개념 이해 | `reference/manuals/human/HARNESS_CONCEPTS.md` | routed SSOT only |
| 프로젝트 운영 | `reference/manuals/human/HOW_TO_RUN_A_PROJECT.md` | `.agents/ssot/PACKET_LANE_RULES.md` |
| 패킷 작성 | `reference/manuals/human/HOW_TO_WRITE_PACKETS.md` | `.agents/ssot/EVIDENCE_GATE_RULES.md` |
| 증거 관리 | `reference/manuals/human/HOW_TO_USE_EVIDENCE.md` | evidence digest / selected schema |
| 개발 기초 | `reference/manuals/human/DEVELOPMENT_BASICS.md` | 자동 참조 금지 |
| 검증 이후 개선 흐름 | `reference/manuals/human/post-validation-coverage-map.md` | 자동 참조 금지 |

AI 기본 read set은 아래 3개입니다.

```text
.agents/runtime/ACTIVE_CONTEXT.brief.md
.agents/runtime/DOC_ROUTE.json
.agents/ssot/AI_OPERATING_CONTRACT.md
```

## 3. 최초 설치 및 검증

Node.js 24 이상에서 실행합니다. Windows에서 일반 로컬 프로젝트로 쓸 경우 Node.js 다운로드 화면의 `using Docker` 명령은 컨테이너 내부용입니다. Docker 안에서 개발할 계획이 아니라면 Windows installer 또는 nvm-windows 같은 로컬 Node 설치 방식을 사용하고, 새 PowerShell에서 아래 명령으로 확인합니다.

```bash
node --version
npm --version
```

정상이라면 `node --version`은 `v24.x.x` 이상, `npm --version`은 npm 버전을 출력합니다. PowerShell에서 `node` 또는 `npm`을 찾을 수 없으면 Node 설치 후 새 터미널을 열거나 PATH 설정을 확인합니다.

AI/Codex/CI에서 copied starter를 초기화할 때는 대화형 prompt를 기다리지 않도록 non-interactive 명령을 먼저 사용합니다.

```bash
npm run harness:init -- --non-interactive --project-name "My Project" --project-slug "my-project" --user-goal "<user goal>" --ops-goal "<operator goal>" --approval-goal "<approval goal>" --profiles none
```

사람이 터미널에서 직접 값을 입력하며 시작하는 human interactive 경로에서는 아래 bare init 명령을 사용할 수 있습니다.

```bash
npm install
npm run harness:payload-boundary
npm test
npm run harness:init
npm run harness:validate
npm run harness:status
npm run harness:context
npm run harness:validation-report
```

`harness:payload-boundary`는 clean reusable starter payload에 maintainer/root-only 산출물이나 prebuilt runtime state가 섞였는지 확인합니다. 초기화가 끝난 실제 프로젝트에는 sqlite, ACTIVE_CONTEXT, validation report 같은 runtime output이 생길 수 있으므로 clean-payload packaging check와 post-init project check를 같은 의미로 보고하지 않습니다. `harness:validate`, `harness:status`, `harness:context`, `harness:validation-report`는 하네스의 structural/state 상태를 확인합니다. 이것은 product/feature verification pass가 아닙니다.

Starter seed / generated state 경계는 `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md`를 봅니다. 초기화 전(pre-init) clean payload에서 `ACTIVE_CONTEXT.brief.md`는 starter seed read surface이며 live project truth가 아닙니다. 이때 `npm run harness:validate`가 `starter_bootstrap_pending`을 반환하면 예상 가능한 pre-init hold로 기록하고, post-init project state 확인은 `npm run harness:init` 이후에 수행합니다.

## 3.1 Starter entrypoints

- `npm run harness:codex-start`로 Codex App 시작 경로를 엽니다.
- `npm run harness:codex-ready`로 구현 시작 전 상태를 확인합니다.
- `npm run harness:codex-task`로 작업 단위 실행을 시작합니다.
- 초기화 profile 입력은 짧은 ID만 사용합니다: `PRF-10`, `PRF-9`, 또는 `PRF-10,PRF-9`. `PRF-10_BI_ANALYTICS_PLATFORM_PROFILE` 같은 파일명은 입력값이 아닙니다.
- 기존 진단/호환성 명령은 유지됩니다.
- 전체 명령 분류는 `reference/commands/COMMAND_TAXONOMY.md`를, 호환성 명령 유지/폐기 기준은 `reference/commands/COMPATIBILITY_COMMAND_POLICY.md`를 기준으로 봅니다.
- maintainer release note는 root repository artifact이며 clean starter payload에는 포함하지 않습니다.

Quick gate는 빠른 lane/browser precheck입니다. packet-aware blocking decision은 `npm run harness:packet-preflight`로 확인합니다.

초기화 직후 `codex-ready`가 `HOLD`를 반환하는 것은 정상일 수 있습니다. fresh starter는 `PLN-00` kickoff interview, `PLN-01` requirements freeze, `PROJECT_STARTER_DOC_PACK` 정리 같은 planner 단계가 먼저 열리므로, approval boundary와 open decision이 남아 있는 동안에는 구현 handoff를 의도적으로 막습니다.

Browser smoke와 HTTP smoke는 별도 evidence입니다. UI 변경에서 Codex Browser 실행을 agent가 누락했다면 `not_run_agent_error`로 기록하고, 이를 product failure나 tool unavailable로 바꿔 쓰지 않습니다.

복사 직후 starter에서는 `ACTIVE_CONTEXT.*` 또는 `VALIDATION_REPORT.*`가 아직 없을 수 있습니다. 이 상태는 known acceptable warning일 수 있으며 실패로 보지 않습니다. SQLite dependency/runtime 변경은 별도 runtime/dependency packet 없이 하지 않습니다. 이 경우 아래 순서로 refresh합니다.

```bash
npm run harness:sync-state
npm run harness:validation-report
npm run harness:context
npm run harness:status
```

## 4. Lean Conductor 기본 운영

먼저 lane을 고릅니다.

| Lane | 사용 상황 | 기본 강도 |
|---|---|---|
| micro | 오타, 작은 README 수정 | note 수준 |
| docs-only | 문서 중심 작업 | docs verification 중심 |
| light | 저위험 단일/소수 파일 수정 | compact packet |
| standard | 일반 기능 개발 | 기본 packet + 기본 evidence |
| strict | 승인, 권한, 보안, DB, 핵심 로직 | full evidence gate |
| release | 배포, migration, rollback | release/cutover gate |
| investigation | 원인 분석, forensic | 조사 packet |

권장 명령은 아래입니다.

```bash
npm run harness:lane -- --files "README.md" --risk low
npm run harness:manual-route -- --lane light --phase implementation --apply
npm run harness:context-brief -- --lane light --phase implementation --apply
npm run harness:packet-lean -- --lane light --id PKT-LIGHT-01 --title "Small fix" --apply
```

## 5. 하루 운영 흐름

### 시작

```bash
npm run harness:day-start-brief -- --lane standard --apply
npm run harness:status
npm run harness:context-brief -- --apply
```

### 작업

```bash
npm run harness:manual-route -- --lane standard --phase implementation --apply
npm run harness:packet-preflight -- --packet reference/packets/[packet].md
npm run harness:evidence
npm test
```

### 마감

```bash
npm run harness:day-wrap-up-brief -- --lane standard --apply
npm run harness:friction-report -- --lane standard --apply
npm run harness:context-brief -- --apply
```

## 6. 막히면 볼 문서

| 문제 | 문서 |
|---|---|
| 전체 개념이 헷갈림 | `reference/manuals/human/HARNESS_CONCEPTS.md` |
| 프로젝트를 어떻게 진행할지 모르겠음 | `reference/manuals/human/HOW_TO_RUN_A_PROJECT.md` |
| packet 작성이 어려움 | `reference/manuals/human/HOW_TO_WRITE_PACKETS.md` |
| evidence가 부담됨 | `reference/manuals/human/HOW_TO_USE_EVIDENCE.md` |
| Git/test/TDD 기초가 필요함 | `reference/manuals/human/DEVELOPMENT_BASICS.md` |
| 전체 상세 설명 필요 | `reference/manuals/human/HARNESS_MANUAL.md`, `reference/manuals/human/index.md` |
| 명령 상세 설명 필요 | `reference/manuals/human/commands.md` |
| 검증 이후 개선 명령 순서와 evidence 해석 | `reference/manuals/human/post-validation-coverage-map.md` |
| 다음 프로젝트용 clean starter 후보를 재생성해야 함 | `reference/manuals/human/starter-promotion.md` |
| 자주 발생하는 오류 | `reference/manuals/human/FAQ.md` |

## 7. 문서 정책 확인

사람용 매뉴얼이 AI 자동 read set에 들어가지 않는지 확인합니다.

```bash
npm run harness:doc-policy
```

정상 결과는 `ok: true`, errors 0입니다.

## 8. kickoff 이후 전체 흐름

```text
kickoff -> requirements freeze -> packet -> Developer -> Tester -> Reviewer -> Planner closeout -> deployment/cutover packet when needed
```

첫 리허설은 `Fresh-start drill pattern`으로 진행합니다. 구현 전에는 packet의 `Verification Manifest`와 lane을 확인합니다. 파일/권한/route 기준은 `reference/artifacts/HARNESS_FILE_ROUTE_AUDIT_MATRIX.md`에서 확인합니다.



## Codex Quick Start

Use this starter through Codex App.

```bash
npm run harness:codex-start
npm run harness:codex-ready
npm run harness:codex-task -- --task TASK-001 --apply
```

Do not start implementation when `codex-ready` returns `HOLD` or `BLOCKED`. Create or repair the packet, evidence, reviewer profile, or approval boundary first.

---

## Codex Browser evidence intake

For UI changes, Codex Browser evidence or an equivalent real-browser evidence source is expected before strict closeout.

```bash
npm run browser:evidence:prompt -- --apply --packet <packet-path> --work-item <work-item-id> --base-url <app-url>
npm run browser:evidence:intake -- --apply --packet <packet-path> --work-item <work-item-id> --status pass --screenshot <png-paths> --observed-result "<observed result>" --scenario-result "<SCENARIO-ID>=pass:<observed behavior>" --console-errors none --network-errors none --output reference/evidence/manifests/<work-item-id>-browser.json
npm run browser:evidence:audit -- --packet <packet-path> --work-item <work-item-id> --strict
npm run harness:packet-preflight -- --stage closeout --packet <packet-path> --work-item <work-item-id> --strict-evidence-manifest --strict-browser-evidence
```

If screenshot capture fails, use `harness:browser-evidence create` with `--status conditional_pass --evidence-type dom_session_transcript` only when the packet policy allows DOM/session fallback. Screenshot-required closeout must stay hold/blocked instead of being relabeled as pass.

Keep this starter clean: product code, project fixtures, generated state, browser artifacts, evidence manifests, and run logs belong to the initialized project, not to the starter payload.

---

## Clean starter promotion

Future product projects can improve the copied `standard-harness` while also accumulating product artifacts and runtime output. To export only reusable harness/starter improvements into a separate target clean starter candidate, use:

```bash
npm run harness:promote-starter -- --to <new-clean-starter-path>
```

Read `reference/manuals/human/starter-promotion.md` before using `--force` or `--verify`. The promotion report is evidence-only; it does not grant release, publish, approval, closeout, risk closure, product verification, or residual-risk acceptance.
