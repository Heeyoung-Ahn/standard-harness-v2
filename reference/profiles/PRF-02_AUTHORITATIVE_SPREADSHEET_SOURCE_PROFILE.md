# Authoritative Spreadsheet Source Profile

이 문서는 spreadsheet-backed planning 또는 operational input을 표준 optional profile로 다루기 위한 reference다. workbook, sheet, tab, range, header mapping이 실제 requirements, architecture, implementation, active packet에 직접 영향을 주는 프로젝트에서는 이 문서 또는 동등하게 승인된 artifact를 explicit profile dependency 없이 건너뛰지 않는다.

## Approval Rule
- 이 profile은 requirements의 `Active Profile Selection`, architecture의 active profile 기록, task packet의 `Active profile dependency`가 모두 `PRF-02`로 맞을 때만 활성이다.
- `PRF-02` active packet은 이 문서 경로 또는 승인된 동등 artifact 경로를 `Active profile references`에 포함해 인용한다.
- `Source spreadsheet artifact`, `Workbook / sheet / tab / range trace`, `Header / column mapping`, `Row key / record identity rule`, `Source snapshot / version`, `Transformation / normalization assumptions`, `Reconciliation / overwrite rule`, `Profile deviation / exception`이 비어 있으면 planning hold를 유지한다.
- profile은 spreadsheet traceability와 source-governance bias만 제공한다. 실제 workbook name, tab layout, formula detail, project-specific columns, import script, business translation rule은 project packet에 남긴다.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Source area | [기획/운영 영역] | [왜 spreadsheet profile이 필요한지] | draft |
| Spreadsheet role | planning-source / field-mapping-source / backlog-source / operational-source / other-approved | [어떤 authoritative 역할인지] | draft |
| Workbook stability | volatile / versioned / controlled | [변경 성격] | draft |
| Mapping granularity | workbook / sheet / range / row / cell | [어디까지 trace가 필요한지] | draft |
| Deviation status | none / pending / approved | [profile 기본값에서 벗어나는지] | draft |
| Ready for packet citation | approve / adjust / hold | [packet에 인용 가능한지] | draft |

## 1. Best Fit
- Primary user or operator:
- Why this spreadsheet is authoritative:
- Why packet-only handling or a generic document intake is insufficient:

## 2. Activation Signals
- Workbook or spreadsheet file is a recurring planning or operational source:
- Specific sheet/tab/range drives requirements, field mapping, or work execution:
- Manual transcription or import drift risk exists:
- Why this should be a reusable profile rather than a project-only packet:

## 3. Required Traceability Surface
- Source spreadsheet artifact path or delivery method:
- Workbook / sheet / tab / range trace expectation:
- Header / column mapping expectation:
- Row key / record identity expectation:
- Snapshot / version capture expectation:

## 4. Mapping And Transformation Discipline
- Allowed normalization or transformation:
- Required disclosure of assumptions:
- Formula / derived-field handling rule:
- Missing row / missing column / renamed header handling rule:

## 5. Reconciliation And Change Control
- Source refresh cadence:
- Reconciliation / overwrite rule:
- Conflict or drift reporting expectation:
- Human approval boundary for partial incorporation or stale mapping:

## 6. Allowed Deviation And Approval Boundary
- Allowed deviation examples:
- Deviation requested for this project:
- Why the deviation is needed:
- Required human approval:

## 7. Profile Vs Project Boundary
- What stays in the reusable profile:
- What must stay in the project packet:
- What must never be promoted into core:

## 8. Required Packet Evidence
- Active profile references:
- Source spreadsheet artifact:
- Workbook / sheet / tab / range trace:
- Header / column mapping:
- Row key / record identity rule:
- Source snapshot / version:
- Transformation / normalization assumptions:
- Reconciliation / overwrite rule:
- Profile deviation / exception:

## 9. Open Questions
- [남은 질문]

## 10. Packet Citation Rule
- `PRF-02` active packet은 이 문서 경로 또는 승인된 동등 artifact 경로를 `Active profile references`에 포함해 인용한다.
- packet에는 `Source spreadsheet artifact`, `Workbook / sheet / tab / range trace`, `Header / column mapping`, `Row key / record identity rule`, `Source snapshot / version`, `Transformation / normalization assumptions`, `Reconciliation / overwrite rule`, `Profile deviation / exception`을 함께 남긴다.
- 다른 optional profile과 함께 조합되어도 이 profile의 required evidence는 생략하지 않는다.
- 실제 workbook name, tab layout, formula detail, project-specific column or translation detail은 packet 또는 project artifact에서 닫고, 이 profile을 project-specific spreadsheet detail로 오염시키지 않는다.
