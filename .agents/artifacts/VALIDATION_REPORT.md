# Validation Report

## Summary
- Executed at: 2026-06-27T12:50:29.663Z
- Validator version: v1.3
- Cutover ready: yes
- Gate decision: pass
- Next action: Fill PROJECT_STARTER_DOC_PACK and close PLN-00/PLN-01 with explicit user confirmation.
- Scope: harness structural/state validation and workflow evidence consistency only; this is not product/feature verification approval.
- Product evidence owner: Tester/Reviewer/product-specific acceptance evidence.
- Surface role: persisted gate evidence only, not product acceptance; live re-entry should use `.agents/runtime/ACTIVE_CONTEXT.json` and CLI context/status.

## Active Profiles
- Source: .agents/artifacts/ACTIVE_PROFILES.md
- Status: empty
- Profiles: none

## Risk Classifications
- none

## Findings
- none

## Context Budget
- none

## V2.5 Risk-Adaptive Gate Summary
- Gate effect: blocking-in-packet-preflight-and-transition
- Lane: standard
- Phase: implementation
- Risk overlays: none
- Read set: 6 files, estimated 1854/2200 tokens
- Context budget status: warn
- Human manual auto-read: no
- Blocking diagnostics: no
- Overlay evidence:
  - none
- Next action: No V2.5 risk overlay evidence is currently routed; keep default context lean.

## LLM Judge
- Status: not-run
- Gate effect: advisory-only
- Work item: PLN-00
- Provider invocation: not-used
- Context package: ready
- Allowed input fields: requirementsSummary, modelingImpact, packetAcceptance, diffSummary, testEvidenceResult
- Result status: not-run
- Result source: not-run (.agents/runtime/judge/PLN-00.json)
- Can claim live independent review: no
- Rationale: No LLM judge result artifact exists for this work item.
- Advisory findings: none
- Advisory disagreements: none
- Diagnostics: none

## Security Review Summary
- Status: not-applicable
- Activation source: not declared
- Reason: Reusable security-review evidence is not requested by current packet/runtime metadata.

## Semantic Trace
- Path: .agents/runtime/agent-traces/PLN-00.json
- Work item: PLN-00
- Packet: PLN-00_DEEP_INTERVIEW
- Turn closed at: 2026-06-27T12:50:29.663Z
- Status: pass
- Warning count: 0
- Workflow discipline: pass / warning 0 / closeout hold 0 / hard error 0

## Candidate Gates
- required-evidence-present: candidate-only / Required evidence artifacts exist for the active work item.
- source-references-resolve: candidate-only / Referenced packet, SSOT, validation, and trace sources resolve locally.
- semantic-trace-present: candidate-only / A lightweight semantic trace artifact exists for the active work item.
- evidence-non-contradictory: candidate-only / Trace, packet, and active work metadata do not contradict each other.
- evidence-freshness: candidate-only / Validation and trace timestamps match the current report turn.
- validation-context-parity: candidate-only / Validation report and ACTIVE_CONTEXT expose the same harness state-validation summary.
