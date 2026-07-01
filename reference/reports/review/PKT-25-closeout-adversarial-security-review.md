# PKT-25 Closeout Adversarial Security Review

Agent: `019f1b3a-54af-70f2-aa89-030de1c38e4d` / Wegener
Lens: `adversarial_security_review`
Status: hold
Date: 2026-07-01

## Files Reviewed
- `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`
- `reference/reports/developer/PKT-25_DEVELOPER_REPORT.md`
- `reference/reports/test/PKT-25_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-25-provider-topology-red-green.md`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `starter/standard-harness/_harness/README.md`
- `.agents/workflows/reviewer.md`
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/artifacts/REQUIREMENTS.md`

## Findings
1. Blocking: topology input validation is incomplete and not fail-closed enough. It does not fail closed on invalid `projectTopology.conductor`, unknown role keys, missing or duplicate `reviewerId`, missing `reviewLens`, invalid `workerAliases`, or ambiguous non-reviewer list assignments.
2. Blocking: adapter identity can be misrepresented in `providerTopologyEvidence`. Runtime readiness selects adapters from provider policy, but the topology evidence envelope copies `adapterId` directly from topology input, so an arbitrary adapter id can appear in evidence.
3. High: mixed legacy/topology conflict detection is too narrow. Simultaneous `reviewer_provider` and first-class `providerTopology` should be rejected, not only rejected when the selected provider differs.

## Positive Security Notes
- Real-smoke still requires explicit approval before execution.
- Capture artifacts are constrained under `_ops/capture`, hash-checked, JSON-validated, and require `trusted_harness_capture=true`.
- Sensitive-material scanning exists for captured descriptors and payloads.
- Evidence and public run records consistently set `approvalStateMutationAllowed=false`.
- README wording correctly says topology evidence does not approve RFC, closeout, release, residual risk, productization, or real-provider readiness.

## Residual Security Risks
- Real authenticated Codex CLI or Claude Code CLI readiness remains untested and out of PKT-25 scope.
- Capture artifact content is persisted into evidence; sensitive scanning is pattern-based and not complete DLP.
- Tester's payload-boundary command failed in root scope and must not be overstated as a clean-export validator pass.

## Disposition
Hold for PKT-25 closeout. No release, productization, starter promotion, or real-provider readiness is claimed.

