# V2.1 Review Governance Gate Idea

## Document Relationship

- Master plan: `V2.1 Hardening Master Plan.md`.
- V2.1 disposition: accepted as XP-10C Review Governance Gate after release evidence, security, and metrics hardening.
- Role: source idea for turning challenge/adversarial/code review into structured release-blocking evidence.
- Feeds: `review hardening plus wiki knowledge architecture hardening prompt.md`.
- Related to: `v2.1 additional hardening idea.md` and `v22-hardening-strategy.md`.

---

네. v2.1에 넣으려면 **“리뷰 절차 문서 추가”가 아니라 “리뷰를 하네스의 공식 gate 체계로 승격”**해야 합니다.

가장 좋은 진행 방식은 다음입니다.

```text
V2.1 Review Governance 추가
= review profile
+ review evidence schema
+ review validator
+ review gate
+ review packet / review bundle
+ release gate 연동
+ negative self-test
+ manual runbook
```

즉, 리뷰를 사람이 임의로 요청하는 절차가 아니라 **packet closeout과 release closeout의 필수 통제 지점**으로 넣는 것입니다.

---

# 1. 권장 방향

## 결론

현재 v2.1 구조를 크게 흔들지 말고, **XP-10 이후 hardening packet**으로 넣는 것이 좋습니다.

이름은 다음 중 하나가 적절합니다.

```text
XP-10B Review Governance Gate
```

또는

```text
XP-ReviewA Implementation Review Governance
```

저는 **XP-10B Review Governance Gate**를 권합니다. 이유는 이 기능이 개별 XP 기능이라기보다 **최종 closeout/release gate의 품질을 강화하는 성격**이기 때문입니다.

v2.1 계획 자체도 문서/템플릿은 validator나 gate가 실제로 소비할 때만 만들고, 모든 XP는 HR coverage, migration/compatibility, acceptance test, release-blocking 조건을 가져야 한다고 정의합니다. 
따라서 리뷰 체계도 동일하게 `schema → policy → validator → gate → evidence → test → manual`로 내려야 합니다.

---

# 2. v2.1에 넣을 핵심 개념

## 2.1 Review Profile

모든 변경에 같은 리뷰를 강제하면 하네스가 무거워집니다. 따라서 **변경 유형별 review profile**이 필요합니다.

예:

```yaml
reviewProfileId: standard-implementation-review
appliesTo:
  packetTypes:
    - PRODUCT
    - HARNESS
requiredReviews:
  - requirements_challenge
  - evidence_integrity
  - adversarial_security
  - code_architecture
  - release_gate_self_test
  - final_adjudication
conditionalReviews:
  migration_compatibility:
    when:
      changeZones:
        - database
        - state
        - event_log
        - schema
  operational_readiness:
    when:
      releaseCandidate: true
  ux_workflow:
    when:
      changeZones:
        - ui
        - workflow
        - user_flow
  performance_scalability:
    when:
      riskLevel:
        - high
```

이렇게 하면 작은 문서 수정에는 가벼운 리뷰만, DB/schema/auth/release 변경에는 무거운 리뷰를 적용할 수 있습니다.

---

## 2.2 Review Bundle

리뷰 결과를 흩어진 Markdown 문서로만 두지 말고, 하나의 구조화된 bundle로 관리해야 합니다.

```yaml
reviewBundleId: RB-PKT-001
packetId: PKT-001
reviewedCommit: abc123...
reviewProfileId: standard-implementation-review
reviewedFiles:
  - src/...
  - tests/...
reviews:
  - type: requirements_challenge
    status: pass
    evidencePath: docs/reviews/PKT-001/challenge-review.md
  - type: adversarial_security
    status: conditional_pass
    evidencePath: docs/reviews/PKT-001/adversarial-review.md
  - type: code_architecture
    status: pass
    evidencePath: docs/reviews/PKT-001/code-review.md
findings:
  p0: []
  p1:
    - findingId: F-001
      status: resolved
  p2:
    - findingId: F-002
      status: accepted_followup
finalDecision:
  value: conditional_pass
  owner: human
  rationale: P0 none, P1 resolved, P2 deferred
```

---

## 2.3 Review Finding

