# PKT-08 TDD GREEN Evidence

- Packet: `PKT-08_RISK_ADAPTIVE_FAST_PATH_AND_EVIDENCE_VALIDATION`
- Command: `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --test .\.harness\test\packet-preflight.test.js`
- Result: pass.
- Summary: 41 tests passed, 0 failed.

## New behavior covered
- Low-risk/docs-only fast path closeout can pass with one independent behavior-verification lens plus explicit N/A evidence for omitted lenses.
- Low-risk/docs-only closeout cannot pass when all independent review lenses are N/A.
- Closeout lens evidence that only proves file existence is rejected as insufficient behavior evidence.
- Low-risk fast path closeout fails closed when actual changed-file evidence is absent.
- Runtime, approval, and security policy file changes cannot be hidden behind docs-only/low-risk fast path metadata or caller-supplied changed-file lists.
- Starter policy changes cannot be hidden behind docs-only/low-risk fast path metadata.
- Requested fast path is ignored when effective route classification is promoted to `packet-path`.
- Passing review-lens evidence must be repository-bound and include structured behavior verification.
- Repository-bound evidence and packet reads reject sibling path-prefix escapes.
- Stale, untrusted, failed, and unresolved review-lens evidence is rejected.

## Regression coverage
- Strict four-lens closeout evidence still passes for the existing complete evidence fixture.
- Missing independent review lens evidence still blocks closeout.
- Starter `test_independent_review_governance` passed 10 tests after the root/starter parity remediation, including trusted git diff precedence over supplied changed-file metadata and fail-closed behavior when git inspection errors.
