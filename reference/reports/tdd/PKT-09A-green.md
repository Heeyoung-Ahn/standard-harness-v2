# PKT-09A GREEN Evidence

## Scope
- Packet: `PKT-09A_EXECUTABLE_SKILL_PACKAGES_AND_DUAL_PROVIDER_SKILL_USE`
- Test file: `starter/standard-harness/_harness/test/test_executable_skill_packages.py`

## Commands
```powershell
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest starter\standard-harness\_harness\test\test_executable_skill_packages.py
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest starter\standard-harness\_harness\test\test_executable_skill_packages.py starter\standard-harness\_harness\test\test_skill_routing_operator_ergonomics.py
```

## Observed Result
```text
Ran 4 tests in 0.004s
OK

Ran 11 tests in 0.017s
OK
```

## GREEN Coverage
- Every catalog skill now has a structured `skill-package.v1` descriptor.
- Conductor app surfaces (`codex_app`, `claude_code_app`) and worker surfaces (`codex_cli`, `claude_code_cli`) receive the same provider-neutral package route contract.
- Route output includes package IDs, candidates, skipped rationales, bounded package chain, selected package descriptor slices, required evidence, ledger path, and no-superpowers runtime dependency flags.
- Validator diagnostics cover duplicate packages, missing fields, non-trigger descriptions, provider-specific dependency, and superpowers runtime dependency.

## Remediation GREEN After Independent Review

### Commands
```powershell
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest starter\standard-harness\_harness\test\test_executable_skill_packages.py
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest starter\standard-harness\_harness\test\test_executable_skill_packages.py starter\standard-harness\_harness\test\test_skill_routing_operator_ergonomics.py
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest discover starter\standard-harness\_harness\test
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test .harness\test\*.test.js
```

### Observed Result
```text
Ran 9 tests ... OK
Ran 16 tests ... OK
Ran 95 tests ... OK (skipped=1)
483 root Node tests passed
```

### Remediation Coverage
- Explicit `packageInventory` now separates catalog presence from package-now declaration.
- Descriptor validation now checks schema-required and acceptance-required fields.
- Required evidence kinds are derived from catalog `evidenceType`.
- Router fail-closes on package contract diagnostics before Conductor/worker handoff.
- Route output and ledger entries redact secret-like intent text and keep an intent digest.
- `SkillPackageLedger.append()` writes package-use state to `_ops/evidence/skill-use-ledger.jsonl`.
- No-match blocked route output remains schema-compatible with `requiredSkill: ""`.
- No-match plus package-diagnostics blocked route output remains schema-compatible with `requiredSkill: ""`.
- `triggerKeywords` requiredness is aligned between descriptor validator and `skill-package.schema.json`.