finding도 자유 텍스트가 아니라 schema가 있어야 합니다.

```yaml
findingId: F-001
reviewType: adversarial_security
severity: P0 | P1 | P2 | P3
title: Boundary path traversal can bypass harness zone block
location:
  file: src/standard_harness/policy/zones.py
  symbol: normalize_path
reproduction:
  command: python -m unittest tests.evals.test_boundary_internal_path_traversal
impact: Product packet may bypass _harness/** write boundary
recommendation: Reject any normalized path containing ..
status: open | resolved | accepted_risk | false_positive
fixedByCommit: def456...
verifiedBy:
  command: python -m unittest tests.evals.test_boundary_internal_path_traversal
  result: passed
```

---

## 2.4 Review Evidence Integrity

이번 리뷰에서 가장 중요한 보완점입니다. 리뷰 문서가 있어도, 그 문서가 실제 commit/test/log와 연결되지 않으면 의미가 약합니다.

필수 검증:

```text
- reviewedCommit이 실제 git commit인가
- reviewedCommit 이후 코드가 변경되지 않았는가
- reviewedFiles가 실제 변경 파일과 일치하는가
- focused test log가 존재하는가
- regression log가 존재하는가
- negative test가 존재하는가
- finding resolved claim이 실제 fix commit/test와 연결되는가
```

이것은 별도 validator로 만들어야 합니다.

```text
src/standard_harness/validation/review_evidence.py
```

---

## 2.5 Release Gate Self-Test

release gate는 정상 케이스 pass만 보면 안 됩니다. **깨진 fixture를 실제로 막는지**를 검증해야 합니다.

필수 negative scenario:

```text
- placeholder reviewedCommit이면 fail
- reviewedCommit이 실제 git object가 아니면 fail
- unresolved P0 finding이 있으면 fail
- required review가 누락되면 fail
- review evidence log가 없으면 fail
- fake test evidence이면 fail
- release-blocking validator가 missing이면 fail
- secret evidence promotion이 있으면 fail
- boundary path traversal이 있으면 fail
```

이 부분은 테스트로 고정해야 합니다.

```text
tests/release_negative/test_review_gate_blocks_placeholder_commit.py
tests/release_negative/test_review_gate_blocks_unresolved_p0.py
tests/release_negative/test_review_gate_blocks_missing_required_review.py
tests/release_negative/test_review_gate_blocks_stale_evidence.py
tests/release_negative/test_release_gate_runs_negative_scenarios.py
```

---

# 3. v2.1에 추가할 산출물

## 3.1 정책 파일

```text
_harness/policies/review-profiles.yaml
_harness/policies/review-severity-policy.yaml
_harness/policies/review-adjudication-policy.yaml
```

## 3.2 스키마

```text
_harness/schemas/review-profile.schema.json
_harness/schemas/review-bundle.schema.json
_harness/schemas/review-result.schema.json
_harness/schemas/review-finding.schema.json
_harness/schemas/review-adjudication.schema.json
_harness/schemas/release-negative-scenario.schema.json
```

## 3.3 코드

```text
src/standard_harness/reviews/profile.py
src/standard_harness/reviews/bundle.py
src/standard_harness/reviews/findings.py
src/standard_harness/reviews/adjudication.py

src/standard_harness/validation/review_profile.py
src/standard_harness/validation/review_bundle.py
src/standard_harness/validation/review_evidence.py
src/standard_harness/validation/review_adjudication.py
src/standard_harness/validation/release_self_test.py
```

## 3.4 문서 템플릿

```text
docs/templates/reviews/challenge-review-template.md
docs/templates/reviews/adversarial-review-template.md
docs/templates/reviews/code-review-template.md
docs/templates/reviews/evidence-integrity-review-template.md
docs/templates/reviews/migration-compatibility-review-template.md
docs/templates/reviews/operational-readiness-review-template.md
docs/templates/reviews/final-adjudication-template.md
```

단, 템플릿은 반드시 validator가 소비해야 합니다. 단순 문서 양식으로만 존재하면 v2.1 원칙에 맞지 않습니다.

## 3.5 테스트

