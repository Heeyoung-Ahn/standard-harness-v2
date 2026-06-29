# PKT-12 Risk Taxonomy Evidence

- Work item: `PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP`
- Status: pass

## Implemented Policy
- Canonical starter packet schema risk levels are now `low`, `standard`, `high`, and `critical`.
- `medium` is no longer a canonical `packet.schema.json` enum value.
- Compatibility aliases remain in code and policy: `normal -> standard`, `medium -> standard`, `release-sensitive -> critical`.
- Unknown risk values fail closed to `critical` instead of silently becoming `standard`.
- Packet creation, gate profile evaluation, and conductor routing now share the same `standard_harness.policy.risk` normalization helper.

## Evidence
- `starter/standard-harness/_harness/schemas/packet.schema.json`
- `starter/standard-harness/_harness/policies/gate-profiles.yaml`
- `starter/standard-harness/_harness/system/standard_harness/policy/gate_profiles.py`
- `starter/standard-harness/_harness/system/standard_harness/policy/risk.py`
- `starter/standard-harness/_harness/system/standard_harness/domain/packets.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor.py`
- `starter/standard-harness/_harness/test/test_pkt12_schema_permission_boundary.py`
- `starter/standard-harness/_harness/test/test_gate_profile_engine.py`
- `starter/standard-harness/_harness/test/test_conductor_routing_loop.py`

## Tests
- `test_packet_schema_uses_canonical_standard_risk_level`
- `test_risk_aliases_and_unknowns_use_shared_runtime_policy`
- `test_unknown_risk_fails_closed_to_critical`
- `test_normal_maps_to_standard`
- `test_release_sensitive_escalates_without_becoming_base_risk`
