---
doc_id: DEVELOPMENT_BASICS
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# 개발 기초

이 문서는 개발 경험이 많지 않은 사람이 하네스를 이해하기 위한 교육용 문서입니다. AI 자동 참조 대상이 아닙니다.

## Git

Git은 변경 이력을 기록합니다. 브랜치에서 작업하고, main으로 PR을 보내는 방식을 기본으로 합니다.

## 테스트

테스트는 변경이 기대대로 동작하는지 확인합니다. 하네스의 `npm test`는 하네스 자체의 구조 검증이고, 제품 기능 테스트와 구분해야 합니다.

## TDD

TDD는 실패하는 테스트를 먼저 만들고, 최소 구현으로 통과시킨 뒤 리팩터링하는 방식입니다.

## 리뷰

리뷰는 구현자가 놓친 문제를 찾는 과정입니다. 리뷰어는 직접 구현을 대신하지 않고, finding과 권고를 남깁니다.
