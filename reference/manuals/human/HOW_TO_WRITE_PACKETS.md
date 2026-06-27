---
doc_id: HOW_TO_WRITE_PACKETS
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# 패킷 작성 방법

## 원칙

패킷은 짧을수록 좋지만, 위험한 작업은 충분히 닫혀야 합니다.
lane별 template을 사용합니다.

## Micro

오타나 작은 문구 수정은 micro note만으로 충분합니다.

## Light

저위험 단일 파일 수정은 goal, non-goal, expected files, acceptance, verification만 닫습니다.

## Standard

일반 기능 개발은 범위, 검증, TDD 여부, reviewer 필요성을 닫습니다.

## Strict

승인·권한·보안·DB·핵심 로직은 full evidence가 필요합니다.

## Release

배포 작업은 rollback, monitoring, cutover evidence를 별도 확인합니다.
