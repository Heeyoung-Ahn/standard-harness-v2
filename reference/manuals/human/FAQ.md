---
doc_id: HUMAN_FAQ
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# FAQ

## 왜 매뉴얼을 나눴나요?

AI가 사람용 장문 설명서를 읽으며 토큰을 낭비하지 않도록 하기 위해서입니다.

## 작은 수정도 packet이 필요한가요?

아닙니다. micro lane은 micro note로 충분합니다.

## 안전성이 약해진 건가요?

아닙니다. 위험도가 높은 작업은 strict/release lane으로 승격되어 강한 gate를 유지합니다.

## AI가 어떤 문서를 읽어야 하나요?

기본적으로 `ACTIVE_CONTEXT.brief.md`, `DOC_ROUTE.json`, `.agents/ssot/*` 중 라우터가 고른 문서만 읽습니다.
