---
doc_id: TEST_TAXONOMY
audience: agent-and-human
authority: test-reference
language: en
llm_read_policy: route_selected
default_context: false
---
# Test Taxonomy

This document classifies starter test ownership before higher-blast runtime decomposition packets such as validator, transition, packet-preflight, and validation-report boundary work.

It is route-selected reference material. It is not default AI context and it does not authorize test deletion, broad rename, assertion weakening, fixture data rewrite, or test-order/global-state changes.

## Category Definitions

| Category | Purpose | Examples | Owner | Allowed edits | Rename/removal constraints |
|---|---|---|---|---|---|
| current behavior test | Protects current starter behavior and public command/runtime contracts. | active context, agent routing, CLI entrypoint, payload boundary | Runtime maintainer / owning workflow role | Add assertions for new behavior or update expected wording with packet evidence. | Rename only with taxonomy update and full test pass. Remove only with replacement coverage. |
| compatibility regression fixture | Protects legacy/version namespace behavior and prevents old surfaces from silently regressing during refactor. | `v2-*`, `v2-p2-*`, `dev05-*`, compatibility command tests | Runtime maintainer | Add coverage around preserved behavior; avoid broad rewrites. | Do not delete or rename before a separate approved compatibility/deprecation packet. |
| integration smoke test | Exercises multi-surface flows such as init, evidence, transitions, and validation report generation. | init smoke, evidence scaffold, orchestrated closeout | Tester / Runtime maintainer | Add focused flow coverage with stable fixtures. | Do not weaken acceptance assertions or hide product/runtime failures. |
| docs/policy validation | Protects reference docs, human/AI read boundaries, command inventory, and policy docs. | `template-health-docs.test.js`, docs-command consistency | Documenter / Reviewer | Add route-selected doc assertions and command-policy checks. | Remove only when equivalent doc-policy or command audit coverage is documented. |
| security/risk gate test | Protects approval, security, validation, evidence, reproduction, dependency, secret, untrusted content, and risk-gate behavior. | `security-command-surfaces.test.js`, `risk-classifier.test.js`, `v2-5-risk-adaptive-gates.test.js` | Reviewer / Security reviewer | Add new risk fixtures and preserve fail-closed behavior. | Do not delete or loosen assertions without explicit replacement and security rationale. |
| helper-only fixture support | Provides setup helpers or fixture builders without owning behavior assertions. | `dev05-test-helpers.js`, `profile-aware-validator-fixtures.js` | Test maintainer | Setup-only extraction or deduplication. | Helpers must not hide behavior changes or absorb assertions without documented replacement. |

## Historical And Version Namespace Inventory

| File | Category | Protected behavior | Related runtime/command surface | Owner | Rename/removal policy |
|---|---|---|---|---|---|
| `dev05-test-helpers.js` | helper-only fixture support | DEV05 fixture/setup support remains explicit and setup-only. | DEV05 compatibility test helpers | Test maintainer | Keep name until a compatibility/deprecation packet approves rename; no assertion ownership. |
| `dev05-tooling.test.js` | compatibility regression fixture | DEV05 tooling behavior and compatibility command expectations. | DEV05 CLI/tooling surfaces | Runtime maintainer | No deletion or rename before compatibility policy update and replacement coverage. |
| `prf10-profile-connect.test.js` | compatibility regression fixture | PRF-10 profile selection, BI evidence starter files, and staging terminology. | Init profile catalog / PRF-10 profile docs | Planner / profile owner | Rename only with profile taxonomy update and equivalent assertions. |
| `v2-2-hardening.test.js` | compatibility regression fixture | V2.2 TDD, CSO, parallel, compound learning, review, and adapter hardening gates. | V2.2 hardening gates | Reviewer / Runtime maintainer | Preserve as compatibility fixture until approved deprecation. |
| `v2-3-lean-manuals.test.js` | compatibility regression fixture | Lean manual routing, default read policy, and human/manual separation. | V2.3 Lean Conductor / doc policy | Documenter / Runtime maintainer | Preserve category and assertions before manual routing changes. |
| `v2-4-risk-adaptive.test.js` | compatibility regression fixture | Risk-adaptive overlays, context meter, secret/untrusted/guard behavior. | V2.4 risk-adaptive runtime | Security reviewer / Runtime maintainer | No weakening of fail-closed risk assertions. |
| `v2-5-risk-adaptive-gates.test.js` | compatibility regression fixture | Integrated risk-gate, packet-preflight, transition, and validation-report diagnostics. | V2.5 risk gate surfaces | Reviewer / Runtime maintainer | No rename/removal before SH-016-style boundary coverage replaces it. |
| `v2-7-adapter-safety.test.js` | compatibility regression fixture | Adapter guard path/command safety compatibility. | V2.7 adapter guard | Security reviewer / Runtime maintainer | Preserve fail-closed unsafe-command assertions. |
| `v2-7-evidence-manifest.test.js` | compatibility regression fixture | Evidence manifest creation, binding, and closeout diagnostics. | V2.7 evidence manifest | Tester / Reviewer | Rename only with evidence manifest taxonomy update. |
| `v2-7-gate-semantics.test.js` | compatibility regression fixture | Gate semantics and codex-ready approval boundary. | V2.7 gate semantics / codex-ready | Reviewer / Runtime maintainer | Preserve approval-boundary assertions. |
| `v2-8-browser-evidence.test.js` | compatibility regression fixture | Codex Browser evidence prompt, intake, audit, and packet-preflight integration. | V2.8 browser evidence | Tester / Reviewer | Preserve browser-evidence contract assertions. |
| `v2-8-docs-command-consistency.test.js` | docs/policy validation | Docs command linter coverage for documented npm scripts. | V2.8 docs command consistency | Documenter / Runtime maintainer | Remove only with equivalent docs command audit coverage. |
| `v2-8-docs-commands.test.js` | docs/policy validation | Docs command inventory pass/fail and artifact write behavior. | V2.8 docs command inventory | Documenter / Runtime maintainer | Preserve command inventory regression coverage. |
| `v2-evidence-gates.test.js` | compatibility regression fixture | TDD evidence, CSO evidence, parallel batch, read-only DB, and compound learning gates. | V2 evidence gates | Reviewer / Runtime maintainer | Do not weaken evidence-gate assertions. |
| `v2-p2-conductor.test.js` | compatibility regression fixture | P2 reviewer profiles, learning staleness, automation candidates, dashboard, and plan-quality behavior. | V2 P2 conductor surfaces | PM / Reviewer / Runtime maintainer | Preserve until a specific P2 compatibility packet replaces coverage. |

## Assertion Preservation Policy

- Do not delete assertions without documented replacement.
- If an assertion moves, record the replacement location and rationale in the packet closeout.
- Helper extraction must be setup-only unless the replacement assertion and rationale are documented.
- Approval, security, validation, evidence, and risk-gate assertions were not weakened by this taxonomy packet.

## Helper Extraction Decision

No helper extraction performed.

Rationale: SH-V28-REFAC-010 establishes taxonomy and fixture ownership before runtime decomposition. The current packet does not need helper extraction to reduce risk, and creating a new helper surface without a concrete repeated setup target would add unnecessary abstraction.

## Future Runtime Decomposition Use

Before SH-V28-REFAC-009, SH-V28-REFAC-015, or SH-V28-REFAC-016 changes runtime boundaries, use this taxonomy to identify protected compatibility fixtures and risk/security gate assertions that must remain equivalent.
