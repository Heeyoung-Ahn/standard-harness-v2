# PKT-12 Targeted Test Evidence

- Work item: `PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP`
- Status: pass

## Commands
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt12_schema_permission_boundary.py"` exited `0`; `5` tests passed.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_gate_profile_engine.py"` exited `0`; `6` tests passed.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_conductor_routing_loop.py"` exited `0`; `10` tests passed.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_operating_folder_contract.py"` exited `0`; `16` tests passed.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_executable_skill_packages.py"` exited `0`; `10` tests passed.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_skill_routing_operator_ergonomics.py"` exited `0`; `7` tests passed.

## Behaviors Proved
- `packet.schema.json` declares canonical risk levels `low`, `standard`, `high`, `critical`.
- `medium` and `normal` still normalize to `standard`, while unknown risk values fail closed to `critical`.
- `PacketService`, `GateProfilePolicy`, and workflow conductor risk handling use the same canonical normalization helper.
- Starter schema `$id` and title fields no longer expose product-facing `v2.1` labels.
- Copied-starter permissions no longer expose `harness-developer`, `starter` logical zone, or `starter/standard-harness/**` grants.
- Copied-starter skill catalog write scopes no longer expose root development paths such as `.agents/artifacts/**`, `reference/packets/**`, or `reference/reports/**`.
- Skill routing preserves catalog write zones only as non-authorizing declared hints; route and worker-brief effective `allowedWriteZones` are empty until intersected by role, packet-zone, and Human approval boundaries.
- Contamination checks reject nested root starter payload leakage and real `_ops/wiki/**` / `_ops/wiki-proposals/**` state.
