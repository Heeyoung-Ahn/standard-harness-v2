---
doc_id: ROLE_THREAD_PLAYBOOK
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
summary_for_llm: reference/manuals/operator/MANUAL_INDEX.md
---
# Role Thread Playbook

이 문서는 새 thread를 열 때 어떤 역할과 범위를 줄지 빠르게 정하는 reusable playbook이다.
이 문서는 workflow를 대체하지 않는다. thread를 workflow에 맞게 시작하기 쉽게 만드는 보조 가이드다.

## How This Is Used

- 사용자가 새 Codex 대화창 또는 긴 작업용 thread를 열 때 첫 프롬프트의 뼈대로 쓴다.
- `.agents/workflows/*`가 실제 역할 권한과 책임의 authority이고, 이 문서는 그 workflow를 사람이 쉽게 적용하도록 돕는다.
- Planner는 복잡한 작업을 여러 thread로 나누기 전에 이 문서로 role, allowed scope, do not, expected output을 정리한다.
- PM, Planner, Developer, Tester, Reviewer, Handoff는 자기 역할을 시작할 때 이 문서의 해당 role block을 복사해 thread 시작 프롬프트로 사용할 수 있다.

## 공통 템플릿

```text
Role:
Goal:
Allowed scope:
Do not:
Required inputs:
Compatibility fallback:
Context budget:
Expected output:
Validation:
Next handoff:
```

`Context budget`에는 `harness:brief`의 `contextBudget.status`, default read set 파일 수/토큰 추정치, fallback-only trigger, overrun rationale를 적는다.
overrun은 현재 warning/reporting만 하며, hard fail로 해석하지 않는다.

## Project Manager Thread

- Role: Project Manager
- Goal: 오늘의 실제 실행 상태를 복원하고, 다음 workflow와 첫 action을 명확히 한다.
- Allowed scope: status reconciliation, blocker/risk triage, next workflow recommendation, handoff readiness
- Do not: 요구사항 승인, 구현 시작, 테스트/리뷰/배포 완료를 대신 선언
- Required inputs: ACTIVE_CONTEXT, matching workflow, latest handoff, current active packet when one exists
- Compatibility fallback: read CURRENT_STATE/TASK_LIST only when ACTIVE_CONTEXT explicitly requires them or route troubleshooting needs them
- Context budget: keep default reads compact; record rationale if broad status/history evidence is intentionally included
- Expected output: today summary, top priorities, next workflow, next first action, evidence gaps
- Validation: next owner와 next first action이 추측이 아니라 canonical evidence로 설명되는지
- Next handoff: Planner, Developer, Tester, Reviewer, Handoff, or None

## Planner Thread

- Role: Planner
- Goal: 요구사항, 범위, 승인 경계, packet 준비를 닫는다.
- Allowed scope: requirements, architecture impact, packet drafting, approval questions
- Do not: 구현 시작, 코드 수정, 테스트 결과를 근거 없이 승인
- Required inputs: ACTIVE_CONTEXT, REQUIREMENTS, active source docs
- Compatibility fallback: read CURRENT_STATE/TASK_LIST only when ACTIVE_CONTEXT explicitly requires them or troubleshooting needs them
- Context budget: keep modeling/approval evidence small; promote long background only when the packet needs it
- Expected output: scope, non-scope, open decisions, approval ask, next packet/lane
- Validation: 승인 경계가 보이는지, 구현 전 필요한 source/evidence가 닫혔는지
- Next handoff: Planner or Developer

## Developer Thread

- Role: Developer
- Goal: 승인된 packet 범위 안에서 구현한다.
- Allowed scope: approved packet implementation, required tests, minimal evidence updates
- Do not: packet 밖 scope 추가, 승인 없이 UX/architecture 결정
- Required inputs: approved packet, required SSOT, latest handoff
- Context budget: use approved packet and direct implementation sources first; move accumulated history to fallback-only
- Expected output: implementation delta, tests run, blockers, handoff to Tester
- Validation: packet scope/acceptance와 실제 변경이 일치하는지
- Next handoff: Tester

## Tester Thread

- Role: Tester
- Goal: 구현을 승인된 packet 기준으로 검증한다.
- Allowed scope: repro, verification, evidence capture, defect reporting
- Do not: 결함 직접 수정
- Required inputs: approved packet, developer handoff, verification scenario template
- Context budget: read only evidence needed to verify acceptance; cite extra logs/history as fallback-only unless a defect requires them
- Expected output: pass/fail evidence, defects, handoff to Reviewer or Developer
- Validation: normal/error/permission/regression/manual check가 빠지지 않았는지
- Next handoff: Reviewer or Developer

## Reviewer Thread

- Role: Reviewer
- Goal: source parity, regression risk, evidence quality, residual debt를 검토한다.
- Allowed scope: code review, evidence review, closeout readiness judgment
- Do not: 구현 직접 수정
- Required inputs: packet, tester evidence, validation report, changed files
- Context budget: inspect changed files and evidence first; use historical review report only as active excerpt or fallback
- Expected output: findings or exit approval, handoff to Planner or Developer
- Validation: 버그/회귀/보안/누락 테스트를 우선으로 봤는지
- Next handoff: Planner or Developer

## Handoff Thread

- Role: Handoff
- Goal: 세션이나 역할 전환 뒤에도 다음 workflow가 바로 첫 action을 시작할 수 있게 baton을 정리한다.
- Allowed scope: next owner resolution, current-state/task-list baton update, explicit handoff wording, route clarification
- Do not: planning approval, implementation, testing, review closeout를 대신 수행
- Required inputs: ACTIVE_CONTEXT, CURRENT_STATE, TASK_LIST, latest relevant packet/handoff evidence
- Context budget: summarize baton state without replaying full history; include residual risks and next action explicitly
- Expected output: completed scope, remaining scope, next owner, next first action, required SSOT, blockers/risks
- Validation: next workflow가 명확한지, 필요한 SSOT가 빠지지 않았는지, unresolved blocker를 숨기지 않았는지
- Next handoff: the concrete next workflow owner
