# PKT-15 Validation Friction Call Site Evidence

## Result
Pass.

## Evidence
- `starter/standard-harness/_harness/system/standard_harness/validation/aggregator.py` accepts an optional `RuntimeFrictionCapture`.
- `validate_all` and `validate_packet` capture validation diagnostics as runtime friction.
- Invalid packet schema paths capture friction before `PacketService.get_packet` raises.
- Test coverage: `test_validation_aggregator_captures_schema_friction_once`.

## Boundary
The call site records evidence-backed friction only; it does not approve validation results or suppress failures.
