---
doc_id: HUMAN_HARNESS_MANUAL_TROUBLESHOOTING
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# Troubleshooting

## 22. 트러블슈팅과 FAQ

### Q. copied starter의 최소 smoke baseline은 무엇인가
- 새 프로젝트 루트에서 `npm run harness:init`, `npm test`, `npm run harness:validate`, `npm run harness:status`, `npm run harness:context`를 순서대로 실행한다.
- 이 baseline은 병렬 실행하지 않는다. 한 명령이 끝난 뒤 다음 명령을 실행한다.
- 검증 리포트를 artifact로 남겨야 하는 운영 상황이면 `npm run harness:validation-report`를 추가로 실행한 뒤 `npm run harness:context`, `npm run harness:status`를 다시 실행하거나 `npm run harness:sync-state`를 사용한다.
- 이 baseline은 copied starter 기준이다. installer/release packaging smoke는 별도 release 또는 docs/smoke packet에서 다룬다.

### Q. smoke baseline 중 SQLite `readonly database` 또는 lock 오류가 나온다
- 먼저 다른 harness 명령이 동시에 실행 중인지 확인한다.
- generated docs나 sqlite 파일을 손으로 고치지 않는다.
- 실행 중인 명령이 끝난 뒤 `npm run harness:validate`, `npm run harness:status`, `npm run harness:context`를 순서대로 다시 실행한다.
- 같은 오류가 반복되면 `npm run harness:doctor`와 `npm run harness:context -- --repair` 결과를 확인하고, 그래도 복구되지 않으면 runtime/dependency packet으로 분리한다.

### Q. Node SQLite `ExperimentalWarning`이 나온다
- 현재 Node 24 baseline에서는 명령이 통과하면 known acceptable warning으로 본다.
- 이 warning을 없애거나 dependency/runtime 정책을 바꿔야 한다면 별도 runtime/dependency packet으로 분리한다.

### Q. `ACTIVE_CONTEXT`가 오래된 상태처럼 보인다
- 먼저 최신 handoff와 `npm run harness:status` / `npm run harness:next` 결과가 실제 상태와 맞는지 본다.
- 보통은 `npm run harness:sync-state`를 먼저 실행해 validator, report, context, status를 순서대로 다시 맞춘다.
- 그래도 generated surface가 빠졌거나 복구 신뢰도가 낮아 보이면 `node .harness/runtime/state/dev05-cli.js context --repair`를 실행해 recovery report와 구체 next command를 확인한다.
- 그 다음에도 단순 refresh만 필요하면 `npm run harness:context`를 다시 실행한다.
- 필요하면 `CURRENT_STATE.md`와 `TASK_LIST.md`를 compatibility view로 대조한다.

### Q. copied starter에 `ACTIVE_CONTEXT.json`이나 `.md`가 없다
- installable starter payload는 generated `ACTIVE_CONTEXT.*`를 싣지 않는다.
- 새 프로젝트 루트로 복사한 뒤 `npm run harness:init` 또는 `npm run harness:context`를 실행하면 현재 프로젝트 기준으로 다시 생성된다.
- init/context 전에는 `START_HERE.md`와 starter placeholder `CURRENT_STATE.md` / `TASK_LIST.md`를 bootstrap fallback으로만 참고한다.
- 첫 `VALIDATION_REPORT.*`도 init 뒤 `npm run harness:validation-report`를 실행할 때 생성되는 것이 정상이다.
- `REVIEW_REPORT.md`, `WALKTHROUGH.md`, `HANDOFF_ARCHIVE.md`, `DECISION_LOG.md`, `reference/artifacts/daily/*`도 first use 시점에 직접 만들면 된다.

### Q. `governance_controls.json`과 `open-planner-packet.js`는 왜 남아 있나
- `.agents/runtime/governance_controls.json`은 optional governance가 필요한 프로젝트를 위한 dormant placeholder다.
- 기본 kickoff나 일반 운영에서 먼저 읽는 파일은 아니다.
- `.harness/runtime/state/open-planner-packet.js`는 maintainer나 Planner가 새 packet을 열 때 쓰는 helper다.
- 일반 설치 사용자는 `START_HERE.md`, `HARNESS_MANUAL.md`, CLI 명령, active packet을 기준으로 운영하면 된다.

### Q. `health_snapshot.json`, `team.json`, 닫힌 maintainer packet은 설치 payload에 포함되나
- 아니다.
- `.agents/runtime/health_snapshot.json`과 `.agents/runtime/team.json`은 현재 Active Context/CLI runtime의 필수 입력이 아니다.
- 닫힌 maintainer packet은 root-only history이며, 새 프로젝트 starter history로 복사하지 않는다.
- sqlite, optional skill, multi-agent 정책 요약은 README와 manual에 남기고, closed maintainer packet 자체는 installed starter payload에서 제외한다.

