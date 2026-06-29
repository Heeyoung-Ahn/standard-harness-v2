# PKT-12 Permission Boundary Evidence

- Work item: `PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP`
- Status: pass

## Implemented Policy
- `harness-developer` was removed from copied-starter `agent-permissions.yaml`.
- The copied-starter harness maintenance role is `harness-maintainer`.
- `starter` logical zone was removed from copied-starter `zones.yaml`.
- `starter/standard-harness/**` is no longer granted by copied-starter permission or zone policy.
- Copied-starter skill catalog write scopes were remapped away from root development paths to copied-starter operating/product paths.
- Skill-router output no longer treats catalog write scopes as effective authorization; catalog scopes are emitted only as `declaredSkillWriteZones` with a role/packet/Human-boundary intersection requirement.

## Evidence
- `starter/standard-harness/_harness/policies/agent-permissions.yaml`
- `starter/standard-harness/_harness/policies/zones.yaml`
- `starter/standard-harness/_harness/catalog/skill-catalog.yaml`
- `starter/standard-harness/_harness/system/standard_harness/skills/router.py`
- `starter/standard-harness/_harness/system/standard_harness/skills/packages.py`
- `starter/standard-harness/_harness/test/test_pkt12_schema_permission_boundary.py`

## Tests
- `test_copied_starter_policy_has_no_root_starter_zone_or_role_leak`
- `test_contamination_checker_rejects_nested_root_starter_payload_leak`
- `test_executable_skill_packages.py`
- `test_skill_routing_operator_ergonomics.py`
- `test_skill_route_does_not_grant_catalog_write_zones_as_effective_permission`

## Scan Evidence
- `rg -n "harness-developer|starter/standard-harness|\.agents/artifacts|reference/packets|reference/reports|reference/manuals|reference/planning" starter\standard-harness\_harness\catalog\skill-catalog.yaml starter\standard-harness\_harness\policies` returned no matches.

## Security Disposition
- No new secrets, network surfaces, external commands, or provider-specific runtime dependencies were added.
- The change narrows copied-starter write permissions by removing root-development roles, root repository path grants, and root evidence/planning path grants from the copied-starter permission surfaces.
- Route output is non-authorizing by construction: selected skill packages can describe declared write-zone hints, but cannot grant `_harness/**` or any other effective write scope without downstream role, packet-zone, and Human approval checks.
