---
doc_id: AUTOMATION_CATALOG
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
summary_for_llm: reference/manuals/operator/MANUAL_INDEX.md
---
# Automation Catalog

이 문서는 recurring automation을 언제 켜는지 정리한 operator guide다.
자동화를 직접 생성하거나 승인하는 authority가 아니라, 사용자가 "무엇을 반복 점검할지" 고를 때 보는 카탈로그다.

## How This Is Used

- Planner 또는 운영자가 장기 lane, 반복 실패, 배포 전 점검, planning hold 상태를 발견했을 때 이 문서를 보고 자동화 후보를 고른다.
- 실제 자동화 생성은 사용자의 별도 요청과 승인으로 진행한다.
- 자동화 결과는 human review용 summary이며, `.agents/artifacts/*`, packet, workflow decision을 대체하지 않는다.

## Recommended Automations

### Daily State Summary
- 목적: open lane, next action, stale validation 여부를 매일 요약한다.
- 언제 쓰나: active lane이 길어지거나 여러 사람이 이어받는 프로젝트
- 출력 기대: 오늘 판단할 항목, 마지막 validation 시점, stale risk

### Failed Test Digest
- 목적: 최근 실패 테스트와 반복 실패 지점을 짧게 모은다.
- 언제 쓰나: 구현 packet이 이어지는 동안
- 출력 기대: failing suite, likely owner, next verification step

### Planning Hold Reminder
- 목적: no-active-lane hold 상태에서 오래 멈춘 baseline을 다시 확인하게 한다.
- 언제 쓰나: planning hold가 며칠 이상 지속될 때
- 출력 기대: hold reason, next decision, stale packet 여부

### Pre-Deploy Checklist Reminder
- 목적: 배포 전 rollback, validation, operator contact, migration 상태를 다시 보게 한다.
- 언제 쓰나: deploy/cutover 성격 작업 직전
- 출력 기대: missing evidence, remaining approval, rollback readiness

## Rule

- 자동화는 판단을 대신하지 않는다.
- 자동화 결과는 human review용 summary다.
- automation output이 canonical SSOT를 대체하면 안 된다.
