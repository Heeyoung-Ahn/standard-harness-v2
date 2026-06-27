# Authoritative Source Intake

이 문서는 새로 접수된 사용자 기획 문서, 정책 문서, 연동 명세를 표준 `authoritative source intake reference`로 등록할 때 사용하는 양식이다. planning baseline이나 active packet이 이 source의 영향을 받으면, 이 문서 또는 동등하게 승인된 artifact 없이 새 기준선으로 sync하지 않는다.

## Approval Rule
- 새 사용자 기획 문서, 정책 문서, 연동 명세가 requirements, architecture, implementation, active packet에 영향을 주면 intake를 먼저 작성한다.
- 이 문서는 source summary, authoritative reason, affected baseline artifacts, conflict summary, current implementation impact, required rework / defer, recommended disposition을 채우기 전에는 `approved`로 올리지 않는다.
- 기존 안정성 유지는 intake 보류 사유가 아니다. 기본 원칙은 신규 source의 완전 반영이다.
- `partial incorporation`, `defer`, `rejected-with-reason`은 명시적인 사용자 승인과 이유 기록 없이는 확정하지 않는다.
- conflict scope나 current implementation impact가 `unknown`이면 planning hold를 유지한다.
- 한 authoritative source change가 여러 open packet에 동시에 영향을 주면 `reference/artifacts/AUTHORITATIVE_SOURCE_WAVE_LEDGER.md`를 함께 열어 impacted packet set과 rebaseline status를 project-level로 닫는다.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Source name | [문서명] | [왜 중요한지] | draft |
| Source type | user-planning / policy / integration / other | [문서 종류] | draft |
| Authority level | top-priority / supporting | [왜 authoritative인지] | draft |
| Affected baseline scope | requirements / architecture / implementation / packet | [영향 범위] | draft |
| Conflict severity | none / low / medium / high / unknown | [기존 기준선과의 충돌 정도] | draft |
| Recommended disposition | implemented / deferred / rejected-with-reason / pending | [권장 처리] | draft |
| Ready for packet citation | approve / adjust / hold | [packet이나 baseline에 인용 가능한지] | draft |

## 1. Source Summary
- Source path / delivery:
- Received at:
- One-line summary:
- Key requested changes:

## 2. Why This Source Is Authoritative
- Who provided it:
- Why it overrides or updates existing planning:
- Superseded source or baseline:

## 3. Affected Baseline And Active Work
- Requirements impact:
- Architecture impact:
- Implementation plan impact:
- Active packet impact:
- Other affected artifacts:

## 4. Conflict With Existing Plan
- Existing assumptions that conflict:
- Previously approved packet or decision impacted:
- What can no longer remain unchanged:

## 5. Current Implementation Impact
- Already implemented behavior affected:
- Code or workflow areas likely requiring rework:
- Risk if not updated:

## 6. Required Rework / Replacement / Defer
- Required rework:
- Replacement or rollback need:
- Allowed defer item and why:

## 7. Project-Level Source Wave Impact
- Impacted packet set scope: single-packet / multi-packet
- Impacted packet paths:
- Packets that must reopen:
- Packets that may continue with adjustment:
- Why packet-local handling alone is insufficient:

## 8. Recommended Incorporation Decision
- Default stance: full incorporation
- Recommended disposition:
- Why:
- If not full incorporation, required explicit user approval note:

## 9. Human Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
|---|---|---|---|---|
| Source intake approved | yes / no | [owner] | pending | [intake completeness] |
| Conflict analysis approved | yes / no | [owner] | pending | [충돌 요약] |
| Shared-source rebaseline approved | yes / no | [owner] | pending | [multi-packet source wave일 때만 작성] |
| Partial incorporation / defer / rejection approved | yes / no | [owner] | pending | [필요 시만 작성] |

## 10. Open Questions
- [남은 질문]

## 11. Packet Citation Rule
- active packet과 planning baseline은 이 문서 경로 또는 승인된 동등 artifact 경로를 `Authoritative source intake reference`로 인용한다.
- packet에는 `Authoritative source refs`, `Authoritative source disposition`, `Existing plan conflict`, `Current implementation impact`, `Required rework / defer rationale`를 함께 남긴다.
- multi-packet source wave에 속한 packet은 `Impacted packet set scope`, `Authoritative source wave ledger reference`, `Source wave packet disposition`도 함께 남긴다.
- 새로운 source 정보가 추가되면 packet과 이 문서를 같이 다시 연다.
