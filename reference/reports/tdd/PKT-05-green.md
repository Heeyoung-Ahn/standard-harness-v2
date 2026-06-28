# PKT-05 TDD GREEN Evidence

- Command: `python -m unittest _harness.test.test_long_memory_question_answering`
- Cwd: `starter/standard-harness`
- Exit code: 0

```text
........
----------------------------------------------------------------------
Ran 8 tests in 0.142s

OK
```

## Remediation GREEN Evidence

- Command: `python -m unittest _harness.test.test_independent_review_governance`
- Cwd: `starter/standard-harness`
- Exit code: 0

```text
......
----------------------------------------------------------------------
Ran 6 tests in 0.012s

OK
```

- Command: `python -m unittest _harness.test.test_pkt05_security_and_transition_gates`
- Cwd: `starter/standard-harness`
- Exit code: 0

```text
...
----------------------------------------------------------------------
Ran 3 tests in 0.255s

OK
```

- Command: `python -m unittest discover _harness\test`
- Cwd: `starter/standard-harness`
- Exit code: 0

```text
.............................................
----------------------------------------------------------------------
Ran 45 tests in 7.627s

OK
```

- Command: `python _harness\bin\harness_cli.py --json --harness-root . validate --starter --installed-runtime`
- Cwd: `starter/standard-harness`
- Exit code: 0

```json
{"diagnostics": [], "status": "ok", "validation": {"starter": {"cleanExportProof": false, "runtimeGeneratedStateTolerated": true, "validationMode": "installed-runtime"}}}
```

- Command: `npm.cmd test`
- Cwd: repository root
- Exit code: 0

```text
tests 471
pass 471
fail 0
```
