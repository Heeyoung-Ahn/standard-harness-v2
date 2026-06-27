---
doc_id: HUMAN_HARNESS_MANUAL_GETTING_STARTED
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# Getting Started

처음 실행하는 운영자는 먼저 `first-run-rehearsal.md`의 5-minute primary path를 따른다. 이 문서는 상세 배경 설명이며, 빠른 실행 순서와 command block classification은 `first-run-rehearsal.md`가 우선이다. 실제 프로젝트 검증 이후 개선 명령의 순서와 evidence 해석은 `reference/manuals/human/post-validation-coverage-map.md`를 본다.

## 1. 하네스란 무엇인가

표준 하네스는 프로젝트를 어떻게 개발할지 통제하는 운영 프레임이다.
코드 생성기나 템플릿만 있는 도구가 아니라, 요구사항 정리, 승인 경계, 구현 단위 packet, handoff, 검증 리포트, 재진입 상태까지 한 흐름으로 묶는 체계다.

사람에게는 지금 어디까지 왔는지, 무엇을 결정해야 하는지, 다음에 무엇을 해야 하는지를 빠르게 보여 준다.
AI에게는 어디를 먼저 읽어야 하는지, 어떤 문서를 정본으로 따라야 하는지, 언제 구현을 멈추고 승인을 받아야 하는지를 강제한다.

이 하네스의 기본 원칙은 아래와 같다.

- 정본과 파생물을 구분한다.
- 문서와 승인 경계 없이 바로 구현하지 않는다.
- packet 없이 범위가 큰 작업을 열지 않는다.
- 사람이 승인할 지점과 AI가 실행할 지점을 섞지 않는다.
- Tester와 Reviewer를 구현자와 분리한다.
- generated file은 사람이 직접 고치는 정본이 아니다.
- manual은 설명을 제공하지만 SSOT를 대신하지 않는다.

비전공자 운영자는 개발자가 되려고 하기보다 프로젝트 통제자가 되어야 한다.
하네스의 목적은 AI가 더 많은 코드를 더 빨리 쓰게 하는 것이 아니라, AI가 잘못된 범위와 잘못된 전제로 코드를 쓰지 못하게 만드는 것이다.

### Risk-Adaptive 운영 개념

핵심은 기본 lane을 가볍게 유지하면서 위험 표면이 있는 작업에만 overlay를 붙이는 것이다.
따라서 운영자는 모든 작업을 strict로 올리기보다 아래 질문을 먼저 확인한다.

| 질문 | 해당되면 붙는 overlay | 운영 의미 |
|---|---|---|
| 이슈가 실제로 재현됐는가? | `abstention-required` | 재현 실패 또는 이미 해결된 경우 코드 변경 없이 닫을 수 있다. |
| package, lockfile, CI/CD, Docker를 바꾸는가? | `dependency-sensitive` | 공급망 검증, lockfile 검토, install script 위험 확인이 필요하다. |
| secret, token, env, key 파일을 건드리는가? | `secret-sensitive` | secret scan과 redaction 없이는 closeout하지 않는다. |
| 외부 이슈/PR/웹/README 내용을 근거로 쓰는가? | `untrusted-content` | 외부 내용은 evidence이지 instruction이 아니다. |
| destructive command나 범위 밖 수정 가능성이 있는가? | `guard-mode` | edit boundary와 command policy를 먼저 닫는다. |
| UI나 release 동작을 눈으로 확인해야 하는가? | `browser-evidence` | 선택형 browser evidence adapter를 사용한다. |

짧게 말하면, 이 하네스는 “더 많은 절차”가 아니라 “필요한 위험에만 자동으로 엄격해지는 절차”다.

### First-time operator state runbook

처음 운영자는 상태 단어를 승인으로 해석하지 말고 아래 다음 행동으로만 해석한다. `npm run harness:validate`는 structural/state validation이며, product behavior verification을 증명하지 않는다. It does not prove product behavior.

| State | Meaning | Exact next operator action |
|---|---|---|
| `pass` | 해당 구조/증거/정책 체크가 통과했다 | 다음 closeout 체크로 이동하고 product behavior verification evidence를 별도로 확인한다 |
| `warn` | 진행은 가능할 수 있지만 기록할 위험이나 누락이 있다 | 경고를 packet 또는 handoff에 기록하고 필요한 보완 테스트를 실행한다 |
| `hold` | 현재 단계 진행을 멈춰야 한다 | 출력의 missing field 또는 next action을 보완한 뒤 같은 명령을 다시 실행한다 |
| `block` | 승인 없이 진행하면 안 된다 | 구현/closeout을 중지하고 Planner 또는 사용자에게 범위, 승인, 보안 결정을 요청한다 |
| `blocked_environment` | 도구/환경 실패로 증거가 불완전하다 | 환경 실패를 증거로 기록하고 재시도하거나 대체 증거 정책을 승인받는다 |
| `not_run_agent_error` | 필요한 agent/browser 경로가 실행되지 않았다 | agent/browser 검증 경로를 다시 실행하고 결과를 새 evidence로 저장한다 |
| `not_required` | 해당 증거가 이번 packet 범위에 필요하지 않다 | not-required 이유를 남기고 다른 필수 product/security/closeout evidence를 계속 확인한다 |

