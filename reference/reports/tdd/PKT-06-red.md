# PKT-06 TDD RED

Command:

```powershell
python -m unittest _harness.test.test_provider_neutral_orchestration
```

Working directory:

```text
C:\Newface\30 Github\standard-harness-v2\starter\standard-harness
```

Exit code: 1

Expected failure:

```text
ModuleNotFoundError: No module named 'standard_harness.workflow.provider_orchestration'
```

RED rationale: PKT-06 requires provider-neutral orchestration policy, local subscription CLI/manual fallback behavior, output envelope ingestion constraints, and adjudication records. The focused test fails because that orchestration contract is not implemented.
