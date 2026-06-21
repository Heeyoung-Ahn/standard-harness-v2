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
python tools/harness_cli.py --json --harness-root C:\tmp\standard-harness-demo validate --all --packet-id pkt-001
```

Check `_harness/requirements/traceability-matrix.yaml` and
`_harness/requirements/hr-coverage-matrix.yaml` for stale XP or HR ownership.

## Starter Boundary Failure

```powershell
python tools\harness_cli.py --json --harness-root C:\tmp\standard-harness-sample starter-check --root C:\tmp\standard-harness-sample
```

Remove local state, evidence, secrets, logs, generated reports, and product-specific
artifacts from the starter payload.
