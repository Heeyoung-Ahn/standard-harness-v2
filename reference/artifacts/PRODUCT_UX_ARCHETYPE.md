# Product UX Archetype

이 문서는 user-facing 작업의 표준 `UX archetype reference`다. 사용자에게 노출되는 기능이나 화면을 설계할 때는 이 문서 또는 동등하게 승인된 artifact 없이 `Ready For Code`로 진행하지 않는다.

## Approval Rule
- user-facing 작업은 이 문서 또는 승인된 동등 artifact를 먼저 작성하고 packet에 경로를 인용한다.
- selected archetype, archetype fit rationale, allowed deviation, approval boundary가 비어 있으면 `approved`로 올리지 않는다.
- selected archetype이 `unknown`이거나 deviation status가 `pending`이면 design hold를 유지한다.
- core는 archetype catalog와 deviation rule만 제공한다. project-specific copy, one-off interaction, unique layout detail은 packet이나 상세 디자인에서 닫는다.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Product area | [제품/기능 이름] | [왜 이 문서가 필요한지] | draft |
| Selected archetype | reading-desk / workflow-workbench / queue-workbench / monitoring-console / record-admin / other-approved | [왜 이 archetype인지] | draft |
| Primary user mode | read / decide / triage / edit / monitor | [주요 사용 행위] | draft |
| Information density | low / medium / high | [어떤 밀도가 맞는지] | draft |
| Deviation status | none / pending / approved | [기본 archetype과 차이가 있는지] | draft |
| Ready for packet citation | approve / adjust / hold | [packet에 인용 가능한지] | draft |

## 1. Product Goal And Primary User
- Product goal:
- Primary user:
- Primary decision or action cadence:

## 2. Archetype Catalog
| Archetype | Best For | Default Bias | Typical Surface Shape |
|---|---|---|---|
| `reading-desk` | 상태/판단 근거를 읽고 결정해야 하는 제품 | summary-first, evidence-backed detail, low write pressure | summary rail + active detail + source viewer |
| `workflow-workbench` | 단계별 입력/검토/확정이 필요한 제품 | guardrail-first, guided progression, explicit confirmation | step flow + review panel + confirmation states |
| `queue-workbench` | 반복 아이템을 처리/분류/확정하는 제품 | list-detail, fast triage, per-item resolution | queue/list + item detail + action rail |
| `monitoring-console` | 상태 감시와 예외 탐지가 핵심인 제품 | status-first, alert visibility, drill-down | status overview + alert list + diagnostic detail |
| `record-admin` | 많은 레코드 조회/정렬/수정이 핵심인 제품 | density-first, filter/sort control, bulk safety | grid/table + filters + detail drawer |
| `other-approved` | catalog 밖 archetype이 필요한 제품 | explicit rationale and approval required | approved equivalent only |

## 3. Selected Archetype And Fit
- Selected archetype:
- Why this archetype fits the product:
- Why the other common archetypes fit less well:

## 4. Must-Preserve Information Hierarchy
- What must be visible first:
- What can stay in detail:
- What must always expose source trace or rationale:

## 5. Default Interaction And State Model
- Primary navigation model:
- Primary interaction model:
- Empty / error / loading / stale state expectations:
- Read/write boundary:

## 6. Content And Layout Bias
- Preferred information density:
- Preferred summary-to-detail pattern:
- Preferred emphasis:
- Layout constraints or defaults:

## 7. Allowed Deviation And Approval Boundary
- Allowed deviation examples:
- Deviation requested for this product:
- Why the deviation is needed:
- Required human approval:

## 8. Profile Vs Project Boundary
- What stays in core archetype contract:
- What should move to optional profile if repeated:
- What stays project-specific:

## 9. Open Questions
- [남은 질문]

## 10. Packet Citation Rule
- user-facing packet은 이 문서 경로 또는 승인된 동등 artifact 경로를 `UX archetype reference`로 인용한다.
- packet에는 `Selected UX archetype`, `UX deviation status`, `Archetype deviation / approval`을 함께 남긴다.
- archetype이나 deviation이 바뀌면 packet과 이 문서를 같이 다시 연다.
