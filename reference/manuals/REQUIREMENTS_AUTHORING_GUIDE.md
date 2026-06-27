---
doc_id: REQUIREMENTS_AUTHORING_GUIDE
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
summary_for_llm: reference/manuals/operator/MANUAL_INDEX.md
---
# Requirements Authoring Guide

> MANUAL. Read this only when drafting, rebasing, or structurally updating `.agents/artifacts/REQUIREMENTS.md`.

## When To Load

- 새 프로젝트의 첫 `REQUIREMENTS.md` 기준선을 작성할 때
- 새 authoritative source나 scope change 때문에 requirements를 크게 다시 닫을 때
- `Active Profile Selection`, approval boundary, scope framing을 구조적으로 바꿀 때
- 일반적인 requirements 참조 read만 하는 경우에는 읽지 않는다

## Authoring Goals

- `.agents/artifacts/REQUIREMENTS.md`는 live SSOT로 유지하고, generic 작성 방법론은 이 문서에 둔다.
- reusable 설명보다 현재 프로젝트 기준선, 승인 경계, active profile, 핵심 acceptance를 우선 적는다.
- project-specific detail은 requirements에서 baseline을 닫고, 더 구체적인 실행 detail은 packet과 approved artifact로 내린다.
- PRD-style 메모나 interview note는 보조 자료일 뿐이며, `.agents/artifacts/REQUIREMENTS.md`를 대체하는 요구사항 권위가 될 수 없다.

## Coached Authoring Flow

Planner가 requirements를 작성, rebase, 구조적으로 업데이트할 때는 `.agents/skills/requirements_deep_interview/SKILL.md`를 조건부로 사용한다. 일반 reference read에는 이 스킬을 로드하지 않는다.
이 스킬은 coaching helper다. Planner workflow authority, `.agents/artifacts/REQUIREMENTS.md`, `PLN-01`, human approval을 대체하지 않는다.
스킬 파일이 없거나 현재 환경에서 사용할 수 없으면 이 문서의 coached authoring flow를 직접 사용한다.

1. requirements authoring target과 active source authority를 먼저 밝힌다.
2. 질문 전에 decision queue를 만든다. 각 항목은 결정할 내용, 현재 assumption, 왜 먼저 닫아야 하는지를 포함한다.
3. 한 번에 하나의 decision만 질문한다.
4. 각 decision마다 `Assumption`, `Answer Status`, `Downstream Impact`, `Blocker Status`를 기록한다.
5. 답변을 five-field requirements kernel에 매핑한다.
6. first-version product preview를 보여 주고 Requirements Freeze 전 최종 human confirmation을 요청한다.

`Answer Status`는 `approved`, `open`, `deferred`, `blocked` 중 하나로 둔다. `blocked`가 남으면 downstream baseline sync나 packet drafting을 진행하지 않는다.

## Five-Field Requirements Kernel

- `goal`: 첫 버전이 달성해야 하는 product 또는 operator outcome.
- `users / roles`: 사용자, 운영자, agent, 외부 시스템, 승인 책임자.
- `scope boundary`: in scope, out of scope, deferred, blocked 항목.
- `workflow / behavior`: 첫 버전 workflow, 상태 변화, 정책, 운영 동작.
- `evidence / approval state`: source evidence, assumption 상태, human approval, freeze blocker.

예시:

| Field | Example |
|---|---|
| `goal` | 요청자가 구매 요청을 제출하고 현재 승인 상태를 확인한다. |
| `users / roles` | Department requester, manager approver, operator. |
| `scope boundary` | Submit, approve, return, corrected resubmit은 포함하고, payment execution은 제외한다. |
| `workflow / behavior` | threshold 이상 요청은 manager approval이 필요하고, returned request는 requester가 수정 후 다시 제출한다. |
| `evidence / approval state` | Product test covers submit, approve, return, and corrected resubmit; threshold policy는 human approval 전까지 freeze blocker다. |

## Minimum Authoring Surface

- `Project Goal`: 사용자 목표, 운영 목표, 승인 목표를 현재 프로젝트 언어로 적는다.
- `Users And Roles`: 주요 사용자, 운영자, 승인 책임자를 적는다.
- `Active Profile Selection`: 실제로 켜는 profile만 적고, 없으면 `none`으로 적는다.
- `In Scope`, `Out Of Scope`, `Core Workflows`, `Functional And Data Requirements`를 project baseline 기준으로 적는다.
- `Approval Boundary`, `Open Questions`, `Deferred Items`를 남겨 다음 packet과 freeze 판단이 이어지게 한다.
- data, UX, deploy/test/cutover, authoritative source 영향이 있으면 해당 승인 경계가 requirements에서 보이게 적는다.

