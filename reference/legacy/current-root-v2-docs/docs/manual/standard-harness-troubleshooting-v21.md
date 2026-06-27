# Standard Harness V2.1 Troubleshooting

## Baseline Failure

Run status and regression first:

```powershell
git status --short
```

```powershell
python -m unittest discover -s tests
```

If baseline tests fail before an XP starts, stop and repair or ask for approval before
mixing baseline repair with XP work.

## Metadata Failure

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --all --packet-id pkt-001
```

Check `_harness/contracts/traceability-matrix.yaml` and
`_harness/contracts/hr-coverage-matrix.yaml` for stale XP or HR ownership.

## Starter Boundary Failure

```powershell
python _harness\bin\harness_cli.py --json --harness-root . starter-check --root .
```

Remove local state, evidence, secrets, logs, generated reports, and product-specific
artifacts from the starter payload.

