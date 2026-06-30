# PKT-22 TDD GREEN

Focused command:
`py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt22_design_projection_contract.py"`

Result: pass
Exit code: 0
Ran at: 2026-06-30T15:15:00+09:00

Output excerpt:
```text
Ran 13 tests in 0.002s

OK
```

Additional regression evidence:
```text
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt16_additional_hardening_productization.py"
Ran 11 tests in 3.784s
OK

py -3 -B -m unittest discover -s starter\standard-harness\_harness\test
Ran 176 tests in 19.793s
OK (skipped=1)
```

Remediation coverage:
- Nested design/handoff/mockup/browser text authority overclaims, prompt-like text, and sensitive text are recursively flagged.
- `bypass packet gate` and `close acceptance` authority claims are rejected.
- Plural natural-language authority overclaims such as `requirements are approved`, `bypasses packets`, `approval gates are bypassed`, and `creates requirements` are rejected.
- PKT-23 locked-module fields such as `doNotChangeRules` and `visualReference` are rejected as out of PKT-22 scope.
- PlanningHardeningValidator fails UI/design packets that omit design fields entirely and allows non-UI packets without design fields.

Refactor verified: not-needed.
Behavior-level test: yes.
Test-only production hook: no.
