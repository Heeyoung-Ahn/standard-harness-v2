---
doc_id: CLOUD_LOCAL_MERGE_PLAYBOOK
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
summary_for_llm: reference/manuals/operator/MANUAL_INDEX.md
---
# Cloud And Local Merge Playbook

이 문서는 cloud/local 병렬 작업을 어떻게 안전하게 합칠지 설명하는 reusable playbook이다.
이 문서는 운영 가이드일 뿐이며, runtime sync tooling이나 자동 merge 기능을 뜻하지 않는다.

## How This Is Used

- Planner가 cloud 또는 별도 worktree 병렬 작업을 packet에 포함할 때 merge boundary를 정하는 참고 문서로 쓴다.
- Developer는 cloud 결과를 branch, patch, PR, file diff 형태로 가져온 뒤 local review/test/validate 절차를 확인할 때 쓴다.
- Reviewer는 cloud output이 local canonical truth로 바로 승격되지 않았는지 확인할 때 이 문서를 참고한다.
- 이 문서는 특정 cloud sync 기능을 켜지 않으며, 자동 병합을 약속하지 않는다.

## Core Rule

- canonical truth는 여전히 local repo의 approved SSOT와 validation evidence다.
- cloud 결과는 branch/patch/PR 형태의 candidate output으로 취급한다.
- cloud 결과를 로컬 검증 없이 바로 정본으로 올리지 않는다.

## Recommended Flow

1. local에서 packet과 approval boundary를 닫는다.
2. 병렬로 오래 걸릴 부분만 cloud 또는 별도 worktree로 분리한다.
3. 각 병렬 작업은 scope, owner, expected output을 따로 남긴다.
4. 결과는 branch, patch, PR, or explicit file diff로 local에 가져온다.
5. local에서 diff review, merge, test, validate, validation-report를 다시 수행한다.
6. handoff와 closeout은 local canonical result 기준으로만 남긴다.

## Good Split Examples

- backend permission middleware
- frontend permission visibility
- test fixture expansion
- docs/playbook drafting

## Do Not

- cloud를 새 SSOT처럼 취급
- packet 없이 cloud 병렬 작업부터 시작
- merge 후 local validation을 생략
