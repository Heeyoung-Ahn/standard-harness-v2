# PKT-12 Validator Rejection Evidence

- Work item: `PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP`
- Status: pass

## Expected Negative Diagnostics
- `risk_taxonomy_standard_missing`: covered by `test_packet_schema_uses_canonical_standard_risk_level`; the test would fail if `standard` were missing from `riskLevel`.
- `risk_taxonomy_medium_canonical_leak`: covered by the same test; it asserts `medium` is not a canonical schema enum value.
- `schema_identity_v21_product_label`: covered by `test_public_schema_identity_does_not_expose_v21_product_labels`; it scans every affected schema `$id` and title.
- `copied_starter_root_path_leak`: covered by `test_copied_starter_policy_has_no_root_starter_zone_or_role_leak` and `test_contamination_checker_rejects_nested_root_starter_payload_leak`.
- `copied_starter_root_role_leak`: covered by `test_copied_starter_policy_has_no_root_starter_zone_or_role_leak`.
- `risk_taxonomy_unknown_fail_open`: covered by `test_unknown_risk_fails_closed_to_critical`, the conductor routing test, and the PKT-12 packet service normalization test.
- `copied_starter_skill_catalog_root_write_scope`: covered by the root-path string scan and the skill routing/operator ergonomics tests.
- `copied_starter_skill_route_overbroad_write_grant`: covered by `test_skill_route_does_not_grant_catalog_write_zones_as_effective_permission`; route output and provider-worker package descriptors expose no effective `allowedWriteZones` from catalog hints.
- `copied_starter_forbidden_payload_file`: represented by the clean-export contamination suite in `test_operating_folder_contract.py`, including `.harness`, root `AGENTS.md`, generated validation reports, local DB/state, caches, logs, secrets, real `_ops` packet/evidence/history, real `_ops/wiki/**`, and real `_ops/wiki-proposals/**`.

## Scan Evidence
- `rg -n "standard-harness-v2\.1|Standard Harness V2\.1|V2\.1" starter\standard-harness\_harness\schemas` returned no matches.
- `rg -n "harness-developer|starter/standard-harness" starter\standard-harness\_harness\policies starter\standard-harness\_harness\test\test_pkt12_schema_permission_boundary.py` returned matches only in PKT-12 negative test fixtures/assertions, not in policy payload.
- `rg -n "harness-developer|starter/standard-harness|\.agents/artifacts|reference/packets|reference/reports|reference/manuals|reference/planning" starter\standard-harness\_harness\catalog\skill-catalog.yaml starter\standard-harness\_harness\policies` returned no matches.
- `StarterContaminationChecker().check_root(starter_root, validation_mode="clean-export")` returned `diagnostic_count: 0`.
- Starter source-clean scan returned `cache_dirs: 0` and `pyc_files: 0`.
