# PKT-15 Duplicate Suppression Evidence

## Result
Pass.

## Evidence
- `RuntimeFrictionCapture` now accepts `recurrence_key` and `idempotency_scope`.
- Stored registries suppress duplicates by recurrence/idempotency scope.
- In-memory fallback remains compatible.
- Test coverage: `test_validation_aggregator_captures_schema_friction_once`.

## Disposition
Duplicate call-site capture does not inflate repeated-friction counts for the same idempotent diagnostic.
