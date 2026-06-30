# PKT-24 설문조사 앱 제품 패킷 (웹앱)

> PLANNING PACKET. This packet defines the first user-facing implementation scope for a new survey web application.
> Product implementation and review require independent `packet_doc_review` before `Ready For Code`.

## Purpose
Implement a standalone survey web application in a separate working folder using `standard-harness-v2` as the delivery harness, then perform behavior-focused e2e review of the implemented product.

## Packet Context
- Packet ID: `PKT-24_SURVEY_APP_WEB_REVIEW`
- Lane type: product-feature
- Risk level: standard (with elevated UI/security review lanes due to user-facing routes and persisted state)
- Change zone: prototype
- Profile evidence status: not-needed (no optional profile required)
- Route class: packet-path
- Delivery mode: orchestrated-closeout
- User-facing impact: high (new product surface)
- Product readiness / UAT gate: required after Developer Done and Tester Product Readiness Gate
- Layer classification: product-feature
- Environment topology reference: separate survey app workspace outside this harness repo; evidence returns to PKT-24 report paths.
- Source environment: clean starter payload copied or used as operating baseline, plus Conductor/Worker CLI runtime.
- Target environment: separate survey app workspace with local browser/runtime evidence.
- Execution target: survey app runtime and browser E2E flow in the separate workspace.
- Transfer boundary: no starter/harness root mutation unless a separate harness-system packet is opened.
- Rollback boundary: discard or archive the separate survey app workspace and keep root repo state limited to packet evidence.
- Domain foundation reference: PKT-24 survey domain model in this packet plus final user-confirmed survey requirements before RFC.
- Schema impact classification: new product data model only; no existing harness DB/schema migration.
- Authoritative source intake reference: user direction for survey app, visual assistance, multiple packets, Conductor delegation, and Codex/Codex worker topology.
- Authoritative source disposition: partial; sufficient for planning registration, not sufficient for RFC.
- Current implementation impact: none until delegated RFC and implementation transition are recorded.
- Existing plan conflict: none; PKT-24 is a product lane and does not replace PKT-25/PKT-26 harness-system improvement packets.
- Impacted packet set scope: single-packet product lane; related improvement packets remain PKT-25 and PKT-26.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-24_SURVEY_APP_WEB_REVIEW` | New user-facing product scope, separated from starter/harness root changes | proposed |
| Packet type | `product-feature` | UI/DB/API/API-like behavior + e2e intent | proposed |
| Risk level | `standard` + UI/security-adjacent review lane | User data capture and runtime state are involved | proposed |
| Route class | packet-path | Product feature requires packet-bound planning, evidence, and review before implementation. | selected |
| Change zone | prototype | Separate product app workspace with evidence bound back to this packet. | selected |
| Gate profile | standard | Product-feature scope uses standard implementation gates plus explicit UI/security/product-readiness checks listed below. | selected |
| Ready For Code | delegated | User requested Conductor delegation for approvals | requires Conductor evidence |
| Packet exit gate | `approved` (when closeout criteria fully met) | Review and evidence requirements are behavior-gated | proposed |
| Human sync needed | `yes` | Confirms final survey requirements (question types, auth model, export format) | yes |
| User-facing impact | `yes` | New interactive web product | yes |
| Layer classification | product-feature | Separate survey web app implementation, not starter/harness-system mutation. | selected |
| Active profile dependencies | none | No optional profile is required for planning registration. | closed |
| Profile evidence status | not-needed | No optional profile evidence is required. | closed |
| UX archetype status | selected | User-facing form submission and results dashboard flow requires UX declaration. | selected |
| UX deviation status | none | No approved deviation is declared at planning registration. | closed |
| Environment topology status | separate-workspace | App implementation must happen outside this harness repo and bind evidence back to PKT-24. | selected |
| Domain foundation status | required | Survey question, response, persistence, and results model must be finalized before RFC. | pending |
| Authoritative source intake status | partial | User direction is captured; final survey requirements still need one-message confirmation. | pending |
| Shared-source wave status | not-needed | No sibling rollout or starter promotion is included. | closed |
| Packet exit gate status | pending | Closeout requires product evidence, independent reviews, Reviewer adjudication, and Planner closeout. | pending |
| Existing system dependency | clean starter payload and separate survey app workspace | PKT-24 consumes the starter as operating model baseline without mutating it. | selected |
| New authoritative source impact | analyzed | Survey scope is a new product lane and does not approve harness-system changes. | closed |
| Risk if started now | high | User-facing data capture and persistence require RFC, e2e, security, and product-readiness evidence first. | hold until delegated RFC |

## 0) Human/Scope Alignment
- Implemented 목표:
  - 별도 폴더에서 설문조사 웹앱을 제작한다.
  - 사용자 질문 등록/제출/응답 저장/결과 조회가 실제 동작해야 한다.
  - Conductor는 Codex, Worker x2는 Codex CLI로 운영한다.
- 제외:
  - 기존 PKT-23 UI 모듈 계약 범위를 넘는 설계-계약 개정
  - 기존 `standard-harness/` 루트의 스타터 하네스 정합성 변경
  - 릴리즈/배포 또는 User UAT 승인 선언

## 1. In Scope
- 별도 폴더에서 web app 프로젝트 생성(예: `C:\30_project\survey-app` 또는 동등한 새 폴더)
- 설문 생성/응답/집계 기본 흐름 구현
- DB/스토리지 연동 (DB가 있으면 영구 저장, 없으면 local persistence strategy for E2E acceptance)
- 사용자 세션/권한 또는 접근 제어 기본
- 자동화된 브라우저 E2E (폼 작성, 제출, 상태 반영)
- Product readiness evidence (runtime, route 접근, session/account, placeholder check)
- Reviewer Product-Quality 체크(설문 결과 정확성/UI 노출 누수/권한/더미 텍스트)
- Conductor 위임 승인 경로 정리

## 2. Out Of Scope
- 스타터 런타임 핵심 계약 변경
- PKT-17~23의 하네스 hardening/closeout 항목 재개
- 실제 사용자 운영 배포 또는 UAT 승인
- 다중 공급자 자동화 확장(현 단계는 Codex 중심 워크플로)

## 3. Core User Story / Acceptance
- 설문 작성자:
  - 설문 제목/설명/질문 리스트(텍스트/단일선택/복수선택/점수형)를 생성할 수 있다.
  - 설문 링크를 공유할 수 있다.
- 응답자:
  - 설문 링크로 접속해 응답을 제출할 수 있다.
  - 제출 후 저장 확인 메시지를 확인한다.
- 운영자:
  - 특정 설문의 제출 수, 질문별 집계, 응답 상세 목록을 조회할 수 있다.
- Product acceptance checks:
  - 제출이 실제 저장되고, 재조회 화면에 반영된다.
  - 잘못된 접근/빈 응답에 대한 유효성 실패 처리 존재.
  - 하드코딩 텍스트/진단 패널/권한 누수 미존재.

## 4. Required SSOT
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/artifacts/TASK_LIST.md` (필요 시 업데이트/체크용)
- `reference/artifacts/APPROVAL_RULE_MATRIX.md`
- `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`
- Human-given survey scope details (요구사항 문답)
- Required reading before code: Requirements, Implementation Plan, Architecture Guide, approval rule matrix, packet exit quality gate, PKT-22/PKT-23 UI/design contracts, frontend-design skill guidance, and finalized survey domain requirements.
- UX archetype reference: `reference/artifacts/UI_DESIGN.md` plus PKT-22/PKT-23 UI/design packet contracts until a packet-specific survey wireframe is produced.
- Selected UX archetype: form-driven creation/submission flow with results dashboard.

