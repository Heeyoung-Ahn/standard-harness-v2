# PKT-12 Root Regression Evidence

- Work item: `PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP`
- Status: pass

## Command
`npm.cmd test`

## Result
- Exit code: `0`
- Node runtime: `24.13.1`
- Node test summary: `483` tests, `483` pass, `0` fail, `0` skipped.

## Coverage Notes
- Includes root harness validation, packet preflight, transition, generated-state, starter sync, skill payload, route, evidence, and validator boundary tests.
- The command also ran `harness:skills-check --dry-run` during pretest and completed successfully.
