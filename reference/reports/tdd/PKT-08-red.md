# PKT-08 TDD RED Evidence

- Packet: `PKT-08_RISK_ADAPTIVE_FAST_PATH_AND_EVIDENCE_VALIDATION`
- Command: `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --test .\.harness\test\packet-preflight.test.js`
- Expected RED: newly added risk-adaptive closeout tests fail before implementation.
- Result: failed as expected.

## Failing checks
- `packet-preflight allows low-risk fast path closeout with one independent behavior lens and N/A evidence`
  - Expected `independentReviewLenses.policy` to be `risk-adaptive-fast-path`.
  - Actual pre-implementation value was missing / then `strict-four-lens`.
- `packet-preflight blocks low-risk fast path closeout when all review lenses are N/A`
  - Existing implementation required independent agents for every N/A lens instead of enforcing the new minimum-one-passing-lens rule.
- `packet-preflight blocks closeout lens evidence that only proves file existence`
  - Existing implementation accepted existence-only evidence paths without inspecting behavior verification quality.

## Fixture correction note
The first RED run also exposed a missing test policy fixture for packet types. The fixture was corrected so the final RED failure represented the intended implementation gap, not missing test setup.
