# PKT-22 TDD RED

Command:
`py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt22_design_projection_contract.py"`

Result: fail as expected
Exit code: 1
Ran at: 2026-06-30T15:14:00+09:00
Failure kind: expected-contract-failure

Output excerpt:
```text
Ran 9 tests in 0.001s

FAILED (failures=1)
AssertionError: 'missing_design_trace_for_ui_packet' not found in set()
```

Interpretation:
- RED proved `PlanningHardeningValidator` did not yet validate PKT-22 design projection and design trace contracts.
- This was an expected contract failure, not an incidental runtime error.
