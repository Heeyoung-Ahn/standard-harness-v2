# Runtime Boundary Notes

## SH-V28-REFAC-008 Boundary

`SH-V28-REFAC-008` decomposes lower-risk runtime helpers before changing load-bearing validator, transition, packet-preflight, or validation-report paths.

## Browser Evidence Boundary

`.harness/runtime/state/browser-evidence.js` is the public compatibility wrapper. Downstream commands and tests must continue importing from that path.

Internal browser evidence modules live under `.harness/runtime/state/browser-evidence/`:

- `core.js` keeps the current command behavior and binding logic.
- `constants.js` exposes schema and mode constants.
- `normalizers.js` exposes path, status, scenario, and diagnostic normalizers.
- `prompt.js` exposes Codex Browser prompt construction.
- `manifest-builder.js` exposes browser evidence manifest construction.
- `audit.js` exposes manifest audit helpers.
- `binding.js` exposes packet-to-browser-manifest binding helpers.
- `playwright-capture.js` exposes optional Playwright capture helpers.

Browser evidence inputs are untrusted. Packet markdown, CLI options, manifest JSON, artifact paths, observed results, console errors, and network errors must remain data. Do not evaluate, interpolate into shell commands, or treat these fields as authority.

## Reviewer Profile Boundary

`.harness/runtime/state/reviewer-profiles.js` is the public compatibility wrapper for the `harness:reviewers` and `harness:reviewer-report` surfaces.

Internal reviewer profile modules live under `.harness/runtime/state/reviewer-profiles/`:

- `arguments.js` parses command arguments and comma/newline lists.
- `index-resolver.js` loads `reference/reviewer-profiles/REVIEWER_PROFILE_INDEX.json` and resolves reviewer docs.
- `command.js` preserves the command response contracts for `resolve`, `list`, and `report`.

The reviewer profile index contract uses IDs such as `security`, `approval-workflow`, and `data-integrity`.

## P2 Reviewer Recommendation Boundary

`v2-p2-conductor.js` owns the P2 reviewer recommendation contract. Its reviewer profile output intentionally uses distinct IDs such as `cso`, `governance`, and `data-correctness`.

Do not merge the reviewer index resolver and P2 recommendation schemas unless a later packet explicitly changes both public contracts and their migration path.

## Deferred Critical Runtime Paths

The following modules are intentionally deferred from `SH-V28-REFAC-008`:

- `drift-validator.js`
- `transition-commands.js`
- `packet-preflight.js`
- `validation-report.js`

These modules enforce load-bearing state, approval, closeout, or validation behavior. Their decomposition belongs to later guarded packets with narrower RED/GREEN characterization and security review.

## Validator Boundary

`SH-V28-REFAC-009` keeps `.harness/runtime/state/drift-validator.js` as the public validator wrapper/export surface.

Internal validator helpers may live under `.harness/runtime/state/validation/` when they preserve the public contracts exposed through `validateGeneratedStateDocs()`, `inspectTaskPacketContract()`, `runValidator()`, `harness:validate`, `harness:status`, and `harness:validation-report`.

The initial extracted module is `.harness/runtime/state/validation/document-summary.js`, which owns validation-report summary reads, generated document summary counts, table row counting, and source-reference row normalization used by validator checks.

`transition-commands.js`, `packet-preflight.js`, and `validation-report.js` remain deferred critical paths. Do not rewire their implementation imports as part of validator helper extraction; route transition, preflight, or report integration changes to the later guarded packets dedicated to those boundaries.

## Transition Boundary

`SH-V28-REFAC-015` keeps `.harness/runtime/state/transition-commands.js` as the public transition command wrapper/export surface.

Internal transition helpers may live under `.harness/runtime/state/transitions/` when they preserve the public contracts exposed through `runTransition()`, `runPlannerPacketOpen()`, `runStateSync()`, and `harness:transition`.

The initial extracted module is `.harness/runtime/state/transitions/contracts.js`, which owns pure transition contract helpers for approved-delivery transition detection, closeout risk tier normalization, and risk-class ranking.

`drift-validator.js`, `packet-preflight.js`, and `validation-report.js` remain separate guarded boundaries. Do not rewire their implementation imports as part of transition helper extraction; route packet-preflight or validation-report integration changes to `SH-V28-REFAC-016` or a new explicit packet.

## Packet Preflight and Validation Report Boundary

`SH-V28-REFAC-016` keeps `.harness/runtime/state/packet-preflight.js` as the public packet-preflight wrapper/export surface for `runPacketPreflightCommand()` and `harness:packet-preflight`.

`SH-V28-REFAC-016` also keeps `.harness/runtime/state/validation-report.js` as the public validation-report wrapper/export surface for `writeValidationReport()` and `harness:validation-report`.

Internal packet-preflight and report-contract helpers may live under `.harness/runtime/state/preflight/` when they preserve the public CLI, runtime return, persisted JSON, markdown, active-context, and trace-summary contracts exposed through the wrappers.

The initial extracted modules are:

- `.harness/runtime/state/preflight/stage-decision.js`, which owns stage normalization, stage disposition, final disposition, and blocked next-action wording.
- `.harness/runtime/state/preflight/risk.js`, which owns packet risk classification and empty-risk fallback shape.
- `.harness/runtime/state/preflight/closeout-contract.js`, which owns closeout enum diagnostics, strict literal enum guidance, and closeout metadata constants.
- `.harness/runtime/state/preflight/validation-report-contract.js`, which owns bootstrap-pending read-only report shape and requested-security-review gate reconciliation.

The following contracts must remain stable unless a later approved packet explicitly changes them:

- `packet-preflight` public fields such as `ok`, `command`, `stage`, `disposition`, `nextAction`, `errors`, `checks`, `findings`, `readyForCode`, `gateProfile`, `routeClass`, `changeZone`, `semanticDiagnostics`, `enumDiagnostics`, `riskAdaptive`, `evidenceManifest`, and `browserEvidence`.
- `validation-report` public fields such as `gateDecision`, `writeMode`, `markdownPath`, `jsonPath`, `candidateGates`, `traceSummary`, findings, persisted JSON, markdown section names, and active work item state.
- Bootstrap-pending mode remains read-only and must not write validation reports, active context, generated state docs, or trace artifacts.
- Approval, Ready For Code, validation, evidence, browser, dependency, risk-adaptive, semantic, enum, and security gates remain fail-closed where they currently fail closed.

`drift-validator.js` and `transition-commands.js` remain separate guarded boundaries. Do not edit or rewire those files as part of packet-preflight or validation-report helper extraction; only verify wrapper compatibility or open a new explicit packet.