## Optional Profile Catalog

- `PRF-01`: admin grid application
- `PRF-02`: authoritative spreadsheet source
- `PRF-03`: airgapped delivery
- `PRF-04`: legacy Excel/VBA-MariaDB replacement
- `PRF-05`: Python/Django backoffice
- `PRF-06`: workflow/approval application
- `PRF-07`: lightweight web/app
- `PRF-08`: Android native app
- `PRF-09`: Node/frontend web app
- `PRF-10`: BI/analytics platform

## Authoring And Approval Rules

1. implementation-critical issue가 닫히거나 명시적으로 deferred 될 때까지 requirements를 먼저 정리한다.
2. requirements가 확정되기 전에는 architecture / implementation / UI baseline을 새 기준선으로 sync하지 않는다.
3. user-facing 작업은 task-level detailed design과 human sync 없이 코드 기준선으로 먼저 확정하지 않는다.
4. data-impact 작업은 `.agents/artifacts/DOMAIN_CONTEXT.md` 또는 동등한 approved domain foundation reference와 schema impact 판단 없이 `Ready For Code`로 올리지 않는다.
5. 기존 프로그램 연동 작업은 기존 schema 또는 동등한 authoritative schema artifact, naming / ownership / migration compatibility 분석 없이 설계를 닫지 않는다.
6. deployment, cutover, environment migration, or environment/topology-impacting test work는 `reference/artifacts/DEPLOYMENT_PLAN.md` 또는 동등한 topology reference 없이 `Ready For Code`로 올리지 않는다. ordinary packet acceptance tests와 product tests는 deployment topology나 environment migration에 의존하지 않으면 `DEPLOYMENT_PLAN.md`를 요구하지 않는다.
7. 새 사용자 기획 문서나 외부 authoritative source를 받으면 `reference/artifacts/AUTHORITATIVE_SOURCE_INTAKE.md` 또는 동등한 intake reference 없이 baseline을 다시 sync하지 않는다.
8. 한 source change가 여러 open packet에 영향을 주면 `reference/artifacts/AUTHORITATIVE_SOURCE_WAVE_LEDGER.md` 또는 동등한 ledger로 impacted packet set을 같이 닫는다.
9. optional profile은 explicit-only다. profile이 active면 requirements와 packet 모두 그 dependency와 evidence를 드러내야 한다.
10. user-facing 작업은 `reference/artifacts/PRODUCT_UX_ARCHETYPE.md` 또는 동등한 approved UX archetype reference 없이 `Ready For Code`로 올리지 않는다.
11. packet closeout은 `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md` 또는 동등한 approved closeout reference 없이 완료로 올리지 않는다.
12. 반복되는 process / quality friction은 `.agents/artifacts/PREVENTIVE_MEMORY.md`에 남기고, human review 없이 baseline 문서나 starter template을 직접 바꾸지 않는다.

## Freeze-Blocker Check

Requirements Freeze 전에는 다음 항목이 닫혔는지 확인한다.

- `goal`이 충돌하거나 비어 있지 않은가
- `users / roles`가 충분히 구체적인가
- `scope boundary`가 implementation packet을 쓸 수 있을 만큼 닫혔는가
- `workflow / behavior`가 첫 버전 동작으로 설명되는가
- `evidence / approval state`가 source와 human confirmation을 드러내는가
- UX, data implications, integration, test scope, environment assumptions, packet shape에 영향을 주는 assumption이 unresolved 상태로 남지 않았는가

Freeze blocker가 있으면 `ARCHITECTURE_GUIDE.md`, `IMPLEMENTATION_PLAN.md`, UI/design baseline, implementation packet, Ready For Code로 진행하지 않는다.

## Keep Out Of Requirements

- reusable tutorial성 설명
- profile catalog 전체를 매번 본문에 복사하는 일
- load order, workflow read rule, starter baseline 설명
- layer model, activation contract, layer decision rules 같은 reusable harness constitutional guidance
- packet-level implementation detail
- project-specific field/table/API detail을 core baseline처럼 고정하는 일

## Quick Check

- 현재 프로젝트 목표와 범위가 비전공자도 읽을 수 있게 적혀 있는가
- active profile이 정말 필요한 것만 explicit하게 켜졌는가
- approval boundary가 requirements와 downstream packet 사이에서 모호하지 않은가
- requirements를 읽는 사람에게 지금 기준선과 아직 열린 항목이 바로 보이는가
