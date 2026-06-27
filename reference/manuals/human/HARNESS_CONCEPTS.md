---
doc_id: HARNESS_CONCEPTS
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# 하네스 핵심 개념

## Human Conductor

사람은 최종 판단자입니다. AI가 여러 안을 만들고 증거를 제시하더라도, 무엇이 가치 있고 무엇을 ship할지는 사람이 결정합니다.

## Packet

패킷은 작업 지시서가 아니라 구현 전 계약서입니다. 목표, 범위, 리스크, 검증, 승인 경계, closeout 기준을 담습니다.

## Lane

Lane은 작업의 무게를 조절하는 장치입니다. 모든 작업에 full packet과 full review를 요구하지 않기 위해 도입합니다.

## Evidence

Evidence는 완료 주장의 근거입니다. 테스트, 보안검토, 리뷰, 배포, 학습 결과가 모두 evidence가 될 수 있습니다.
긴 evidence 원문 대신 digest를 먼저 봅니다.

## Compound Learning

완료된 작업에서 재사용 가능한 교훈을 남겨 다음 작업의 비용을 줄이는 과정입니다. 단, 모든 작업에 장문 회고를 요구하지 않습니다.