```text
tests.contract.test_review_profile_policy
tests.contract.test_review_bundle_schema
tests.contract.test_review_evidence_integrity
tests.contract.test_review_finding_severity_policy
tests.contract.test_review_adjudication_blocks_unresolved_p0
tests.contract.test_review_gate_required_by_packet_profile
tests.evals.test_review_gate_blocks_fake_commit
tests.evals.test_review_gate_blocks_missing_test_log
tests.evals.test_review_gate_blocks_stale_review
tests.evals.test_release_gate_runs_review_negative_scenarios
```

## 3.6 CLI

```text
python tools/harness_cli.py review plan --packet PKT-001
python tools/harness_cli.py review validate --packet PKT-001
python tools/harness_cli.py review adjudicate --packet PKT-001
python tools/harness_cli.py validate --review-gate
python tools/harness_cli.py validate --v21-conformance --release
```

---

# 4. packet 모델에 추가할 내용

기존 packet schema에 다음 필드를 추가하는 방식이 좋습니다.

```yaml
review:
  required: true
  reviewProfileId: standard-implementation-review
  reviewBundleId: RB-PKT-001
  requiredReviewTypes:
    - requirements_challenge
    - evidence_integrity
    - adversarial_security
    - code_architecture
    - final_adjudication
  conditionalReviewTypes:
    - migration_compatibility
    - operational_readiness
    - performance_scalability
  releaseBlocking:
    unresolvedP0: true
    missingRequiredReview: true
    invalidReviewEvidence: true
    staleReviewCommit: true
```

이렇게 하면 packet closeout에서 review gate를 자연스럽게 호출할 수 있습니다.

---

# 5. closeout / release gate에 넣을 조건

## Packet closeout 차단 조건

```text
- reviewProfileId가 필요한 packet인데 reviewBundle이 없으면 closeout fail
- required review type이 누락되면 closeout fail
- reviewedCommit이 현재 closeout 대상 commit과 다르면 fail 또는 stale
- unresolved P0 finding이 있으면 fail
- P1 finding이 unresolved인데 accepted risk/adjudication이 없으면 fail
- review evidence log가 없으면 fail
- final adjudication이 없으면 fail
```

## Release closeout 차단 조건

```text
- release 대상 packet 중 review gate 미통과 packet이 있으면 release fail
- release negative scenario bundle이 실행되지 않았으면 fail
- review validator catalog entry가 누락되면 fail
- review-related friction/metric signal이 누락되면 fail
```

v2.1은 이미 XP-10에서 누적 HR coverage를 release-blocking conformance gate로 고정하는 구조이므로, review governance도 XP-10 conformance에 연결하는 것이 맞습니다. 

---

# 6. HR / 요구사항으로 추가하는 방식

새 HR을 추가할지, 기존 HR에 확장할지는 선택이 필요합니다.

## 권장안

**v2.1에 새 HR 그룹을 추가하는 것보다, 기존 HR에 하위 요구사항으로 붙이는 것을 권합니다.**

이유는 v2.1 release 직전이라면 새 HR 대분류를 추가하면 coverage matrix와 conformance gate가 커지고, 구현 범위가 다시 열릴 수 있기 때문입니다.

추천 매핑:

| 리뷰 기능                        | 연결할 기존 영역                                        |
| ---------------------------- | ------------------------------------------------ |
| Review profile               | HR-190R validator catalog / HR-191 gate metadata |
| Evidence integrity review    | HR-040R~HR-045 evidence trust                    |
| Challenge review             | HR-150R~HR-152 challenge / human decision        |
| Adversarial review           | HR-080R~HR-081 security review                   |
| Code architecture review     | HR-060R / HR-090R domain/refactor                |
| Migration review             | schema-changing XP compatibility rule            |
| Operational readiness review | HR-170R~HR-172R manual/runbook                   |
| Release self-test            | XP-10 conformance gate                           |
| Review telemetry             | HR-119R~HR-124R / HR-200 Compound Engineering    |

즉, 명칭은 `Review Governance`이지만 실제로는 기존 v2.1 핵심 축을 묶는 cross-cutting capability로 넣는 것이 안정적입니다.

---

# 7. 작업 순서

## 1단계: Design Decision 기록

