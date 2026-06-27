# Authoritative Source Wave Ledger

이 문서는 하나의 authoritative source change가 여러 open packet에 동시에 영향을 줄 때, impacted packet set과 packet별 rebaseline 상태를 project-level로 닫는 표준 control artifact다. source 자체의 권위와 충돌 분석은 `AUTHORITATIVE_SOURCE_INTAKE.md`가 담당하고, 이 문서는 그 source wave가 어떤 packet을 다시 열고 어떤 packet이 조정 후 계속 진행 가능한지 운영 truth로 묶는다.

## Approval Rule
- One authoritative source change that affects more than one open packet must be tracked as a shared-source wave.
- source wave가 `multi-packet`이면 impacted packet set과 rebaseline status가 채워지기 전에는 `approved`로 올리지 않는다.
- packet subset만 reopen하고 다른 affected packet을 stale 상태로 남기는 운영은 허용하지 않는다.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Source wave name | [wave name] | [왜 이 wave를 별도 관리하는지] | draft |
| Intake reference | [AUTHORITATIVE_SOURCE_INTAKE path] | [어느 intake와 연결되는지] | draft |
| Impacted packet scope | single-packet / multi-packet | [영향 범위] | draft |
| Rebaseline recommendation | reopen-all / selective-adjust / hold | [권장 처리] | draft |
| Ready for packet citation | approve / adjust / hold | [packet이 이 ledger를 인용 가능한지] | draft |

## 1. Source Wave Summary
- Source wave trigger:
- Intake reference:
- Prior baseline snapshot:
- New source snapshot:
- Why this is a shared-source wave:

## 2. Baseline And Release Impact
- Requirements impact:
- Architecture impact:
- Implementation plan impact:
- Release or milestone impact:
- Generated docs / active context impact:

## 3. Freeze / Continue Boundary
- Packets that must stop and reopen:
- Packets that may continue after adjustment:
- Work that must not proceed until rebaseline closes:
- Why this boundary is safe:

## 4. Impacted Packet Set
| Packet path | Prior source snapshot | Required action | Rebaseline status | Notes |
|---|---|---|---|---|
| reference/packets/PKT-01_ACTIVE_PACKET.md | 2026-04-23-v1 | adjust | pending | example row |

## 5. Rebaseline Exit Criteria
- Every affected packet is listed in the impacted packet set.
- Each packet has an explicit required action and rebaseline status.
- No packet continues on stale source assumptions after the wave is approved.
- Packet-level disposition matches the corresponding impacted packet row.

## 6. Human Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
|---|---|---|---|---|
| Shared-source wave identified correctly | yes / no | [owner] | pending | [why multi-packet] |
| Impacted packet set complete | yes / no | [owner] | pending | [누락 packet 없는지] |
| Rebaseline strategy approved | yes / no | [owner] | pending | [reopen / adjust / hold] |

## 7. Open Questions
- [남은 질문]

## 8. Packet Citation Rule
- Impacted packets cite this ledger as Authoritative source wave ledger reference.
- multi-packet source wave packet은 `Impacted packet set scope`, `Authoritative source wave ledger reference`, `Source wave packet disposition`을 함께 남긴다.
- packet의 cited disposition은 impacted packet row의 `Required action`과 운영적으로 모순되지 않아야 한다.