### Q. validator에서 FAIL이 나온다
- 가장 위 finding부터 읽는다.
- 보통 missing evidence, stale generated state, packet registration, profile evidence 누락 중 하나다.
- generated file을 직접 고치지 말고 정본 문서와 packet을 먼저 본다.

### Q. 루트에 `task.md`나 `walkthrough.md`가 있는데 왜 경고가 뜨나
- 이 경고는 root 문서가 canonical harness authority와 경쟁할 수 있을 때만 띄우는 warning이다.
- live authority는 packet, `.agents/artifacts/*`, DB hot-state, `ACTIVE_CONTEXT.*` 쪽에 있고 root `task.md` / `walkthrough.md`는 정본이 아니다.
- 경고가 떴다고 즉시 실패하는 것은 아니지만, 운영자가 그 파일을 현재 state truth처럼 읽고 있지 않은지 먼저 확인해야 한다.
- 계속 쓸 메모라면 packet이나 적절한 reference 위치로 옮기고, historical note면 authority와 혼동되지 않게 분리한다.

### Q. 문서 상단의 `AUTHORITATIVE`, `GENERATED, DO NOT EDIT`, `HUMAN STATUS SUMMARY`, `PACKET` 라벨은 어떻게 읽나
- `AUTHORITATIVE`: 승인된 정본이다. 수동 편집 authority가 여기 있다.
- `GENERATED, DO NOT EDIT`: 파생 출력이다. 직접 고치지 말고 정본과 state를 맞춘 뒤 재생성한다.
- `HUMAN STATUS SUMMARY`: 사람이 빨리 읽으라고 만든 요약이다. live routing authority를 대신하지 않는다.
- `PACKET`: 특정 작업 범위, acceptance, approval boundary를 닫는 작업 단위 문서다.

### Q. 어떤 profile을 켜야 할지 모르겠다
- 현재 shipped baseline에서 바로 쓰는 승인 catalog는 `PRF-01`부터 `PRF-10`까지다.
- 표/그리드 중심이면 `PRF-01`을 검토한다.
- spreadsheet가 authoritative source라면 `PRF-02`를 검토한다.
- airgapped delivery라면 `PRF-03`을 검토한다.
- 가벼운 앱이면 `PRF-07` 또는 `PRF-09`부터 생각한다.
- 기존 Excel/VBA/MariaDB 대체면 `PRF-04`를 검토한다.
- Python/Django backoffice면 `PRF-05`를 검토한다.
- 승인/권한/감사가 핵심이면 `PRF-06`을 먼저 본다.
- BI 플랫폼, 대시보드 포털, metric-serving 제품이면 `PRF-10`을 먼저 검토한다.
- 승인/권한/감사가 핵심이면 관련 profile과 packet evidence를 Planner가 먼저 닫는다.

### Q. PRF-10 BI evidence staging은 어떻게 읽나
- `draft`는 discovery, mock, prototype 단계의 임시 증거이며 구현 승인 근거가 아니다.
- `approved`만 BI-heavy packet의 `Ready For Code` 근거가 될 수 있다.
- `deferred-with-reason`은 이유와 follow-up이 있어야 하며 현재 packet의 BI-heavy 구현 근거로 쓰지 않는다.
- `not-needed`는 해당 packet 또는 evidence surface에 PRF-10이 적용되지 않는다는 뜻이다.
- PRF-10을 켰다는 사실만으로 maintainer repo나 downstream project에 BI evidence가 자동 활성화되지는 않는다.

### Q. packet이 너무 복잡해 보인다
- 처음에는 goal, scope, acceptance, approval boundary만 먼저 닫는다.
- profile, migration, deployment가 얽힐 때만 해당 섹션을 확장한다.

### Q. generated docs를 직접 고쳐도 되나
- 안 된다.
- generated output은 파생물이다.
- 정본과 DB 상태를 고친 뒤 명령으로 다시 생성한다.

### Q. Role Thread Playbook은 꼭 따라야 하나
- workflow authority는 아니다.
- 하지만 새 AI 대화창을 열 때 역할, 범위, 금지사항을 빠뜨리지 않게 하는 표준 시작 템플릿으로 사용한다.

### Q. Automation Catalog는 자동으로 실행되나
- 아니다.
- 어떤 반복 점검을 자동화로 만들지 결정할 때 보는 카탈로그다.
- 실제 자동화 생성은 사용자의 별도 요청과 승인에 따라 진행한다.

### Q. Cloud Local Merge Playbook은 자동 merge 기능인가
- 아니다.
- cloud 결과를 local canonical truth로 가져오기 전에 어떤 절차로 검토, 병합, 검증할지 설명하는 가이드다.