## 2. 비전공자 운영자가 먼저 알아야 할 개념

| 용어 | 쉬운 설명 | 하네스에서 보는 위치 |
|---|---|---|
| Project | 하나의 업무 시스템 또는 제품 | repo root |
| Repository | 프로젝트 파일철 | Git repository |
| Branch | 원본을 직접 건드리지 않는 수정 줄기 | Git branch |
| Worktree | 같은 repository의 독립 작업 책상 | 별도 작업 폴더 |
| Commit | 특정 시점 저장 도장 | Git history |
| Pull Request | 수정본을 원본에 반영해도 되는지 검토 요청 | GitHub 등 |
| Frontend | 사용자가 보는 화면 | product source |
| Backend | 화면 뒤에서 규칙을 처리하는 서버 | product source |
| Database | 데이터를 보관하는 장부 | schema, migrations |
| API | 화면과 서버가 대화하는 통로 | API spec |
| Test | 의도대로 동작하는지 확인하는 절차 | test evidence |
| Deploy | 실제 사용 가능한 환경에 올리는 작업 | deploy packet |
| Rollback | 문제 발생 시 이전 상태로 되돌리는 작업 | rollback boundary |
| Log | 시스템이 남긴 활동 기록 | runtime logs |
| Environment | 개발, 테스트, 운영 공간 | topology evidence |
| SSOT | 하나의 사실에 대해 하나의 정본만 둔다는 원칙 | `.agents/artifacts/*` |
| Packet | 작업 범위와 승인 기준을 닫는 문서 | `reference/packets/*` |
| Active Context | 현재 상태를 다시 읽기 위한 요약 | `.agents/runtime/ACTIVE_CONTEXT.*` |
| Handoff | 다음 역할로 넘기는 명시적 전환 | handoff log |

비전공자가 특히 지켜야 할 원칙은 아래다.

- 문서는 코드보다 먼저 확정한다.
- 원본 브랜치에서 바로 기능 개발하지 않는다.
- 한 thread에 모든 일을 몰아넣지 않는다.
- 요구사항, 화면, 데이터, API, 테스트 문서가 서로 연결돼야 한다.
- 배포 전에는 롤백 방법과 백업 상태를 확인한다.
- 검증 기준 없이 "일단 만들어 달라"고 요청하지 않는다.

### 2.1 먼저 구분해야 할 것

처음 운영자가 가장 많이 헷갈리는 것은 아래 다섯 가지다.

| 항목 | 이것이 뜻하는 것 | 이것이 아닌 것 |
|---|---|---|
| manual | 사람이 읽는 설명서 | workflow authority |
| SSOT | 승인된 정본 | generated file |
| packet | 이번 작업의 범위와 승인 기준 | 아무 작업 메모 |
| profile | 어떤 종류의 일을 하는지 | governance 강도 |
| starter mode | 사람이 빠르게 고르는 운영 강도 별칭 | 설치 시 고정하는 전역 옵션 |

짧게 기억하면 이렇게 보면 된다.

- `profile`은 작업 성격이다.
- `starter mode`는 운영 강도다.
- `packet`은 이번 일의 경계다.
- `manual`은 설명서다.
- 실제 현재 상태는 DB hot-state, latest handoff, packet status, `ACTIVE_CONTEXT`를 먼저 보고, `CURRENT_STATE`와 `TASK_LIST`는 필요할 때만 compatibility/generated view로 함께 본다.
- starter seed / generated state 경계는 `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md`를 기준으로 본다. 초기화 전(pre-init) clean payload의 `ACTIVE_CONTEXT.brief.md`는 starter seed read surface이며 live project truth가 아니다. `starter_bootstrap_pending`은 예상 가능한 pre-init hold이고, post-init project state는 `harness:init` 이후 생성되는 runtime output으로 판단한다.

### 2.2 Operator One-Page Checklist

작업 시작 전에 아래 순서만 먼저 본다.

