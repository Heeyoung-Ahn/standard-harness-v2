# Airgapped Delivery Profile

이 문서는 transfer-bound 또는 airgapped delivery work를 표준 optional profile로 다루기 위한 reference다. manual-transfer, removable media, offline dependency bundle, ingress-side manual execution이 반복되는 프로젝트에서는 이 문서 또는 동등하게 승인된 artifact를 explicit profile dependency 없이 건너뛰지 않는다.

## Approval Rule
- 이 profile은 requirements의 `Active Profile Selection`, architecture의 active profile 기록, task packet의 `Active profile dependency`가 모두 `PRF-03`으로 맞을 때만 활성이다.
- `PRF-03` active packet은 이 문서 경로 또는 승인된 동등 artifact 경로를 `Active profile references`에 포함해 인용한다.
- `Transfer package / bundle artifact`, `Transfer medium / handoff channel`, `Checksum / integrity evidence`, `Offline dependency bundle status`, `Ingress verification / import step`, `Rollback package / recovery bundle`, `Manual custody / operator handoff`, `Profile deviation / exception`이 비어 있으면 planning hold를 유지한다.
- profile은 transfer-governance와 bundle discipline만 제공한다. 실제 host/path, media handling step, operator runbook, import script, site-specific rollback detail은 project packet에 남긴다.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Delivery area | [배포/반입 영역] | [왜 airgapped profile이 필요한지] | draft |
| Transfer mode | airgapped / manual-transfer / removable-media / staged-bundle / other-approved | [주요 전달 방식] | draft |
| Bundle completeness | complete / partial / unknown | [필수 bundle 준비 상태] | draft |
| Integrity evidence | checksum / signed-manifest / operator-confirmed / unknown | [무결성 확인 방식] | draft |
| Rollback package readiness | ready / partial / none / unknown | [복구 bundle 준비 상태] | draft |
| Ready for packet citation | approve / adjust / hold | [packet에 인용 가능한지] | draft |

## 1. Best Fit
- Primary operator:
- Why this is transfer-bound or airgapped delivery:
- Why generic environment topology alone is insufficient:

## 2. Activation Signals
- Delivery crosses an airgapped or manual boundary:
- Artifacts must be bundled before handoff:
- Offline dependency or bootstrap payload is required:
- Human custody handoff or ingress-side manual execution is required:
- Why this should be a reusable profile rather than a project-only packet:

## 3. Transfer Package Discipline
- Transfer package / bundle artifact expectation:
- Transfer medium / handoff channel expectation:
- Offline dependency bundle expectation:
- Manifest or inventory expectation:

## 4. Integrity And Ingress Verification
- Checksum / integrity evidence expectation:
- Ingress verification / import expectation:
- What must be confirmed before execution:
- Failure or mismatch handling rule:

## 5. Rollback And Recovery Bundle
- Rollback package / recovery bundle expectation:
- What must be restorable:
- What may remain manual:
- Human approval boundary before cutover:

## 6. Custody And Approval Boundary
- Manual custody / operator handoff expectation:
- Approval checkpoint before transfer:
- Approval checkpoint before ingress execution:
- Approval checkpoint before rollback:

## 7. Profile Vs Project Boundary
- What stays in the reusable profile:
- What must stay in the project packet:
- What must never be promoted into core:

## 8. Required Packet Evidence
- Active profile references:
- Transfer package / bundle artifact:
- Transfer medium / handoff channel:
- Checksum / integrity evidence:
- Offline dependency bundle status:
- Ingress verification / import step:
- Rollback package / recovery bundle:
- Manual custody / operator handoff:
- Profile deviation / exception:

## 9. Open Questions
- [남은 질문]

## 10. Packet Citation Rule
- `PRF-03` active packet은 이 문서 경로 또는 승인된 동등 artifact 경로를 `Active profile references`에 포함해 인용한다.
- packet에는 `Transfer package / bundle artifact`, `Transfer medium / handoff channel`, `Checksum / integrity evidence`, `Offline dependency bundle status`, `Ingress verification / import step`, `Rollback package / recovery bundle`, `Manual custody / operator handoff`, `Profile deviation / exception`을 함께 남긴다.
- 다른 optional profile과 함께 조합되어도 이 profile의 required evidence는 생략하지 않는다.
- 실제 host/path, removable-media step, operator runbook, site-specific import or rollback detail은 packet 또는 project artifact에서 닫고, 이 profile을 현장 전용 절차로 오염시키지 않는다.
