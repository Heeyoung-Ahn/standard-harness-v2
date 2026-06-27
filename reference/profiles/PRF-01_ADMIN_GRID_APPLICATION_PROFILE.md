# Admin Grid Application Profile

이 문서는 grid-heavy administrative application의 표준 optional profile reference다. 내부 운영자/관리자가 많은 레코드를 search, filter, sort, inspect, update, bulk-handle 하는 제품을 다룰 때는 이 문서 또는 동등하게 승인된 artifact를 explicit profile dependency 없이 건너뛰지 않는다.

## Approval Rule
- 이 profile은 requirements의 `Active Profile Selection`, architecture의 active profile 기록, task packet의 `Active profile dependency`가 모두 `PRF-01`로 맞을 때만 활성이다.
- `PRF-01` active packet은 이 문서 경로 또는 승인된 동등 artifact 경로를 `Active profile references`에 포함해 인용한다.
- `Primary admin entity / surface`, `Grid interaction model`, `Search / filter / sort / pagination behavior`, `Row action / bulk action rule`, `Edit / save pattern`, `Profile deviation / exception`이 비어 있으면 planning/design hold를 유지한다.
- profile은 grid-first reusable bias만 제공한다. 실제 column set, permission matrix, export/report format, entity-specific wording, one-off workflow는 project packet에 남긴다.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Product area | [제품/기능 이름] | [왜 admin-grid profile이 필요한지] | draft |
| Primary admin job | record-admin / queue-admin / catalog-admin / operations-admin / other-approved | [주요 운영 행위] | draft |
| Information density | medium / high | [왜 이 밀도가 필요한지] | draft |
| Mutation mode | read-mostly / row-action / inline-edit / bulk-action / mixed | [기본 수정 방식] | draft |
| Deviation status | none / pending / approved | [profile 기본값에서 벗어나는지] | draft |
| Ready for packet citation | approve / adjust / hold | [packet에 인용 가능한지] | draft |

## 1. Best Fit
- Primary user:
- Why this is an admin-grid product:
- Why a non-grid archetype or one-off packet-only design fits less well:

## 2. Activation Signals
- Repeated operator workflow over many records:
- Need for search / filter / sort / pagination:
- Need for row detail and row-level action:
- Need for controlled bulk action or batch mutation:
- Why this should be a profile, not a project-only packet:

## 3. Default Surface Shape And Information Hierarchy
- What must be visible first:
- Preferred summary-to-grid-to-detail order:
- Preferred desktop/mobile bias:
- When detail drawer, side panel, or separate detail page is acceptable:

## 4. Default Interaction Model
- Search / filter / sort behavior:
- Pagination or infinite-scroll rule:
- Row selection rule:
- Row action vs bulk action rule:
- Edit / save pattern:
- Empty / loading / error / stale state expectation:

## 5. Safety And Feedback Expectations
- Bulk mutation confirmation rule:
- Destructive action guardrail:
- Validation / audit / operator feedback expectation:
- Permission-sensitive action expectation:

## 6. Allowed Deviation And Approval Boundary
- Allowed deviation examples:
- Deviation requested for this product:
- Why the deviation is needed:
- Required human approval:

## 7. Profile Vs Project Boundary
- What stays in the reusable profile:
- What must stay in the project packet:
- What must never be promoted into core:

## 8. Required Packet Evidence
- Active profile references:
- Primary admin entity / surface:
- Grid interaction model:
- Search / filter / sort / pagination behavior:
- Row action / bulk action rule:
- Edit / save pattern:
- Profile deviation / exception:

## 9. Open Questions
- [남은 질문]

## 10. Packet Citation Rule
- `PRF-01` active packet은 이 문서 경로 또는 승인된 동등 artifact 경로를 `Active profile references`에 포함해 인용한다.
- packet에는 `Primary admin entity / surface`, `Grid interaction model`, `Search / filter / sort / pagination behavior`, `Row action / bulk action rule`, `Edit / save pattern`, `Profile deviation / exception`을 함께 남긴다.
- 다른 optional profile과 함께 조합되어도 이 profile의 required evidence는 생략하지 않는다.
- 실제 column set, permission matrix, export/report shape, entity wording, one-off workflow는 packet 또는 project artifact에서 닫고, 이 profile을 project-specific detail로 오염시키지 않는다.