1. `ACTIVE_CONTEXT`를 먼저 본다.
2. `CURRENT_STATE.md`와 `TASK_LIST.md`는 `ACTIVE_CONTEXT`가 명시적으로 요구하거나 fallback/troubleshooting이 필요할 때만 본다.
3. starter를 방금 복사한 직후라면 `ACTIVE_CONTEXT.*`와 `VALIDATION_REPORT.*`가 아직 없을 수 있고, `CURRENT_STATE.md`와 `TASK_LIST.md`는 starter placeholder일 수 있으니 `harness:init` 또는 `harness:context` 이후 다시 본다.
4. 지금 작업에 packet이 필요한지 확인한다.
5. 구현이나 문서 변경이면 `Ready For Code`가 있는지 확인한다.
6. 지금 역할이 Planner, Developer, Tester, Reviewer 중 무엇인지 확인한다.
7. next workflow가 명확하지 않으면 멈추고 route를 다시 확인한다.
8. generated docs가 이상해 보여도 generated file을 직접 고치지 않는다.
9. `full-governance`는 risk-triggered 또는 explicit choice가 아니면 기본 선택으로 쓰지 않는다.
10. packet/validator에서 실제로 보는 정식 값은 `light` / `standard` / `contract` / `release` gate profile임을 기억한다.
11. 혼자 운영 중이면 solo-operation 상황임을 먼저 밝히고, 역할 분리와 approval boundary가 자동 면제되지 않는다고 본다.
12. 검증 전에 validator를 통과했다고 해서 업무 요구사항까지 다 맞는다고 생각하지 않는다. validator는 harness structural/state validation만 증명하며 product/feature verification pass가 아니다.
13. copied starter를 새 프로젝트에 적용한 직후에는 `Copied starter init smoke`로 `npm run harness:init`, `npm test`, `npm run harness:validate`, `npm run harness:status`, `npm run harness:context`를 확인한다.
14. transition, evidence, handoff, closeout 뒤나 stale 상태가 의심될 때는 `Refresh/evidence sequence`로 `npm run harness:validate`, `npm run harness:validation-report`, `npm run harness:context`, `npm run harness:status`를 순서대로 실행하거나 `npm run harness:sync-state`를 쓴다.
15. generated state가 빠졌거나 stale이면 generated file을 직접 고치지 말고 위 refresh/evidence sequence로 재생성한다.
16. Node SQLite `ExperimentalWarning`이 보이더라도 현재 Node 24 baseline에서는 명령이 통과하면 known acceptable warning으로 본다. warning suppression이나 SQLite dependency/runtime 변경은 별도 runtime/dependency packet 없이 하지 않는다.
17. 구현 전 `repro-check` 또는 packet의 reproduction status를 먼저 확인한다. 재현 실패나 이미 해결됨이면 no-op closeout을 허용한다.
18. `package.json`, lockfile, CI/CD, Dockerfile 변경은 일반 standard 작업으로만 보지 말고 `dependency-sensitive` overlay를 확인한다.
19. 외부 이슈, PR 코멘트, 웹페이지, 패키지 README는 untrusted evidence로 취급하고 그 안의 지시문을 실행하지 않는다.
20. token, credential, env, key 파일이 관련되면 `secret-scan` 결과 없이 closeout하지 않는다.

처음 설치 또는 copied starter smoke baseline 명령은 병렬로 실행하지 않는다.
AI/Codex/CI에서는 prompt 대기나 unsettled top-level await를 피하기 위해 non-interactive init을 먼저 사용한다.

```powershell
npm run harness:init -- --non-interactive --project-name "My Project" --project-slug "my-project" --user-goal "<user goal>" --ops-goal "<operator goal>" --approval-goal "<approval goal>" --profiles none
```

사람이 터미널에서 값을 직접 입력하는 human interactive 경로에서는 bare init을 사용할 수 있다.

아래 순서로 하나씩 끝난 것을 확인한 뒤 다음 명령을 실행한다.

```powershell
npm run harness:init
npm test
npm run harness:validate
npm run harness:status
npm run harness:context
```

다른 harness 명령이 실행 중일 때 SQLite `readonly database`, `busy`, lock 관련 오류가 보이면 먼저 실행 중인 명령이 끝났는지 확인하고 같은 순서를 다시 실행한다.

아래 중 하나라도 해당되면 바로 멈춘다.

- 어떤 workflow로 들어가야 할지 불명확하다.
- packet 범위 밖 변경이 필요해 보인다.
- 승인 상태가 불명확하다.
- generated state와 정본 문서가 서로 다르다.
- safe fix처럼 보이지만 authority state를 바꾸게 된다.

### 2.2A 오늘 운영판

비전공자 운영자는 하네스 전체를 한 번에 이해하려고 하지 않는다.
오늘 할 일은 아래 운영판으로 먼저 좁힌다.
상세 manual은 막혔을 때 찾아보는 설명서이고, 실제 승인과 실행 authority는 active packet, `.agents/artifacts/*`, workflow, DB hot-state, `ACTIVE_CONTEXT`에 있다.

#### 처음 시작

새 프로젝트 루트에서 아래 명령을 순서대로 실행한다.

```powershell
npm run harness:init
npm test
npm run harness:validate
npm run harness:status
npm run harness:context
```

명령은 동시에 실행하지 않는다.
`ACTIVE_CONTEXT.*`와 `VALIDATION_REPORT.*`가 copied starter 직후에 없는 것은 정상이다.
`harness:init` 또는 `harness:context`가 현재 프로젝트 기준으로 다시 만든다.

#### 매일 시작

```powershell
npm run harness:status
npm run harness:context
```

사람은 `Harness Status`의 `Next action`과 `.agents/runtime/ACTIVE_CONTEXT.md`를 먼저 본다.
AI는 `.agents/runtime/ACTIVE_CONTEXT.json`을 먼저 읽고 matching workflow로 들어간다.
`CURRENT_STATE.md`와 `TASK_LIST.md`는 `ACTIVE_CONTEXT`가 요구하거나 troubleshooting이 필요할 때만 보조로 본다.

#### 전체 순서

