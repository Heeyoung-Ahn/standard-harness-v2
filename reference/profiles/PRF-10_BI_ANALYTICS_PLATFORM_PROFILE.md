# BI Analytics Platform Profile

## Purpose
Use this optional profile for BI platforms, analytics portals, metric-serving products, operational dashboards, or data-distribution systems where source inventory, semantic modeling, metric definition, refresh/lineage, dashboard governance, and access boundaries are implementation-critical.

## Approval Rule
- Activate this profile explicitly before BI-heavy packets claim `Ready For Code`.
- BI support must stay reusable: do not place project-specific KPI formulas, warehouse schemas, tool choices, dashboard layouts, or team-specific role policy in this profile.
- This profile composes with `PRF-01`, `PRF-02`, `PRF-03`, and `PRF-06` when those concerns are also active.
- No packet may enter `Ready For Code` under this profile until the required BI artifact references and packet evidence are present or an explicit blocker is recorded.
- BI-heavy `Ready For Code` may use only `approved` BI evidence as implementation approval support.

## 1. Activation Trigger
- The product's main value is analytics delivery, metric serving, dataset publishing, dashboard distribution, or BI self-service.
- Source systems feed a reusable analytical model or dashboard/report surface.
- Metric meaning, freshness, lineage, reconciliation, or access policy can materially change product behavior or trust.

## 2. Required Design Evidence
- BI data source inventory
- BI metric catalog
- BI semantic model
- BI refresh and lineage plan
- BI dashboard governance reference

Keep these as separate reusable evidence surfaces. Metric meaning/ownership, analytical structure, refresh/lineage operations, and dashboard publication/access governance drift for different reasons and should not be collapsed into one mixed artifact by default.

## 3. Safety Rules
- No metric should be implemented without business meaning, owner, source, grain, and reconciliation rule.
- No dashboard/report surface should be implemented without audience, access boundary, refresh expectation, and certification/publication status.
- Semantic-model joins, entity grain, and dimension/measure ownership must be explicit before implementation.
- Backfill, late-arriving data, partial refresh failure, and stale-data disclosure rules require explicit packet evidence.
- This profile does not define one universal BI stack or one universal warehouse model.

## 4. Profile Composition Rule
- Compose with `PRF-02` when spreadsheets are authoritative source inputs or mapping references.
- Compose with `PRF-01` when the BI product includes admin/operator grids for dataset operations, correction, or triage.
- Compose with `PRF-06` when publish approval, audit, certification-state workflow, exception reopening, or role approval is implementation-critical.
- Compose with `PRF-03` when BI artifacts are delivered into airgapped or transfer-bound environments.
- `PRF-10` itself owns metric ownership/certification summary evidence, but it does not define one universal certification workflow or audit/reopen policy. Formal approval flow remains a `PRF-06` concern when required.

## 5. Required Packet Evidence
- Active profile references:
- Product source root:
- BI data source inventory reference:
- BI metric catalog reference:
- BI semantic model reference:
- BI refresh and lineage plan reference:
- BI dashboard governance reference:
- Primary analytical subject area:
- Source-to-model mapping summary:
- Metric ownership and certification summary:
- Freshness / latency expectation:
- Access / role / row-filter rule:
- Reconciliation / backfill / rollback rule:
- Profile deviation / exception:

## 6. Profile Vs Project Boundary
- Reusable profile owns: evidence categories, safety rules, and profile composition guidance.
- Project packet owns: concrete datasets, schema names, metric formulas, dashboard pages, SLA values, vendor/tool choices, and operational exceptions.
- Core must not absorb BI-specific default semantics or vendor preferences from this profile.

## 7. BI Evidence Staging
- `draft`: temporary discovery, mock, or prototype evidence; it is not implementation approval evidence.
- `approved`: reviewed evidence that may support BI-heavy `Ready For Code`.
- `deferred-with-reason`: intentionally deferred evidence with a reason and follow-up; it does not support BI-heavy implementation in the current packet.
- `not-needed`: PRF-10 does not apply to the packet or the specific BI evidence surface.

## 9. Open Questions
- None for the first-ship reusable baseline.
- Keep the metric catalog and semantic model as separate artifacts because semantic structure and metric-definition governance are different evidence classes.
- Keep refresh/lineage and dashboard governance as separate artifacts because data-operability risk and dashboard publication/access risk are different planning surfaces.
- Keep formal publish/certification workflow out of `PRF-10` by default; compose with `PRF-06` when approval-state, audit, or exception-reopen behavior is implementation-critical.
- Apply fail-fast validator enforcement only when `PRF-10` is explicitly active.

## 8. Packet Citation Rule
- Cite this profile in `Active profile references`.
- Cite the BI artifact reference paths in the packet.
- Do not approve BI-heavy `Ready For Code` when any required BI artifact evidence is missing, still `draft`, `deferred-with-reason`, or otherwise not `approved`.