## 5. Source Impact
- Product source: `product/`-type implementation under new working folder.
- Test evidence: dedicated app e2e artifacts under `reference/reports/test/PKT-24...`
- Governance evidence: packet closeout evidence bundle in `reference/reports/review`, `reference/reports/closeout`

## 6. Development Folder Strategy (Clean Separation)
- 실제 웹앱은 표준 리포지토리(`standard-harness-v2`)와 동일 폴더에 구현하지 않고,
  별도 폴더 `survey-app-workspace`에서 작성.
- 하네스 변경이 필요한 경우에만 root 프로젝트에서 별도 패킷으로 처리.
- Conductor/Worker 산출은 PKT-24 evidence evidence-path에 바인딩.

## 7. Conductor / Approval Delegation
- Conductor: Codex (app-facing)
- Workers: Codex CLI x2
  - Worker A: 설문 앱 기능 구현(필수 유즈케이스)
  - Worker B: e2e/리뷰 보조 실행 증적 생성
- 승인 경계:
  - `Ready For Code` 및 closeout 관련 승인은 Human delegation via Conductor only.
  - Planner은 해당 승인 실행 주체가 아니다.
  - 모든 승인 실행은 검증 가능한 승인 레코드 경유(evidence path)로만 인정.

## 8. Required Gates (Gate-profile: `product-feature`, `standard` -> strict profile)
- `packet-doc-review` (독립 reviewer)
- `implementation-transition preflight`
- `product-plan trace tests` / requirements mapping
- `unit+integration` (도메인 핵심 로직)
- `browser e2e` (실제 UI 상태 변경 검증)
- `tester product-readiness gate`
- `security-review` (입력 검증, 권한/세션/노출면)
- `code-quality-review`
- `challenge-review`
- `evidence-review`
- `harness validation` (범위가 harness 변경을 직접 건드리면 추가)

## 9. Evidence Plan
| Surface | Required Check | Evidence |
|---|---|---|
| 기능 | 생성/조회/제출/집계 동작 | `reference/reports/test/PKT-24_SURVEY_APP_TEST.md` |
| 브라우저 | 설문 생성~제출~결과 반영 | `reference/reports/test/PKT-24_SURVEY_APP_E2E.md` |
| 보안/권한 | 세션/입력 검증 | `reference/reports/security/PKT-24_SURVEY_APP-security-review.json` |
| 리뷰 | 코드/도전/증빙 | `reference/reports/review/PKT-24_SURVEY_APP-closeout-*.md` |
| Closeout | 패킷 종료 판정 | `reference/reports/review/PKT-24_REVIEW_REPORT.md`; `reference/reports/closeout/PKT-24_PLANNER_CLOSEOUT.md` |
| 승인 | Ready For Code delegation | `reference/reports/planner/PKT-24_READY_FOR_CODE_DELEGATION.md` |

