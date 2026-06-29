# PKT-10 RED Evidence

- Packet: `PKT-10_COMPOUND_FEEDBACK_AND_STARTER_PROMOTION`
- Command: `PYTHONDONTWRITEBYTECODE=1 py -3 -m unittest starter\standard-harness\_harness\test\test_compound_feedback_promotion.py`
- Exit code: `1`
- Result: expected RED

## Failure Excerpt

```text
ImportError: cannot import name 'MINIMUM_CAPTURE_SURFACES' from
'standard_harness.self_improvement.friction'

FAILED (errors=1)
```

## Interpretation

The starter did not yet expose the PKT-10 compound feedback contract for minimum
capture surfaces, seed friction types, proposal lifecycle, or promotion-candidate
safety gates.
