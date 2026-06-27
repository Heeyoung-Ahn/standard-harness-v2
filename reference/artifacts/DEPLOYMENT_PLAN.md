# Deployment Plan

이 문서는 deploy/test/cutover 작업의 표준 `environment topology reference`다. 환경 경계가 있는 작업은 이 문서 또는 동등하게 승인된 artifact 없이 `Ready For Code`로 진행하지 않는다.

## Approval Rule
- deploy/test/cutover 작업은 이 문서 또는 승인된 동등 artifact를 먼저 작성하고 packet에 경로를 인용한다.
- source environment, target environment, execution target, execution owner, transfer boundary, rollback boundary, verification gate가 비어 있으면 `approved`로 올리지 않는다.
- execution target이 `unknown`이거나 rollback boundary가 `unknown`이면 planning hold를 유지한다.
- core는 topology boundary와 approval rule만 제공한다. 특정 host/path/operator step은 packet이나 상세 운영 문서에서 닫는다.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Deployment area | [작업 이름] | [왜 이 문서가 필요한지] | draft |
| Source environment | local / dev / stage / prod / other | [출발 환경] | draft |
| Target environment | local / dev / stage / prod / other | [도착 환경] | draft |
| Execution target | local-shell / ci-runner / remote-host / manual-transfer / other-approved | [누가 어디서 실행하는지] | draft |
| Transfer boundary | none / internal / external / airgapped / unknown | [이동 경계] | draft |
| Rollback readiness | ready / partial / none / unknown | [롤백 준비도] | draft |
| Ready for packet citation | approve / adjust / hold | [packet에 인용 가능한지] | draft |

## 1. Goal And Scope
- Goal:
- In-scope deploy/test/cutover activity:
- Out-of-scope activity:

## 2. Environment Topology
| Environment | Role | Owner | Access Mode | Notes |
|---|---|---|---|---|
| [environment] | [source/target/test] | [owner] | [access mode] | [비고] |

## 3. Execution Target And Owner
- Execution target:
- Execution owner:
- Required tool or runner:
- Human approval needed before execution:

## 4. Transfer Boundary
- Artifact or data being moved:
- Source boundary:
- Target boundary:
- Transfer method:
- Airgapped or manual step:

## 5. Rollback Boundary
- Rollback trigger:
- Rollback method:
- Rollback owner:
- What can be restored:
- What cannot be restored:

## 6. Verification Gate
- Preflight or prerequisite checks:
- Post-deploy verification:
- Cutover success signal:
- Stop condition:

## 7. Project-Specific Topology Detail
- Host/path/operator notes:
- Secret or credential boundary:
- Additional environment constraints:

## 8. Human Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
|---|---|---|---|---|
| Topology reference approved | yes / no | [owner] | pending | [reference completeness] |
| Execution target approved | yes / no | [owner] | pending | [runner / operator] |
| Rollback boundary approved | yes / no | [owner] | pending | [복구 범위] |

## 9. Open Questions
- [남은 질문]

## 10. Packet Citation Rule
- deploy/test/cutover packet은 이 문서 경로 또는 승인된 동등 artifact 경로를 `Environment topology reference`로 인용한다.
- packet에는 `Source environment`, `Target environment`, `Execution target`, `Transfer boundary`, `Rollback boundary`를 함께 남긴다.
- 환경 경계나 실행 주체가 바뀌면 packet과 이 문서를 같이 다시 연다.
