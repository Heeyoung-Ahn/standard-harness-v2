# Standard Harness v2 Survey App Lane Design

## 문서 목적

이 문서는 Standard Harness v2의 clean starter payload를 실제로 검증하는 리뷰 lane과,
그 starter 복사본 위에서 설문조사 웹앱을 제작하는 운영 lane을 함께 설계하기 위한
planning spec이다.

이 문서는 구현 문서가 아니다. packet 분해, 역할 배정, 승인 경계, 검증 전략을
명확히 해 다음 단계의 packet 작성과 implementation plan 작성을 준비한다.

## Source Authority

- 현재 사용자 지시:
  - Goal 모드로 진행
  - clean starter payload의 E2E 테스트를 통한 리뷰 수행
  - 별도 폴더에서 실제 웹앱 제작을 v2.0 하네스를 이용해 진행
  - conductor는 Codex
  - worker 두 명은 모두 Codex CLI
  - 구현할 제품은 설문조사 프로그램
  - 필요한 승인은 Conductor에게 위임
- root harness operating contract
- planner workflow contract
- starter payload `_harness/README.md`
- starter conductor / approval / E2E runtime contracts
- PKT-07 conductor routing and delegated approval packet
- PKT-20 packet-doc review notes about delegated approval narrowing

## Broad Request Decomposition

이 요청은 하나의 packet으로 닫기에는 범위가 넓다. clean starter 자체를 검증하는 일과,
그 결과를 바탕으로 survey 앱 제작 운영 구조를 설계하는 일은 changed surface,
verification burden, approval surface가 다르다.

따라서 다음 두 개의 상위 lane으로 분리한다.

- Lane A: clean starter payload E2E review
- Lane B: survey app execution/design setup on a copied clean starter

Lane A는 starter 자체의 품질과 approval boundary를 증명한다.
Lane B는 starter 위에서 돌아갈 실제 product 프로젝트의 운영 구조와 packet 체인을
정의한다.

## Chosen Approach

선택된 접근은 `review-first staged`이다.

이 접근은 먼저 Lane A에서 clean starter 복사본 검증과 conductor/worker/approval
경계를 증명하고, 그 결과를 기반으로 Lane B의 survey 앱 packet 체인을 여는 방식이다.

### 선택 이유

- clean starter의 독립 검증 증거를 survey 제품 증거와 섞지 않는다.
- starter 자체 결함이 product lane의 완료 주장에 섞이는 것을 막을 수 있다.
- real Codex CLI smoke와 delegated approval 경계를 별도 검증 축으로 유지할 수 있다.
- survey 앱 lane은 검증된 복사본 위에서 시작하므로 product evidence가 더 명확해진다.

## Lane A Design

### Lane A Goal

clean starter payload를 별도 복사본에서 실제로 초기화하고, starter 검증, fixture E2E,
real Codex CLI smoke, delegated approval 경계를 증명한다.

### Lane A Environment

- 작업 위치: `starter/standard-harness/`의 별도 복사본 폴더
- 기본 전제:
  - copied starter는 root development history 없이 독립적으로 다뤄야 한다
  - real CLI smoke는 명시 승인 하에서만 수행한다
  - approval state mutation은 worker output으로 일어나면 안 된다

### Lane A Candidate Packets

#### A-1 Clean starter copy and initialization

목적:
- clean starter를 별도 폴더에 복사
- `init`로 `_ops/**`와 `product/**` 표면이 정상 생성되는지 확인
- survey app lane의 기반이 되는 copied starter 상태를 준비

주요 확인 항목:
- copied starter folder contract 유지
- `_harness/**`와 `product/**` 초기 표면 정상
- 로컬 DB 기반 survey product lane을 바로 시작할 수 있는 실행 기반 준비

#### A-2 Starter E2E fixture and approval boundary

목적:
- fixture 기반 conductor/worker E2E와 starter contamination boundary를 증명

주요 확인 항목:
- `validate --starter --installed-runtime`
- `validate --starter --clean-export`
- `conductor-worker-e2e --mode fixture`
- approval boundary negative cases

실패 조건:
- provider-specific residue가 clean export에 남음
- worker output이 approval state를 바꿈
- Planner가 delegated approval 실행자로 통과함

#### A-3 Real Codex CLI smoke and delegated approval

