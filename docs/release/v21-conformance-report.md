# Standard Harness V2.1 Conformance Report

V2.1 conformance is evaluated by `v21-conformance-gate` through:

```powershell
python tools\harness_cli.py --json validate --v21-conformance
```

```powershell
python tools\harness_cli.py --json validate --release
```

## Evidence Scope

- XP commits: XP-00 through XP-10 plus XP-07A, XP-09A, XP-ProcessA, XP-PackagingA, and XP-10A.
- HR coverage: `_harness/requirements/hr-coverage-matrix.yaml` and `_harness/requirements/traceability-matrix.yaml`.
- Validator catalog: `_harness/policies/validator-catalog.yaml` with importable implementations, negative tests, release reachability, and gate metadata.
- Gate metadata: HR-191 gate result metadata is required for release-blocking validators.
- Focused tests: XP-10A conformance, release archive, validator catalog, and release CLI contract tests.
- Full regression: `python -m unittest discover -s tests`.
- Challenge Review evidence: `docs/reviews/v21/**` original XP and hardening XP reports.
- Compound metrics: `_ops/metrics/hr200-success-metrics.json` with `sourceWatermark`.
- Executable release probes: `_ops/evidence/release/v21-executable-release-gate.json` and `_harness/policies/release-behavior-probes.yaml`.
- Final closeout evidence: `_ops/evidence/release/v21-final-closeout.json` verifies release gate, review governance, Wiki knowledge, HR-200 metrics, security boundary, executable release probes, full regression, and clean generated-state hygiene.
- Packaging hygiene: `tools/release_archive.py` builds from `git ls-files`; generated state, runtime state, caches, bytecode, virtualenvs, and temp files are excluded.

## Migration And Compatibility

`validate --all` remains the development/general validation path. Release-specific checks are exposed through `validate --v21-conformance` and `validate --release`, so normal packet development is not converted into a release gate by default.

## Residual Risks

No v1 payload, `.agents`, `.harness`, generated state, plugin, runtime state, or starter payload content is promoted by this report. Release readiness depends on rerunning the focused and full regression commands on the target release branch.

## Release Decision

Release is blocked if V2.1 conformance reports missing validator catalog entries, partial required HR coverage, missing challenge evidence, missing HR-191 gate metadata, missing or incomplete HR-200 metrics, missing executable release probes, missing or stale final closeout evidence, or missing required release documentation artifacts.
