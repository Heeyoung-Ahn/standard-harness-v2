# PRF-04 Legacy Excel/VBA-MariaDB Replacement Profile

## Purpose
Use this optional profile when a project replaces an internal business application currently operated through Excel workbooks, VBA macros, MariaDB tables, manual operator steps, or a combination of those sources.

## Approval Rule
- Activate this profile explicitly before design or implementation of a legacy replacement work item.
- Do not treat a workbook or database dump as complete requirements without inventory, ownership, and reconciliation evidence.
- Project-specific workbook names, sheet names, SQL object names, business formulas, account codes, asset categories, or approval chains stay in project packets.
- No packet may enter `Ready For Code` under this profile until legacy source inventory and migration/reconciliation evidence are complete or an explicit blocker is recorded.

## 1. Activation Trigger
- Existing production logic is stored in Excel formulas, VBA, MariaDB objects, or manual operator procedure.
- A new web app must replace, import, reconcile, or parallel-run against that existing system.
- The work item has data-impact or process-impact risk tied to the legacy system.

## 2. Core Boundary
This profile defines intake and evidence discipline only. It does not define budget, asset, accounting, tax, or company-specific business rules.

## 3. Required Intake Surfaces
- Workbook inventory
- Workbook / sheet / tab / range trace
- Header / column mapping
- Formula / named range / lookup inventory where applicable
- VBA module / macro / function inventory
- MariaDB schema snapshot
- Query / view / procedure / trigger inventory where available
- Scheduled and manual operator steps
- Current import / export / report paths
- Source-of-truth ownership
- Reconciliation and parallel-run evidence

## 4. Migration And Reconciliation Gate
- Source data snapshot:
- Target schema impact:
- Transformation / normalization assumptions:
- Row identity / matching rule:
- Financial, count, balance, or asset reconciliation rule:
- Rollback and re-run strategy:
- Cutover freeze / lock window:
- Post-cutover verification:

## 5. Project Boundary
Project packets own actual workbook names, sheet ranges, SQL names, matching keys, migration scripts, reconciliation thresholds, and acceptance criteria.

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- Legacy system source inventory:
- Workbook / sheet / tab / range trace:
- Header / column mapping:
- VBA module / macro / function inventory:
- MariaDB schema snapshot:
- Current import / export / report paths:
- Source-of-truth ownership:
- Migration / reconciliation plan:
- Parallel-run / reconciliation evidence:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Cite this profile in `Active profile references`.
- Cite concrete legacy source artifacts in the packet or project artifact.
- If evidence is unavailable, record the missing source as a blocker instead of approving `Ready For Code`.