먼저 v2.1 범위 변경인지, release hardening인지 결정 문서를 남깁니다.

```text
docs/decisions/ADR-v21-review-governance-gate.md
```

내용:

```text
- 리뷰 체계를 v2.1 release hardening 범위로 추가한다.
- 새 제품 기능이 아니라 closeout/release gate 강화다.
- 기존 HR 구조를 재사용한다.
- review evidence는 deterministic evidence 없이는 closeout을 통과할 수 없다.
- review templates는 validator가 소비하는 경우에만 추가한다.
```

---

## 2단계: Review Profile / Schema 먼저 구현

처음부터 CLI나 문서를 만들지 말고, schema/policy부터 고정합니다.

우선순위:

```text
1. review-profile.schema.json
2. review-bundle.schema.json
3. review-finding.schema.json
4. review-adjudication.schema.json
5. review-profiles.yaml
```

---

## 3단계: Validator 구현

최소 validator:

```text
review-profile-validator
review-bundle-validator
review-evidence-integrity-validator
review-finding-severity-validator
review-adjudication-validator
release-self-test-validator
```

진단 ID 예:

```text
missing_review_profile
missing_required_review
invalid_reviewed_commit
stale_review_evidence
missing_review_test_log
unresolved_p0_finding
invalid_finding_severity
missing_final_adjudication
release_negative_scenario_not_run
```

---

## 4단계: Closeout에 연결

`PacketCloseout` 또는 `FinalGate`에 다음 로직을 넣습니다.

```text
packet risk/changeZones/releaseCandidate 확인
→ review profile 결정
→ required review bundle 확인
→ review evidence integrity 검증
→ finding/adjudication 검증
→ closeout pass/fail 결정
```

---

## 5단계: Release gate에 연결

`validate --v21-conformance --release`에서 다음을 확인하게 합니다.

```text
- review validator catalog entries exist
- review gate metadata exists
- release negative scenarios executed
- no unresolved P0 findings
- all release-bound packets have valid review bundle
```

---

## 6단계: Negative tests 추가

이번에 발견했던 유형을 반드시 negative test로 고정해야 합니다.

```text
- pending-xp-10a 같은 fake commit 차단
- required review 누락 차단
- test log 없는 review evidence 차단
- unresolved P0 finding 차단
- final adjudication 없는 conditional pass 차단
- review 후 코드 변경 발생 시 stale review 차단
```

---

## 7단계: Manual / Runbook 추가

마지막에 문서화합니다.

```text
docs/manual/standard-harness-review-governance-v21.md
docs/manual/standard-harness-review-profiles-v21.md
```

문서에는 최소한 다음이 있어야 합니다.

```text
- 어떤 변경에 어떤 리뷰가 필요한가
- 리뷰 결과는 어디에 기록하는가
- P0/P1/P2는 어떻게 판정하는가
- conditional pass는 언제 허용되는가
- accepted risk는 누가 승인하는가
- release gate fail 시 어떻게 복구하는가
```

---

# 8. 최소 구현 범위와 완전 구현 범위

v2.1에 넣을 때는 범위를 두 단계로 나누는 것이 안전합니다.

## 최소 구현: XP-10B

```text
- review profile policy
- review bundle schema
- review finding schema
- evidence integrity validator
- final adjudication validator
- release self-test validator
- closeout/release gate 연동
- negative tests
```

이 정도면 v2.1에 넣을 가치가 충분합니다.

## 후속 구현: v2.2

```text
- review dashboard
- reviewer assignment
- multi-agent review orchestration
- review metrics trend
- review quality scoring
- automated review prompt generation
- external tool integration
```

v2.1에서는 dashboard나 자동 reviewer orchestration까지 넣지 않는 편이 좋습니다. 핵심은 **리뷰를 gate화하는 것**입니다.

---

# 9. Codex에 줄 구현 프롬프트 초안

아래를 그대로 사용해도 됩니다.