목적:
- real Codex CLI smoke를 명시 승인 하에 검증
- `Ready For Code`와 `Closeout` delegated approval 둘 다 Conductor 경로에서만
  실행 가능함을 증명

주요 확인 항목:
- real Codex CLI smoke evidence
- `selected Conductor + trusted harness command/service` 경로만 허용
- packet-scoped delegation 유지
- packet hash 변화, evidence prerequisite 미충족, unresolved finding 시 보류 또는 거부

### Lane A Verification Standard

- positive evidence
  - copied starter init 성공
  - starter installed-runtime validation 동작
  - starter clean-export validation 동작
  - fixture conductor-worker E2E 통과
  - explicit approval 후 real Codex CLI smoke evidence 확보
- negative evidence
  - worker output 승인 불가
  - Planner delegated approval 실행 불가
  - untrusted channel 승인 불가
  - clean export contamination 허용 불가

## Lane B Design

### Lane B Goal

Lane A에서 검증된 clean starter 복사본을 새 프로젝트 루트처럼 사용해,
설문조사 웹앱의 운영 구조, packet 체인, 역할 분담, 검증 전략을 정의한다.

### Product Scope

MVP 범위는 `관리자 + 응답자 기본형`이다.

- 관리자는 설문 생성, 문항 편집, 상태 전환, 응답 조회를 수행한다.
- 응답자는 로그인 없이 공개 링크로 들어와 응답을 제출한다.
- 결과 분석 대시보드, 세부 권한 모델, 다중 관리자, 응답자 로그인은 MVP 밖이다.

### Project Base

- 시작 방식: `clean starter` 복사본을 새 repo처럼 사용
- 저장 방식: 로컬 DB 단일 인스턴스
- 관리자 진입: 시드 관리자 계정
- 응답자 진입: 공개 링크
- 문항 유형: 객관식 + 단답형
- 응답 중복 제출 정책: 같은 접근 세션에서 재제출 불가
- 설문 상태 흐름: `draft -> published -> closed`

## Operating Model

### Roles

#### Conductor

- Codex
- 사람과 대화하는 유일한 창구
- packet 선택, worker 배정, 증거 비교, 진행/보류/승인 요청 라우팅 담당
- delegated approval 실행자
- 구현자나 reviewer를 겸하지 않음

#### Worker A

- Codex CLI
- packet 초안 작성
- 구현 주 담당
- 관리자/응답자 흐름 작성

#### Worker B

- Codex CLI
- 독립 검토 담당
- `packet_doc_review`, 테스트 기준, E2E 검증, reviewer 관점 점검

### Same-Provider Waiver

기본 철학은 cross-provider 검증을 선호하지만, 이번 설계는 사용자 지시상
두 worker 모두 Codex CLI를 사용한다.

따라서 다음 보완 통제를 same-provider waiver로 함께 기록한다.

- Worker A와 Worker B는 항상 다른 역할을 맡는다.
- Worker A 산출물을 Worker B가 독립 검토한다.
- worker output은 evidence/read model일 뿐 승인 상태를 바꾸지 못한다.
- unresolved finding, risk 상승, packet hash 변경, prerequisite 미충족 시
  Conductor가 사람에게 escalation 한다.
- delegated approval은 worker가 아니라 Conductor만 실행한다.

## Delegated Approval Boundary

이번 설계에서 Conductor 위임 범위는 다음 두 가지를 모두 포함한다.

- `Ready For Code`
- `Closeout`

단, 실행 경계는 엄격하게 고정한다.

- 승인 실행자: selected Conductor only
- 실행 채널: `trusted_harness_command` 또는 `trusted_harness_service` only
- 위임 단위: packet-scoped delegation
- 허용되지 않는 것:
  - Planner delegated approval execution
  - worker output 기반 암묵 승인
  - untrusted prose 기반 승인
  - packet hash drift 이후 기존 delegation 재사용

## Survey App Architecture

### Product Zones

- `product/src`
  - survey product application code
- `product/tests`
  - product-level unit, integration, browser/E2E tests
- `product/docs`
  - project-level human-facing docs

### Main Components

#### Admin UI

- 시드 관리자 계정으로 로그인
- 설문 생성
- 문항 편집
- 설문 상태 전환
- 응답 조회

#### Respondent UI

- 공개 링크 접근
- 로그인 없음
- 설문 응답 제출
- 이미 제출한 접근 세션은 재제출 차단

#### Survey Service

