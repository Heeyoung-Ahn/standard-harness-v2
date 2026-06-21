# Standard Harness Final Product Inheritance Traceability Matrix v1

## Purpose

This matrix closes FP-13B by mapping inherited harness concepts and rejected legacy patterns to final-product requirement IDs, implementation evidence, and contract test coverage.

| requirement_id | inheritance decision | MVP evidence | release-quality evidence | KFIX evidence | final-product evidence | contract test or anti-requirement |
| --- | --- | --- | --- | --- | --- | --- |
| SH-INHERIT-001 | Preserve validated concepts but reconstruct implementation around the new event-sourced kernel. | MVP packet-state-evidence-gate-closeout flow. | release-quality closeout and starter validation. | KFIX-001 MVP Integrity Hardening. | FP-01 replay/recovery, FP-02 SSOT lifecycle, FP-13B matrix. | contract test: `tests/contract/test_inheritance_traceability_matrix.py` |
| SH-INHERIT-002 | Keep required legacy concepts only when reconstructed behind provider-neutral kernel boundaries. | MVP command workflow and contract tests. | release-quality README, CI, changelog, and deferred issue plan. | KFIX-001 closeout and integrity regression coverage. | FP-04 completion gate, FP-06 runtime evidence, FP-07 review bundles, FP-09 security governance, FP-10 memory/dashboard, FP-13C command inventory. | concept mapping rows below. |
| SH-INHERIT-003 | Reject implementation patterns that weaken provider neutrality, event sourcing, evidence, diagnostics, or risk-adaptive operation. | MVP adapter mock-success rejection and state kernel tests. | release-quality validation and CI evidence. | KFIX-001 false-completion hardening. | FP-05 adapter contract matrix, FP-06 runtime profiles, FP-08 drift reconciliation, FP-09 policy gates, FP-11 cloud fallback. | rejection mapping rows below. |
| SH-INHERIT-004 | Map each inherited concept to a new architecture capability and each rejected implementation pattern to an anti-requirement, validator, architecture constraint, or review checklist item. | MVP contract and integration tests. | release-quality closeout evidence. | KFIX-001 regression note. | FP-13B matrix plus final conformance report. | contract test: `tests/contract/test_inheritance_traceability_matrix.py` |

## Concept Mapping

| inherited concept | new architecture capability | implementation evidence |
| --- | --- | --- |
| packet-first workflow | canonical packet lifecycle and workflow orchestration | MVP packet tests, FP-07 workflow services |
| preflight gate | readiness and closeout diagnostics | MVP readiness tests, FP-04 completion gate |
| TDD RED/GREEN evidence | evidence registry and claim ledger | MVP evidence tests, FP-13 self-improvement proposal tests |
| browser/real runtime evidence | runtime evidence profiles | FP-06 browser/cloud/device contracts |
| real-browser functional scenario evidence | browser evidence contract distinguishes functional scenario evidence from render-only checks | FP-06 browser evidence contract tests |
| DB-backed runtime evidence split | evidence provenance and adapter invocation ledger | FP-05 invocation ledger, FP-06 runtime profiles |
| security evidence and redaction | security policy, privacy, redaction, retention audit | FP-09 security governance, FP-12 redaction audit |
| evidence manifest | canonical evidence registry and adapter artifact manifests | MVP evidence tests, FP-05 invocation ledger |
| Active Context | generated projection with freshness checks | MVP context projection, FP-07 routing, FP-10 memory |
| projection freshness checks | stale projection diagnostics and closeout blocking | FP-01 recovery, FP-07 review bundle staleness, FP-10 memory freshness |
| operating state + generated projections | append-only events plus non-authoritative generated projections | FP-01 replay/audit, MVP current context projection |
| packet-scope parity matrix | packet-owned artifact, evidence, gate, and closeout coverage checks | FP-04 completion coverage, FP-08 drift reconciliation |
| risk-adaptive independent review | role cards, challenge review, independent review, and adjudication lifecycle | FP-07B role cards, FP-07C adjudication |
| artifact-sync and generated excerpt freshness checks | filesystem drift and projection freshness diagnostics | FP-08A filesystem drift, FP-07 stale context eval |
| operator diagnostic repair hints | machine-readable diagnostics with human repair guidance | MVP diagnostics, FP-04 completion diagnostics, FP-11 cloud diagnostics |
| role authority boundary | role cards and skill policy | FP-07B role card tests |
| agent session/route event recording | workflow orchestration and context routing records | FP-07 workflow run and routing tests |
| starter payload boundary | starter manifest and contamination checks | MVP starter tests and release-quality starter validation |
| docs command inventory | docsops command inventory and freshness gate | FP-13C command inventory |
| development catalogs and command inventories | docsops inventory and policy bundle compatibility records | FP-13C command inventory, FP-09 policy bundles |
| harness contract tests | contract and eval suite | SH-DOG-002 final suite coverage |

## Rejection Mapping

| rejected implementation pattern | anti-requirement or validator mapping |
| --- | --- |
| Codex-only core structure | Provider-neutral adapter and workflow contracts prevent a provider-specific core. |
| provider-specific command model as core workflow | Command inventory classifies provider commands as docs/operators, not canonical workflow state. |
| provider-specific subagent terminology as the canonical review model | Review bundles, independent review, and adjudication use provider-neutral role and review records. |
| monolith validator | Validation remains modular across readiness, completion, policy, adapter, state recovery, and docs freshness gates. |
| monolith packet preflight | Readiness, policy, completion, drift, recovery, and docs gates remain separate services. |
| monolith agent routing | Workflow orchestration, review routing, and context projection remain separate provider-neutral modules. |
| Markdown heading parser as primary contract | SSOT extraction produces reviewable registration diffs before canonical registry mutation. |
| mutable-state-only model | Append-only events plus replay and audit snapshots are required. |
| v2 compatibility layer accumulation in core | Schema compatibility and migration policies are explicit, not hidden compatibility accretion. |
| artifact-free pass states | Evidence, claim, gate, closeout, and completion require provenance. |
| render-only browser checks as functional evidence | Runtime evidence profiles separate render checks from functional evidence. |
| schema-only database checks as runtime persistence evidence | Runtime evidence profiles require behavior evidence, not schema existence alone. |
| stale generated excerpts or artifact-sync reports as pass evidence | Projection freshness and filesystem drift block stale authority. |
| command output that hides the exact failed field, enum, gate, or repair path | Diagnostics preserve machine-readable failed field, enum, gate, source, and repair hint. |
| universal heavy review burden for low-risk/editorial work | Risk-adaptive workflow is allowed only with preserved traceability. |
| mock adapter success as production success | Mock/test adapters cannot be production success evidence. |