## Planner Packet Challenge Review
- Challenge status: pending before delegated RFC.
- Challenge reviewer: pending independent reviewer.
- Challenge reviewer independence basis: must be independent from Planner authoring, Developer implementation, Tester execution, generated summaries, and closeout Reviewer.
- Source refs reviewed: this packet, user survey scope direction, approval delegation instruction, clean starter payload boundary, PKT-22/PKT-23 UI/design contracts.
- Challenge evidence artifact path: `reference/reports/review/PKT-24-planner-challenge-review.md`.
- Findings disposition: pending.
- Required corrections applied: pending.
- No self-approval claim: this planning note does not approve Ready For Code, implementation, testing, review closeout, release, UAT, residual risk, or productization completion.

## Verification Manifest
- approved packet: not yet approved; delegated RFC requires a packet-bound Conductor approval record before implementation transition.
- Ready For Code: delegated, not yet approved by a packet-bound Conductor approval record.
- validator: root validation is required before and after state transitions that touch this repository.
- Standard-template check: required; this packet must remain separate from starter/harness-system changes.
- targeted test: required for survey create, submit, persistence, result aggregation, validation failure, and authorization/access behavior.
- Browser evidence: required for create-submit-results flow in the separate survey app workspace.
- Active context refresh: required after registration and every state-changing transition.
- handoff: required for Conductor-routed Planner -> Orchestrator execution and every role transition.
- Review closeout: independent packet document review before RFC, then product-quality, challenge, security, code-quality, evidence, Reviewer adjudication, and Planner closeout evidence before closure.

## 10. Approval Boundary
- No implementation or approval-state mutation in root harness without packet boundary.
- No harness release/cutover.
- No closeout without:
  - 독립 packet_doc_review pass (before Ready For Code)
- No closure without:
  - Independent 4-lens closeout evidence (or explicit N/A with evidence)
  - Product-quality reviewer check for user-facing leakage/placeholder
  - Planner closeout.

## 11. Exit Conditions (요건 충족 시)
- 설문 생성/응답/집계 핵심 동작이 실제 DB/스토리지 반영됨
- E2E 리뷰에서 설문 동작/응답 저장/결과 반영 재현
- Reviewer product-quality 항목 통과
- 패킷 문서 review, tester, reviewer, planner closeout 근거 완비
- Product readyness 항목(세션/권한/런타임 반영/placeholder) 충족

## 12. Reopen Trigger
- 설문 앱의 운영 auth, 권한 정책, 결과 데이터 보존 기간, 분석/익스포트 요구사항이 변경되는 경우
- E2E 환경과 실 사용자 동선이 달라져 별도 흐름이 생기는 경우

## 13. Risks
- Node 런타임 접근성: 현재 세션에서 `node` 탐색 이슈가 존재해 harness 명령 실행이 불안정할 수 있음.
- 설문 앱과 하네스 루트가 섞여 생기는 오염 위험
- Worker 출력 신뢰성: Worker 간 결과 일치성/증거 경로 불충분 시 재의뢰 필요

## 14. Implementation Note
- This packet is **not** for modifying starter contracts. It is a productionized feature packet routed through the existing orchestration/approval boundaries.

## 15. Goal Mode Execution (Conductor Delegation)

### Runtime Target
- Build and test a survey web app in a separate folder outside this harness repo, using clean starter payload as the operating model baseline.
- Keep all review/evidence artifacts in this repo under `reference/reports/` and packet-scoped paths only.

### Conductor and Worker Roles
- Conductor (app-facing): Codex App
- Worker A (implementation): Codex CLI
- Worker B (verification/review assist): Codex CLI

### Approval Policy for Goal Mode
- **All required approval mutations** (`Ready For Code`, closeout checkpoint transitions) are delegated to Conductor only.
- Planner/Developer/Tester/Reviewer output is evidence only until Conductor executes approved delegation.
- No state mutation on root repo during this product lane without explicit Conductor-routed packet transition evidence.

### Mandatory Evidence for Goal Completion
- 설문 앱 구현 증빙(패키지/커밋/실행 산출물)
- 브라우저 E2E 증빙(폼 생성, 설문 제출, 결과 반영)
- 테스트 커버리지 증빙(핵심 기능/유효성/오류 시나리오)
- 독립 리뷰-lens 증빙(Challenge / Security / Code Quality / Evidence)
- Reviewer adjudication + Planner closeout records

### Immediate Next Action (Goal Mode)
1. finalize/confirm survey domain requirements in one message (question types, auth model, persistence).
2. open/update delegated approval evidence for PKT-24 (`PKT-24_READY_FOR_CODE_DELEGATION`).
3. route PKT-24 through Planner -> Orchestrator for execution (worker handoff + e2e review).
