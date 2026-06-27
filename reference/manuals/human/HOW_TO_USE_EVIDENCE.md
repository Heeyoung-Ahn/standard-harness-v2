---
doc_id: HOW_TO_USE_EVIDENCE
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# Evidence 사용법

## 기본 원칙

긴 로그를 packet에 붙이지 않습니다. 대신 요약, 경로, exit code, hash를 기록합니다.

## 좋은 evidence 예

- command: `npm test`
- exit code: 0
- summary: `245 passed / 0 failed`
- log path: `reference/reports/test/PKT-001.log`
- sha256: `...`

## AI 참조 원칙

AI는 digest를 먼저 봅니다. 실패, 불일치, unknown 상태일 때만 raw log를 엽니다.
