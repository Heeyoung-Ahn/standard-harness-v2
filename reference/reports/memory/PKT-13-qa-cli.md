# PKT-13 QA CLI Evidence

- Work item: `PKT-13_OPERATING_INTELLIGENCE_AND_QA`
- Command: `operating-qa`
- Status: pass

## Contract
Copied-starter invocation:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . operating-qa --question "<question>"
```

The JSON payload includes `operatingQa` with at least:
`schemaVersion`, `question`, `status`, `answer`, `whatHappened`, `why`, `evidenceRefs`,
`risk`, `nextAction`, `sourceRefs`, `diagnostic_ids`, `omittedSourceDiagnostics`,
`redactionDisposition`, `freshnessStatus`, `readModel`, and `authorityBoundary`.

## Approval Boundary
`operating-qa` adds `approval_authority_refused` when a question asks it to approve,
close, release, accept residual risk, or grant Ready For Code. The answer contract states
that it is a read model and cannot approve human gates.

## Verification
- `test_operating_qa_cli_returns_human_owner_answer_contract_without_approval_authority`
  passed.
- Clean starter smoke exited `0` with JSON `status: ok`; the answer correctly failed
  closed with `no_source:*` diagnostics because seed folders contain no real evidence.
