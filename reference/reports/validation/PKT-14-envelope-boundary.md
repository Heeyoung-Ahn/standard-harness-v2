# PKT-14 Envelope Boundary Evidence

- Work item: `PKT-14_CONDUCTOR_WORKER_E2E`
- Scope: adapter envelope containment and rejection behavior
- Status: pass

## Commands
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"`
  - Result: pass, 11 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_provider_neutral_orchestration.py"`
  - Result: pass, 14 tests, 1 skipped.

## Covered Boundaries
- Fixture envelopes include trusted permission roots, current input snapshot hash,
  artifact manifest path containment, evidence provenance, timeout/cancel metadata, and
  `truthClaim=false`.
- Existing provider-neutral orchestration regression rejects missing trusted roots,
  stale input snapshots, direct mutation, missing provenance, mock success, path escape,
  symlink escape, credential material, and unsafe command descriptors.
- Captured real-smoke envelopes are only written from hash-verified `_ops/capture/**`
  artifacts after role/provider/adapter record validation and sensitive-material
  screening.
