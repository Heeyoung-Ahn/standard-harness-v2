# PKT-26 Adversarial Security Review - Final A10 Root-Cause Remediation

- Packet: `PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION`
- Lens: `adversarial_security_review`
- Independent agent: `019f1c94-59df-74b3-8473-491ec40f327f` / Darwin
- Status: hold
- Reviewed at: 2026-07-01

## Findings

### P1 - Forged grant-file authority can still drive `conductor-approve`

- Source refs: `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_cli.py`, `starter/standard-harness/_harness/system/standard_harness/cli/main.py`, `starter/standard-harness/_harness/system/standard_harness/workflow/conductor.py`.
- Gap: `load_grant()` reads arbitrary JSON from `--grant-file`. `ConductorApprovalService.decide()` trusts caller-supplied `trusted_harness_surface=True` plus matching fields. `persist_conductor_approval()` can then persist Ready For Code or closeout approval.
- Required action: bind `conductor-approve` to service-owned `conductor_delegation_grants` rows or verified generated grant records, not arbitrary JSON fields.
- Required evidence: negative test for a fabricated grant file that attempts to approve through `conductor-approve`.

### P2 - `delegation_grant_id` is used as a filesystem path segment without safe-id validation

- Source refs: `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_cli.py`, `starter/standard-harness/_harness/system/standard_harness/cli/main.py`.
- Gap: separator, `..`, or absolute-path values are not rejected before writing `_ops/decisions/records/<id>.json`.
- Required action: validate grant IDs as safe identifiers and resolve/enforce the final path under `_ops/decisions/records`.

## Evidence Checked

- Confirmed final A10 runtime-ledger path no longer consumes `conductor.delegation_grant_recorded` payload authority; it reads `conductor_delegation_grants`.
- Confirmed raw `scoped_delegation` runtime entries are untrusted inputs, supplemental input is ignored, and trusted ledger provenance requires runtime builder output.
- Confirmed tests cover fabricated grant event rejection, marker removal, raw scoped delegation rejection, supplemental rejection, all loop decisions, and positive `--packet-id`.

## Limitations

- Read-only source-level adversarial review only; no exploit run was executed.

## Residual Risk

- Same-process Python remains outside a hard sandbox. That residual is acceptable only if the trusted command/service path is itself hardened; the forged `--grant-file` issue means that condition is not yet met.

## Recommendation

Hold PKT-26 closeout. Route through Orchestrator for Human Owner or valid delegated Conductor decision before any further same-class A10 remediation.