```text
목표:
V2.1에 Review Governance Gate를 추가한다. 이 작업은 새 제품 기능 추가가 아니라 v2.1 closeout/release hardening이다. 리뷰 절차를 문서가 아니라 schema/policy/validator/gate/evidence/test/manual로 구현한다.

브랜치:
codex/v21-review-governance-gate

작업 범위:
1. Review profile policy 추가
   - _harness/policies/review-profiles.yaml
   - standard-implementation-review
   - release-candidate-review
   - schema-or-state-change-review
   - security-sensitive-review

2. Review schema 추가
   - _harness/schemas/review-profile.schema.json
   - _harness/schemas/review-bundle.schema.json
   - _harness/schemas/review-result.schema.json
   - _harness/schemas/review-finding.schema.json
   - _harness/schemas/review-adjudication.schema.json
   - _harness/schemas/release-negative-scenario.schema.json

3. Review validator 구현
   - src/standard_harness/validation/review_profile.py
   - src/standard_harness/validation/review_bundle.py
   - src/standard_harness/validation/review_evidence.py
   - src/standard_harness/validation/review_adjudication.py
   - src/standard_harness/validation/release_self_test.py

4. Review gate 규칙
   - required review 누락 시 fail
   - reviewedCommit이 실제 git commit object가 아니면 fail
   - reviewedCommit 이후 변경이 있으면 stale_review_evidence
   - unresolved P0 finding이 있으면 fail
   - P1 finding이 unresolved이고 accepted risk/adjudication이 없으면 fail
   - test log 없는 review evidence는 fail
   - final adjudication 없는 conditional pass는 fail
   - release negative scenario bundle 미실행 시 release fail

5. Packet closeout / v21 conformance 연동
   - packet risk/changeZones/releaseCandidate에 따라 reviewProfile 적용
   - closeout에서 review gate 실행
   - validate --v21-conformance --release에서 review governance 통과 여부 확인

6. Validator catalog 등록
   - review-profile-validator
   - review-bundle-validator
   - review-evidence-integrity-validator
   - review-adjudication-validator
   - release-self-test-validator

7. Tests
   - tests.contract.test_review_profile_policy
   - tests.contract.test_review_bundle_schema
   - tests.contract.test_review_evidence_integrity
   - tests.contract.test_review_adjudication_blocks_unresolved_p0
   - tests.contract.test_review_gate_required_by_packet_profile
   - tests.evals.test_review_gate_blocks_fake_commit
   - tests.evals.test_review_gate_blocks_missing_test_log
   - tests.evals.test_review_gate_blocks_stale_review
   - tests.evals.test_release_gate_runs_review_negative_scenarios

8. Manual
   - docs/manual/standard-harness-review-governance-v21.md

중요 원칙:
- 단순 Markdown 템플릿만 추가하지 말 것.
- 모든 review artifact는 validator나 gate가 실제 소비해야 한다.
- AI review만으로 품질 보증을 주장하지 말 것.
- deterministic evidence 없는 review pass는 closeout/release를 통과할 수 없게 할 것.
- 기존 v2.1 HR 구조를 가능한 재사용하고, 새 대형 HR scope를 열지 말 것.
```

---

# 10. 최종 권장 진행안

제가 권하는 순서는 이렇습니다.

```text
1. 현재 v2.1 hardening 이슈 먼저 수정
   - fake reviewedCommit
   - policy root
   - path normalization
   - HR-130R partial 허용
   - full regression evidence

2. 별도 브랜치 생성
   - codex/v21-review-governance-gate

3. XP-10B Review Governance Gate 계획 문서 작성

4. schema/policy/validator/test 순서로 test-first 구현

5. closeout/release gate에 연결

6. negative scenario bundle 추가

7. runbook 작성

8. 최종 3종 리뷰 + evidence integrity + release self-test review로 재검증
```

---

# 11. 핵심 결론

v2.1에 넣을 때의 핵심은 다음 한 문장입니다.

```text
리뷰를 “문서화된 절차”가 아니라 “release-blocking evidence gate”로 구현해야 합니다.
```

따라서 우선순위는 다음입니다.

```text
1순위: Review evidence integrity
2순위: Required review profile
3순위: Unresolved finding gate
4순위: Release negative self-test
5순위: Final adjudication
6순위: Manual/runbook
```

이 구조로 넣으면 v2.1은 단순히 구현을 검증하는 하네스가 아니라, **구현 후 리뷰 품질까지 강제하는 하네스**가 됩니다.
