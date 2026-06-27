---
doc_id: TOKEN_AND_FRICTION_GUIDE
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# 토큰과 마찰 절감 가이드

## 원칙

- AI에게 장문 사람용 매뉴얼을 기본으로 읽히지 않습니다.
- 기본 context는 brief입니다.
- 작업 lane에 따라 gate를 선택합니다.
- evidence는 digest를 먼저 봅니다.
- raw log는 실패했을 때만 엽니다.

## 추천 사용법

```bash
npm run harness:v23 -- lane -- --files "README.md" --risk low
npm run harness:v23 -- manual-route -- --lane light --phase implementation --apply
npm run harness:v23 -- context-brief -- --lane light --phase implementation --apply
```