```text
START_HERE
-> PROJECT_STARTER_DOC_PACK
-> PLN-00 Deep Interview
-> REQUIREMENTS
-> PLN-01 Requirements Freeze
-> Architecture / Implementation / UI sync
-> Work Item Packet
-> Ready For Code
-> Developer
-> Tester
-> Reviewer
-> Planner closeout
-> Deployment/Cutover packet
-> Deployer
-> Handoff / Documenter
```

#### 손으로 고쳐도 되는 파일

- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/artifacts/ACTIVE_PROFILES.md`
- active packet
- approved project artifact

#### 손으로 고치면 안 되는 파일

- `.agents/runtime/ACTIVE_CONTEXT.*`
- `.agents/runtime/generated-state-docs/*`
- `.agents/runtime/reports/*`
- `.harness/operating_state.sqlite`

이 파일들이 이상하면 직접 고치지 말고 정본 문서와 DB state를 맞춘 뒤 `harness:sync-state`, `harness:validation-report`, `harness:context`로 다시 만든다.
위 목록은 일반적인 non-editable generated/runtime surface 예시다. 반대로 `.agents/artifacts/*`의 governance 파일은 모두 항상 손으로 고쳐도 된다는 뜻이 아니다.
`REQUIREMENTS.md`, `ARCHITECTURE_GUIDE.md`, `IMPLEMENTATION_PLAN.md`, `ACTIVE_PROFILES.md`, `PROJECT_PROGRESS.md` 같은 governance 파일은 active workflow나 approved packet이 요구할 때만 직접 편집한다.

#### 같은 말처럼 보여도 다른 승인

| 말 | 뜻 | 대체 가능 여부 |
|---|---|---|
| `harness:validate pass` | 하네스 구조와 상태가 맞음 | 제품 검증을 대체하지 못함 |
| `Tester pass` | 구현된 제품 기능을 packet acceptance로 검증함 | Reviewer 판단을 대체하지 못함 |
| `Reviewer pass` | closeout 가능한지 검토함 | 배포 승인을 대체하지 못함 |
| `Deploy approval` | 실제 환경에 올려도 되는지 승인함 | validator나 review만으로 자동 생성되지 않음 |

#### 오늘 멈춰야 하는 상황

- next workflow가 명확하지 않다.
- active packet이 없다.
- 구현 또는 문서 변경인데 `Ready For Code`가 없다.
- 화면, 데이터, 권한, API, 배포 방식이 새로 바뀌었다.
- active optional profile evidence가 `pending`이다.
- `harness:validate`는 통과했지만 Tester evidence가 없다.
- Reviewer가 residual risk를 열어 두었다.
- rollback boundary가 불분명하다.
- generated docs를 손으로 고쳐야 할 것처럼 보인다.

### 2.3 Profile 과 Starter Mode 다시 잡기

운영자가 중간에 가장 많이 헷갈리는 부분은 `profile`, `starter mode`, `gate profile`을 같은 것으로 보는 것이다.

- `profile`: 어떤 종류의 프로젝트나 작업 규칙을 추가로 읽어야 하는지
- `starter mode`: manual에서 빠르게 설명하려고 쓰는 human-facing 운영 강도 별칭
- `gate profile`: packet, validator, runtime이 실제로 쓰는 정식 값

쉽게 말하면:

- `profile`은 작업의 종류를 설명한다.
- `starter mode`는 운영의 엄격함을 설명하는 쉬운 말이다.
- 실제 packet과 validator는 `light`, `standard`, `contract`, `release`를 본다.
- 현재 shipped baseline에서 설치기와 초기화 과정이 실제로 받는 선택값은 `profile`뿐이다.
- `starter mode`는 install/init 시점에 저장되는 전역 스위치가 아니라, 각 lane이나 packet을 열 때 어떤 `Gate profile`로 운영할지 설명하는 말이다.

Packet은 `Risk class`와 `Route class` metadata를 별도로 기록한다.
`Risk class`는 `low`, `normal`, `high`, `critical` 중 하나다.
사람이 선언한 risk보다 validator가 더 높은 risk trigger를 발견하면 effective risk는 더 높은 쪽을 따른다.
반대로 사람이 더 높게 선언한 risk를 validator가 낮추지는 않는다.
`high` risk는 packet, explicit Ready For Code approval, verification/evidence markers가 부족하면 hold한다.
`planning-open` 단계에서는 high effective risk packet을 `Ready For Code: hold`로 열 수 있다.
이 상태는 구현 허가가 아니라 planning hold이며, `planner-to-developer` 또는 `planner-to-orchestrator` 같은 implementation transition에서는 여전히 `Ready For Code: approved`가 필요하다.
`npm run harness:packet-preflight -- --stage planning-open --work-item WORK_ITEM_ID`는 declared / derived / effective risk와 trigger reason을 미리 보여 주고, `--stage implementation-transition`은 같은 packet이 구현 전환에서 block되는지 확인한다.
`critical` risk는 hard stop이며, packet/evidence text에 `Critical human confirmation`, owner, approved/confirmed status, evidence path가 모두 명시되기 전에는 진행하지 않는다.
이 확인은 implicit context, handoff, generated state로 대체할 수 없다.

Strict/high path friction is intentional. It is not a sign that the harness is stuck; it is the cost of changing authority, security, data, approval workflow, reusable runtime, release, or other high-blast-radius surfaces. Expect extra Planner Packet Challenge Review, TDD evidence, security or specialist review, evidence-quality checks, and explicit closeout metadata. Do not downgrade strict/high work to light or standard just to reduce prompts or tests. If the work is only a sandbox or pilot, keep it in a sandbox/pilot packet and record its evidence as learning confidence, not production readiness.

`Route class`는 `fast-path`, `packet-path`, `strict-path` 중 하나로 작업 진입 방식을 설명한다.
이는 gate profile이 아니다.

`Change zone`은 `core`, `load-bearing`, `padded`, `prototype` 중 하나로 변경의 blast radius를 설명한다.
canonical map은 `reference/artifacts/REPOSITORY_LAYOUT_OWNERSHIP.json`이다.
`padded`는 isolated customization/UI/demo 같은 낮은 하중 영역에만 쓴다.
API, auth, schema, shared runtime, reusable packet/template, governance truth, backend/server 경로가 포함되면 ownership map이 `packet-path` 또는 더 엄격한 route로 승격한다.
`prototype`은 `prototypes/**` 안에 있을 때만 production-forbidden lane으로 인정하며, production 승격은 별도 modeling gate가 필요하다.

Prototype lane은 빠른 CUJ, UX, customer feedback 학습을 위한 production-forbidden 경로다.
Prototype packet은 `Prototype sandbox path`, `Learning goal`, `Evidence type: CUJ/UX/customer feedback`, `Production-copy prohibition`, `Promotion target packet`, `Modeling Impact required`를 기록한다.
Prototype output은 learning evidence로만 닫을 수 있고, production packet은 prototype learning을 인용하더라도 Modeling Impact와 product packet approval 아래에서 다시 구현해야 한다.
Reviewer는 direct copy/merge, production readiness claim, release readiness claim, 또는 promotion target packet 누락을 closeout hold로 처리한다.

Sandbox/pilot evidence bundle guidance:

- `Pilot scope`: name the scenario, fake/local data, and the non-production path or repository.
- `Confidence claim`: describe what the pilot proves, such as workflow feasibility, API shape, or gate behavior.
- `Production readiness`: record `not-claimed` unless a production packet separately verifies production code, data, security, and release criteria.
- `Promotion boundary`: name the follow-up production packet or explicitly record that no promotion is planned.
- `Payload separation`: for starter or reusable harness work, confirm the pilot did not add files to the reusable payload.
- `Verification evidence`: cite commands, HTTP/browser smoke, logs, screenshots, or reports, but do not treat harness validation as product acceptance by itself.

Route는 아래처럼 해석한다.

- `validation-report`는 requested route, chosen route, eligibility, rejection reason, change-zone route promotion을 자세히 보여준다.
- `status`는 active lane의 chosen route와 gate 상태만 짧게 보여준다.
- `fast-path`가 거절돼도 별도 reviewer/remediation loop를 자동으로 만들지 않고, 기본적으로 `packet-path` fallback으로 시작한다.
- 다만 structured strict-path checklist가 trigger되면 chosen route는 `strict-path`가 된다.
- `Change zone` mismatch는 ownership map의 route implication에 맞춰 route를 승격하거나, `padded`가 core/load-bearing path를 건드리는 경우 preflight에서 block한다.

### Modeling Impact Gate

`Modeling Impact`는 새 전역 문서가 아니라 packet 안의 compact block이다.
`Change zone`이 `core` 또는 `load-bearing`이거나, changed files가 ownership map에서 core/load-bearing으로 분류되거나, API/schema/auth/security/shared dependency/public contract boundary를 건드리면 구현 전환 전에 이 block이 필요하다.

필수 항목은 아래 여섯 가지다.

- Critical User Journey
- API contract
- Component responsibility
- Allowed dependency direction
- Data ownership
- Public contract vs internal/scratch field

`padded` 작업은 위 경계를 건드리지 않으면 `Modeling impact status: not-needed`와 짧은 rationale로 충분하다.
여러 packet이 공유하거나 durable public contract가 되는 모델링 결정은 별도 artifact로 승격하고 packet의 `Promoted modeling artifact`에 경로를 적는다.
Developer가 구현 중 모델링/API/component-boundary 오류를 발견하면 patch로 우회하지 말고 Planner로 돌려보낸다.
ordinary bug는 승인된 모델을 바꾸지 않는 local defect이고 Developer remediation으로 고칠 수 있다.
modeling error는 무엇을 만들어야 하는지, API/component 책임, dependency direction, data ownership, public contract를 바꾸는 오류다.
core 또는 load-bearing 작업에서 modeling error를 patch-around로 처리하면 Reviewer closeout blocking 사유다.
closeout에는 modeling error가 없었는지, 발견됐다면 구현을 멈췄는지, Planner가 어떤 모델/packet boundary를 고쳤는지, 잘못 생성된 구현을 버렸는지 기록한다.
잘못 생성된 구현을 버리는 것은 load-bearing slop을 막는 경우 성공으로 본다.

`Fast Path Note`는 DB나 `ACTIVE_CONTEXT`에 저장하지 않고 packet/evidence text에만 둔다.
`Fast Path Note`에는 아래 항목을 구조적으로 적는다.

- `requested change`
- `why low risk`
- `data migration: no / yes`
- `auth/security: no / yes`
- `external API contract: no / yes`
- `release/deploy/cutover: no / yes`
- `schema change: no / yes`
- `workflow/validator authority: no / yes`
- `architecture or reusable runtime change: no / yes`
- `files changed`
- `verification run`
- `residual risk`
- `follow-up needed`

운영자는 아래처럼 대응해서 보면 된다.

| 사람 설명 | 실제 gate profile | 언제 주로 보나 |
|---|---|---|
| `minimal` | 보통 `light` | 문서 위주, note 위주, 실행물 변화 없음 |
| `standard` | `standard` | 일반적인 packet 기반 구현/검증 |
| `full-governance` | 보통 `contract` | reusable contract, workflow, validator, root/starter sync 영향 |
| `full-governance` 중 release 성격 | `release` | installer, packaging, release baseline, cutover 영향 |

기본 판단:

| 상황 | 추천 |
|---|---|
| 혼자서 작게 검토만 한다 | `minimal` 검토 가능 |
| 일반적인 packet 기반 구현/검증 | `standard` 기본 |
| 승인 경계, 위험 변경, 릴리스/데이터 영향이 크다 | `full-governance` 검토 |

`minimal`은 빠르게 시작하기 위한 선택일 뿐, risk trigger를 무시하는 면허가 아니다.
그리고 manual에서 `full-governance`라고 설명하더라도 packet header, validator finding, transition evidence에서는 실제 gate profile id인 `contract` 또는 `release`를 찾아야 한다.

중요한 설계 포인트는 아래다.

- 같은 프로젝트라도 대화나 lane마다 운영 강도는 달라질 수 있다.
- 가벼운 문서 정리, 범위 검토, note성 작업은 `light`에 가까운 판단으로 다룰 수 있다.
- 일반 구현/검증은 보통 `standard`를 쓴다.
- reusable contract, workflow, validator, root/starter sync, release/cutover 영향이 생기면 `contract` 또는 `release`로 올린다.
- 즉 "이 프로젝트는 항상 minimal" 또는 "이 프로젝트는 항상 full-governance"처럼 프로젝트 전체에 한 번 고정하는 설계가 아니다.

### 2.4 Profile Reselection / Reset Playbook

#### 아직 승인 전

- 요구사항이나 범위가 흔들리면 Planner로 돌아간다.
- profile이 잘못 켜졌다면 profile evidence를 억지로 맞추지 말고, 어떤 profile이 필요한지 다시 정한다.
- starter mode가 애매하다면 전역 설정을 찾지 말고, 이번 lane이 어떤 `Gate profile`이어야 하는지 다시 정한다.
- packet이 없거나 packet 범위가 틀리면 구현으로 가지 않는다.

#### 상세 합의는 끝났고 구현 전

- `Ready For Code`가 없으면 Developer 작업을 열지 않는다.
- starter mode가 과하게 무겁거나 가볍다고 느껴지면 route와 active packet의 `Gate profile`을 다시 확인한다.
- manual, packet, state 문서가 서로 다른 말을 하면 먼저 정본을 맞춘다.

#### 구현이 이미 시작된 뒤

- active lane owner를 임의로 바꾸지 않는다.
- packet 범위가 틀렸다면 Developer가 계속 덮지 말고 Planner로 되돌린다.
- profile reset이 필요해도 generated docs만 고치지 말고 승인된 state operation이나 transition 경로를 쓴다.
- starter mode를 바꾸고 싶다면 active packet의 `Gate profile` 판단을 Planner가 다시 닫거나, 필요하면 새 packet/lane으로 다시 연다.
- 설치 시점의 전역 `starter mode` 값을 수정하는 절차는 없다. 현재 baseline은 그 값을 저장하지 않기 때문이다.

다시 잡아야 할 때 운영자가 바로 할 말:

```text
현재 profile 또는 starter mode 판단이 맞는지 다시 확인해 주세요.
지금 lane owner와 승인 상태를 유지한 채, 어떤 문서를 정본으로 보고 어디서 멈춰야 하는지 먼저 정리해 주세요.
```

### 2.5 Validation Caveat

`harness:validate`와 `harness:validation-report`의 `pass`는 harness structural/state validation과 workflow evidence 정합성만 의미한다. 이것은 product/feature verification pass가 아니며, 실제 제품 동작 증거는 Tester, Reviewer, product-specific acceptance가 별도로 책임진다.

validator가 `pass`라고 해서 아래까지 자동으로 보장되는 것은 아니다.

- 요구사항이 충분히 맞는지
- 업무 규칙이 올바른지
- 사람이 기대한 운영 흐름인지
- 문구가 오해 없이 읽히는지
- 실제 배포나 cutover가 안전한지

validator는 주로 이런 것을 본다.

- 정본과 파생물의 정합성
- 필요한 evidence 존재 여부
- handoff / state / packet 간 모순 여부
- freshness와 parity
- harness structural/state validation 통과 여부

제품/기능 검증은 아래 evidence로 닫는다.

- Tester walkthrough와 targeted test 결과
- Reviewer closeout 판단
- product-specific acceptance evidence

따라서 `pass`는 "이제 끝"이 아니라 "다음 검토로 넘어갈 수 있는 상태"로 읽는 것이 맞다.

### 2.6 Safe Fix Guide

안전한 수정은 좁게 본다. 아래는 보통 safe fix로 볼 수 있다.

- generated docs 재생성
- `ACTIVE_CONTEXT` 재생성
- validator / validation-report 재실행
- 이미 승인된 transition 또는 state operation 재적용
- root와 `standard-template` 문구 parity 수정

아래는 safe fix로 보면 안 된다.

- `CURRENT_STATE.md`, `TASK_LIST.md`, approval state를 수동으로 사실상 재정의
- packet status를 handoff 없이 바꾸는 일
- reviewer evidence를 생략하거나 추정으로 채우는 일
- cutover / rollback 결정을 문서만 바꿔서 닫는 일
- DB hot-state를 임의로 고치는 일
- workflow authority를 manual 문구로 바꾸는 일

애매하면 이렇게 본다.

- derived output만 다시 만드는 일: 대체로 안전
- authority state를 바꾸는 일: 안전하지 않음

### 2.7 혼자 운영할 때와 Minimal Mode를 쓸 때

혼자 운영할 때도 역할 분리는 사라지지 않는다.

- 혼자 한다고 Planner와 Developer 판단을 한 문장으로 합치지 않는다.
- 혼자 한다고 Tester와 Reviewer 검증이 자동 면제되지 않는다.
- 혼자 한다고 approval boundary가 사라지지 않는다.

`minimal`을 먼저 검토해도 되는 경우:

- 요구사항 정리만 하는 초기 검토
- 구현 없는 문서 정리
- 위험이 낮은 상황 점검
- 새 lane을 열기 전 route 확인

`standard` 이상으로 올려야 하는 신호:

- 구현이 열린다
- 승인 상태가 바뀐다
- packet이 새로 열린다
- state drift나 source conflict가 있다
- 데이터, 배포, migration, cutover 성격이 보인다

## 5. 프로젝트 시작 절차

새 프로젝트를 처음 적용하는 진입 흐름은 `START_HERE.md`가 담당한다.
manual에서는 그 이후 운영자가 lifecycle 전체에서 어떤 기준을 유지해야 하는지 설명한다.

새 프로젝트 kickoff의 최신 기준은 아래 순서다.

1. `npm run harness:init`
2. `npm run harness:status`
3. `PROJECT_STARTER_DOC_PACK.md` rough baseline 작성
4. `PLN-00_DEEP_INTERVIEW.md`로 implementation-critical 질문 정리
5. `.agents/artifacts/REQUIREMENTS.md` 반영
6. `PLN-01_REQUIREMENTS_FREEZE.md`에 approved / deferred / open 상태와 human approval boundary 기록
7. freeze가 충분히 닫힌 뒤 architecture / implementation / UI sync와 첫 packet 검토

이 문서 팩, `PLN-00_DEEP_INTERVIEW.md`, `PLN-01_REQUIREMENTS_FREEZE.md`가 충분히 닫히기 전에는 architecture / implementation / UI sync나 첫 task packet으로 넘어가지 않는다.

설치와 초기화 단계에서 먼저 구분할 점:

- 설치기와 `harness:init`이 직접 받는 선택값은 `Active profiles`다.
- `starter mode`는 이 시점에 고르는 별도 입력값이 아니다.
- 실제 운영 강도는 첫 packet을 열 때 `Gate profile`을 `light` / `standard` / `contract` / `release` 중 무엇으로 둘지 결정하면서 정한다.
- 그래서 설치 후에 "starter mode를 바꾸는 명령"을 찾기보다, 현재 또는 다음 packet의 `Gate profile` 판단이 맞는지 보는 것이 맞다.

kickoff에서 닫아야 할 항목은 아래다.

1. 프로젝트 목적 정의
2. 사용자 역할 정의
3. 업무 흐름 정의
4. 기능 범위와 제외 범위 정의
5. 화면 목록 정의
6. 데이터 항목 정의
7. 권한과 승인 규칙 정의
8. 테스트 기준 정의
9. 배포 및 운영 기준 정의
10. freeze 전 blocker 구분

운영자가 해야 할 일은 완벽한 설계서를 처음부터 쓰는 것이 아니다.
빠진 질문을 드러내고, `PLN-01` freeze 전에 반드시 닫아야 할 blocker와 나중으로 미룰 항목을 구분하는 것이다.

freeze 이후 작업 순서:

1. `ARCHITECTURE_GUIDE.md` 기준 설계 boundary 정리
2. `IMPLEMENTATION_PLAN.md`에 현재/다음 구현 순서와 blocker를 짧게 정리
3. 첫 packet drafting
4. `Ready For Code` 승인
5. 구현 thread 시작

처음부터 모든 문서를 완벽히 닫으려 하지 말고, 아래 세 단계를 나눈다.

- 초안: 빠진 항목을 보이게 만든다.
- 합의안: 사람이 판단해야 할 선택지를 줄인다.
- 승인안: 구현자가 임의 해석하지 않아도 되는 상태로 만든다.

## 18. 설치 후 정상 동작 확인

최초 적용과 kickoff 준비 순서는 `START_HERE.md`를 따른다.
이 섹션은 설치 후 하네스가 정상 상태인지 확인하는 운영 체크다.

Docs/smoke authority boundary:

- `reference/manuals/human/HARNESS_MANUAL.md`가 운영 기준과 smoke 해석의 primary authority다.
- `README.md`는 저장소 개요이고 `START_HERE.md`는 사람용 시작 정본이며, 둘 다 AI SSOT와 validator 권위를 대체하지 않는다.
- root maintainer history, review evidence, walkthrough evidence, OPS/PLN packet history는 root-only이며 `standard-template`에 ship하지 않는다.
- copied starter smoke는 local starter baseline 확인이다. 새 smoke fixture, install/copy 실행 흐름, release packaging smoke는 이 baseline에 포함하지 않고 별도 packet으로 split한다.
- smoke evidence는 targeted docs/smoke tests, root full tests, `standard-template` full tests, `validation-report`, `validate`, `status`, `context`로 닫는다.
- 이 smoke evidence는 harness structural/state validation과 starter guidance consistency를 증명하며 product/feature verification pass가 아니다.

처음 사용자는 copied starter 기준으로 아래 최소 smoke baseline까지만 확인하면 된다.
아래 명령은 동시에 실행하지 말고 순서대로 하나씩 실행한다.

1. `npm run harness:init`
2. `npm test`
3. `npm run harness:validate`
4. `npm run harness:status`
5. `npm run harness:context`

검증 결과를 파일로 남겨야 하면 `npm run harness:validation-report`를 추가로 실행한다.
그 뒤 `npm run harness:context`, `npm run harness:status`를 순서대로 다시 실행하거나 `npm run harness:sync-state`를 사용해 리포트와 Active Context를 같은 시점으로 맞춘다.
installer/release packaging smoke는 이 copied starter baseline의 범위가 아니며, release 성격의 packet에서 별도로 닫는다.
다른 harness 명령이 아직 실행 중인데 `status`, `context`, `validation-report`를 동시에 실행하면 SQLite lock 또는 `readonly database`처럼 보이는 오류가 날 수 있다.
이 경우 generated file을 손으로 고치지 말고 실행 중인 명령이 끝난 뒤 위 baseline을 순서대로 다시 실행한다.

기대 결과:

- 초기 질문이 끝나고 프로젝트 초기화가 완료된다.
- starter harness tests가 통과한다.
- 현재 stage와 next action이 나온다.
- `.agents/runtime/ACTIVE_CONTEXT.json`과 `.md`가 생성된다.
- validator 결과가 이해 가능한 형태로 나온다.
- Node SQLite `ExperimentalWarning`이 출력되더라도 명령이 통과하면 현재 baseline에서는 known acceptable warning으로 기록한다.

실패하면 가장 먼저 볼 것:

- Node.js 24 이상인지
- 현재 위치가 프로젝트 루트인지
- `.harness/operating_state.sqlite`가 있는지
- `VALIDATION_REPORT`의 첫 finding이 무엇인지

위 단계가 통과하면 kickoff 문서 정리는 `START_HERE.md`의 `Kick-off 표준 흐름`으로 이어간다.

## 19. 기존 프로젝트에 적용하기

이미 진행 중인 프로젝트에도 하네스를 붙일 수 있다.
이 경우에는 새 프로젝트처럼 바로 requirements부터 다시 쓰기보다, 현재 상태를 안전하게 읽어 오는 것이 먼저다.
`START_HERE.md`는 기존 프로젝트가 새 프로젝트 init과 다른 흐름이라는 점만 안내하고, 상세 운영은 이 섹션을 따른다.

기본 흐름:

1. 현재 프로젝트의 주요 문서, source root, 기존 진행 상황을 정리한다.
2. 하네스 파일을 프로젝트 루트에 적용한다.
3. `npm run harness:migration-preview`로 어떤 legacy source가 감지됐고 어떤 정리가 필요한지 본다.
4. preview 결과를 확인한 뒤 `npm run harness:migration-apply`로 초기 상태를 반영한다.
5. `npm run harness:status`, `npm run harness:context`, `npm run harness:validate`로 하네스 기준 상태를 점검한다.

주의할 점:

- migration은 새 기능 설계가 아니라 기존 상태를 하네스 규칙에 맞춰 읽어 오는 단계다.
- preview를 건너뛰고 바로 apply하지 않는다.
- 기존 프로젝트의 실제 요구사항과 승인 상태는 결국 packet과 canonical docs로 다시 닫아야 한다.
- 파일이 많은 기존 repo는 installer/bootstrap 충돌 범위를 먼저 검토한다.
