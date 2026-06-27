---
doc_id: HUMAN_GUIDE
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
summary_for_llm: reference/manuals/operator/MANUAL_INDEX.md
---
# 사람 운영자를 위한 하네스 사용 설명서

이 문서는 사람이 하네스를 이해하고 실제 프로젝트에 적용하기 위한 설명서입니다. AI 실행 정본이 아니며 자동 참조 대상이 아닙니다.

## 핵심 사고방식

하네스는 일을 느리게 만들기 위한 장치가 아닙니다. 중요한 변경에서 실패 비용을 줄이기 위한 운영 체계입니다.
다만 모든 작업에 엄격한 절차를 적용하면 마찰이 커지므로, lane 기반으로 필요한 만큼만 하네스를 켭니다.

## Lane 선택

- `micro`: 오타, 문구, 아주 작은 문서 수정
- `docs-only`: 문서만 바꾸는 작업
- `light`: 저위험 단일 영역 수정
- `standard`: 일반 기능 개발이나 버그 수정
- `strict`: 승인, 권한, 보안, DB, 핵심 로직, 고위험 변경
- `release`: 배포, migration, rollback, monitoring
- `investigation`: 원인 조사와 증거 수집

## 하루 운영

하루 시작에는 brief를 먼저 확인합니다. 전체 manual을 읽지 않습니다.
하루 종료에는 완료한 것, 미완료, blocker, 다음 action, evidence digest, learning 후보만 남깁니다.

## 중요한 금지사항

- AI에게 사람용 full manual을 기본으로 읽히지 마세요.
- packet 본문에 긴 로그를 붙이지 마세요.
- 작은 작업에 strict packet을 강제하지 마세요.
- harness validation pass를 product verification pass로 착각하지 마세요.
