# Standard Harness V2.1 Runbook

## Scope

This runbook covers install/initialization, packet work, handoff, testing, review,
closeout, recovery, starter validation, boundaries, and forbidden actions for V2.1.

## Baseline Checks

```powershell
git status --short
```

```powershell
python -m unittest discover -s tests
```

## Validation

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --all --packet-id pkt-001
```

See `docs/manual/standard-harness-v21-development-scenario.md` for the complete product-feature packet journey.

## Release Validation

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --v21-conformance
```

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --release
```

## Starter Validation

```powershell
python _harness\bin\harness_cli.py --json --harness-root . starter-check --root .
```

## Handoff

Use role-specific context packs. Manual handoff output is MANUAL_ONLY evidence until
validated by harness reproduction or trusted CI.

## Forbidden Actions

Product packets must not write `_harness/**`. SECRET evidence must not be registered
or included in handoff context. Wiki updates require validated proposals.
