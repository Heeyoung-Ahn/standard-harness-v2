# PKT-15 Root Regression

## Result
Pass.

## Commands
- `python -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"`: pass, 138 tests, 1 skipped.
- `node --test .harness/test/promote-starter.test.js .harness/test/init-project.test.js .harness/test/dev05-tooling.test.js .harness/test/template-health-docs.test.js .harness/test/pkt02-gate-profile-engine.test.js .harness/test/pkt04a-pmo-surface-reviewer-lens.test.js .harness/test/v2-3-lean-manuals.test.js`: pass, 130 tests.
- `npm.cmd test`: pass, 483 tests.
- `npm.cmd run harness:validate`: pass.
- `npm.cmd run harness:validation-report`: pass.

## Disposition
Root regression supports PKT-15 closeout. SQLite experimental warnings are known acceptable warnings and did not affect pass/fail.