- survey lifecycle 관리
- question ordering과 유형 관리
- `draft -> published -> closed` 상태 전환 규칙 관리

#### Response Service

- response 저장
- duplicate submit 차단
- submit completion 처리

#### Local DB

- 관리자 계정
- 설문
- 문항
- 선택지
- 응답
- 답변
- submission lock

### Minimum Data Model

#### AdminUser

- seeded administrator identity

#### Survey

- title
- description
- state
- public access token

#### Question

- survey id
- question type
- prompt
- display order

#### QuestionOption

- question id
- option text
- display order

#### Response

- survey id
- submitted at
- lock identity

#### Answer

- response id
- question id
- selected option values or short text

#### SubmissionLock

- survey token/session marker
- submitted flag

## Lane B Packet Chain

### B-1 Survey project bootstrap

목적:
- copied starter 초기화
- 시드 관리자 계정 준비
- 로컬 DB 준비
- same-provider waiver 기록
- product packet 체인 시작

### B-2 Admin survey authoring

목적:
- 설문 생성
- 문항 추가/수정
- 상태 전환

완료 기준:
- 관리자 핵심 authoring 흐름 증명

### B-3 Public respondent flow

목적:
- 공개 링크 응답
- 객관식/단답형 제출
- 재제출 차단

완료 기준:
- 응답자 핵심 흐름 증명

### B-4 Response review and closeout

목적:
- 관리자 응답 조회
- 기본 결과 확인
- review/test evidence와 closeout 묶기

완료 기준:
- 관리자 review 흐름과 closeout evidence 확보

### Optional B-5 Hardening

필요 시 별도 packet으로 둔다.

- UX polish
- 추가 검증
- product hardening only

이 packet은 MVP 완료의 필수 전제는 아니다.

## Verification Strategy

### Lane A

필수 증거:

- copied starter init success
- starter installed-runtime validation result
- starter clean-export validation result
- fixture conductor-worker E2E result
- explicit approval 후 real Codex CLI smoke result
- delegated `Ready For Code` execution evidence
- delegated `Closeout` execution evidence

필수 negative evidence:

- worker output approval prohibition
- Planner delegated approval rejection
- untrusted approval channel rejection
- clean export contamination rejection

### Lane B

#### B-1 Verification

- copied survey project bootstrap success
- seeded admin account availability
- local DB initialization evidence

#### B-2 Verification

- admin login
- survey create
- question create/edit
- state transition to published and closed

#### B-3 Verification

- public link access
- choice and short-text submission
- one successful submission
- duplicate resubmit blocked

#### B-4 Verification

- admin response list visibility
- response detail/basic results visibility
- reviewer/tester evidence linked to packet closeout

브라우저/E2E 최소 기준:

- 관리자 핵심 흐름 1개 이상
- 응답자 핵심 흐름 1개 이상

## Error Handling And Stop Conditions

- delegated approval prerequisite 미충족 시 진행 중지
- packet hash drift 시 기존 delegation 무효화
- clean export contamination 발견 시 Lane A closeout 금지
- same-provider independent review가 실질적으로 무너진 경우 사람 escalation
- unresolved high-risk finding 존재 시 Conductor closeout 실행 금지

## Out Of Scope

- 다중 관리자
- 세부 권한 분리
- 응답자 로그인
- 고급 분석 대시보드
- 장문형/평점형 문항
- cross-provider worker 강제
- provider credential storage
- starter product identity로서의 provider-specific root entry files

## Decision Summary

- visual companion: enabled
- packet structure: multiple packets
- overall approach: review-first staged
- starter review scope: real CLI smoke included with explicit approval
- delegated approval scope: Ready For Code + Closeout
- survey MVP: admin + respondent basic flow
- project base: copied clean starter
- admin model: single seeded admin account
- respondent access: public link
- question types: choice + short text
- duplicate submit policy: blocked
- storage model: local DB single instance
- survey lifecycle: draft -> published -> closed
- workers: two Codex CLI workers with same-provider waiver controls

## Implementation Planning Handoff Boundary

다음 단계는 implementation plan 작성이다.

그 전까지는 다음 경계를 유지한다.

- 이 문서는 planning/design authority이다.
- 아직 implementation plan은 작성되지 않았다.
- 아직 packet을 실제로 열거나 Ready For Code를 자동 승인하지 않는다.
- product code 작성은 implementation plan 이후에만 시작한다.
