---
doc_id: HOW_TO_RUN_A_PROJECT
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# 프로젝트 운영 방법

## 1. 시작

프로젝트 초기에 요구사항, 도메인, 아키텍처, active profile을 정리합니다. 승인·분석 업무라면 보통 PRF-02, PRF-06, 필요 시 PRF-10을 사용합니다.

## 2. 패킷 분해

큰 목표를 작은 packet으로 나눕니다. 각 packet은 lane을 가집니다. 작은 문서 수정은 micro나 docs-only, 승인/권한/DB 변경은 strict가 기본입니다.

## 3. 구현

Ready For Code가 닫힌 packet만 구현합니다. behavior change라면 TDD evidence를 남깁니다.

## 4. 검증과 리뷰

테스트 결과는 digest로 남깁니다. 보안이나 승인 workflow가 있으면 specialist reviewer를 붙입니다.

## 5. 종료와 학습

완료 후에는 day wrap-up brief, evidence digest, learning 후보를 남깁니다. 반복되는 수작업은 automation candidate로 올립니다.
