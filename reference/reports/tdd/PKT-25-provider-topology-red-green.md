# PKT-25 Provider Topology TDD Evidence

Packet: `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT`

## RED
- Test: `ConductorWorkerE2ETests.test_real_cli_consumes_packet_topology_for_codex_reviewer_without_string_override`
- Command: `py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `1`
- Expected failure: `execution_blocked` instead of `pass`.
- Bug reproduced: real-smoke readiness ignored `providerTopology.packetTopology.roles.reviewer` and still expected the default `Reviewer=claude_code` route.

## GREEN
- Command: `py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `0`
- Result: `Ran 13 tests ... OK`
- Implemented behavior: real-smoke role providers now derive Developer/Reviewer providers from `providerTopology.packetTopology.roles`, while `reviewer_provider` remains a backward-compatible fallback only.

## RED 2
- Tests:
  - `test_real_cli_reports_full_role_provider_matrix_and_mixed_reviewers`
  - `test_real_cli_provider_topology_invalid_or_conflicting_fields_fail_closed`
- Command: `py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `1`
- Expected failures:
  - `providerTopologyEvidence` missing from real-smoke result/evidence index.
  - unsupported, blank, and conflicting topology declarations fell through to captured-output missing diagnostics instead of failing closed at topology validation.

## GREEN 2
- Command: `py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `0`
- Result: `Ran 15 tests ... OK`
- Implemented behavior:
  - real-smoke output emits `standard-harness-provider-topology-evidence/v1`.
  - all six logical packet roles are represented in `roleAssignments`.
  - mixed Reviewer assignments are routed and reported separately by reviewer id, provider, and review lens.
  - unsupported, blank, and conflicting provider declarations fail closed before capture validation.

## Boundary
- No approval-state mutation is introduced.
- Provider ids remain configuration/evidence values, not product identity.
- This is the first implementation slice; full PKT-25 closeout still requires the remaining acceptance and review gates.

## RED 3
- Tests:
  - `test_real_cli_provider_topology_review_remediation_cases_fail_closed`
  - `test_real_cli_provider_topology_matrix_covers_every_role_against_both_providers`
  - `test_cli_persists_and_reports_provider_topology`
- Command: `py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `1`
- Expected failures:
  - missing CLI `provider-topology record/report` surface returned exit code `2`.
  - invalid conductor, unknown role, ambiguous role assignment, duplicate reviewer id, missing reviewer lens, invalid worker alias, adapter mismatch, and same-provider legacy/topology conflict did not fail closed.
  - role-provider matrix did not prove every logical role against both supported providers.

## GREEN 3
- Command: `py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `0`
- Result: `Ran 18 tests ... OK`
- Implemented behavior:
  - provider topology validation fails closed for reviewer remediation findings.
  - topology evidence normalizes adapter ids from provider policy.
  - `provider-topology record/report` persists and reports packet topology through operating-state events.
  - all six logical roles are covered against both `codex` and `claude_code` in the matrix fixture.

## RED 4
- Test: `test_cli_provider_topology_rejects_nested_authority_fields`
- Command: `PYTHONPATH=system py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `1`
- Expected failure: CLI returned `provider_topology_invalid:unknown_assignment_field:developer:approvalStateMutationAllowed`, but the initial test expected an exception instead of the existing CLI `exit=1` error contract.
- Security gap reproduced: durable topology record validation must reject nested authority-looking fields before persistence.

## GREEN 4
- Command: `PYTHONPATH=system py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `0`
- Result: `Ran 19 tests ... OK`
- Implemented behavior:
  - topology assignment validation fails closed on unknown nested fields.
  - normalized topology assignments retain only whitelisted provider topology contract fields.
  - CLI-level negative coverage proves nested `approvalStateMutationAllowed` is rejected before persistence.

## RED 5
- Tests:
  - `test_cli_provider_topology_rejects_worker_alias_authority_fields`
  - `test_real_cli_provider_topology_rejects_review_lens_and_evidence_ref_mismatch`
- Command: `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `1`
- Expected failures:
  - `workerAliases` could preserve nested authority-looking fields before persistence.
  - topology-declared `evidenceRef` was not propagated into readiness validation, so evidenceRef mismatch was not rejected.
  - reviewer lens mismatch needed explicit captured-output validation.

## GREEN 5
- Command: `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `0`
- Result: `Ran 21 tests ... OK`
- Implemented behavior:
  - `workerAliases` fail closed on unsupported alias keys and unknown nested fields.
  - normalized worker aliases retain only allowed topology alias fields.
  - provider topology evidence emits captured-role `evidenceRef`.
  - captured-output validation rejects reviewer lens and evidenceRef mismatches.
  - adapter manifest records are generated from the topology provider policy mapping.

## RED 6
- Test: `test_cli_persists_and_reports_provider_topology`
- Command: `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py`
- Initial finding: accepted whitespace-padded `workerAliases.worker2.role` and `reviewerId` could be validated with canonical values but persisted/reported as raw values.

## GREEN 6
- Command: `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `0`
- Result: `Ran 21 tests ... OK`
- Implemented behavior:
  - normalized worker alias `role` is persisted in stripped lowercase form.
  - normalized worker alias `reviewerId` is persisted in stripped form.
  - worker2 reviewer routing uses the same canonical interpretation.

## RED 7
- Tests:
  - `test_cli_persists_and_reports_provider_topology`
  - `test_real_cli_provider_topology_canonicalizes_reviewer_assignment_fields`
- Command: `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `1`
- Expected failures:
  - CLI report preserved raw reviewer assignment `reviewerId` as ` reviewer_b `.
  - real-smoke capture matching returned `execution_blocked` when topology reviewer assignment fields were whitespace-padded but the captured Reviewer record used canonical `reviewer_b` and `evidence_review`.

## GREEN 7
- Command: `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py`
- Exit code: `0`
- Result: `Ran 22 tests ... OK`
- Implemented behavior:
  - normalized reviewer assignment `reviewerId`, `reviewLens`, and `evidenceRef` are persisted in stripped form.
  - reviewer route metadata uses normalized assignment fields.
  - worker2 reviewer selection compares reviewer ids with stripped values.
  - canonical captured Reviewer records match topology declarations even when input JSON contained whitespace-padded reviewer assignment fields.
