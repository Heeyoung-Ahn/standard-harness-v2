# PKT-04B RED Evidence

- Packet: `PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING`
- Route: Orchestrator -> Developer
- TDD status: RED captured before implementation and again before review-remediation implementation.

## RED 1: Sensitive Evidence Contamination
- Added a clean-export negative fixture that writes `product/docs/packets/sensitive-evidence.json`.
- Added an assertion that clean-export diagnostics include `sensitive_evidence`.
- Command: `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe _harness\test\test_operating_folder_contract.py`
- Workdir: `starter/standard-harness`
- Expected failure observed: `AssertionError: 'sensitive_evidence' not found in {'generated_validation_report', 'development_packet_state', 'provider_specific_entry_contract', 'local_logs'}`
- Summary: `Ran 10 tests`; `FAILED (failures=1)`.

## RED 2: Independent Review Remediation
- Added fixtures for:
  - `credentials.json` and neutral text containing a token-like secret,
  - starter-relative classification under a parent path containing `secret` and `logs`,
  - installed-runtime tolerance for `_ops/packets`, `_ops/evidence`, and `_ops/active-context`,
  - unmanaged smoke workspace cleanup rejection,
  - stale smoke cleanup ignoring unmanaged directories,
  - preserved smoke workspace pruning to one managed copy.
- Command: `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe _harness\test\test_operating_folder_contract.py`
- Workdir: `starter/standard-harness`
- Expected failures observed before remediation: `Ran 13 tests`; `FAILED (failures=4)`.
- Full-discover remediation check later exposed import/execution parity failures for the new smoke tests before the smoke cleanup module patch was reapplied.
- Final review-remediation RED added root `.harness` residue, preserve-current pruning, and broad secret-content fixtures for `_harness/policies/neutral.yaml`, root Markdown `Authorization: Bearer ...`, and large product docs `github_pat_...` content.
- Expected final remediation failures observed before implementation: `Ran 16 tests`; `FAILED (failures=2)` for generic `.harness` contamination and preserve-current pruning.
- Final classifier false-negative remediation added generated validation report underscore naming, root `logs/output.txt`, quoted JSON Authorization, quoted JSON/YAML `api_key`, and `product/tests` secret-content fixtures after independent review found misses.
- Final security remediation added an oversized scan-eligible text fixture above the content scan cap after independent review found a >2 MiB false negative.

## Disposition
- RED evidence was accepted because it exposed packet-required clean-export contamination and cleanup behavior gaps before implementation and before independent-review remediation.
