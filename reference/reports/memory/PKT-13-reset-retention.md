# PKT-13 Reset And Retention Evidence

- Work item: `PKT-13_OPERATING_INTELLIGENCE_AND_QA`
- Status: pass

## Implemented Policy
The long-memory source index now reports:

- `resetCommand: ops-reset`
- `resetCommandImplemented: true`
- resettable read models under `_ops/**`, including evidence, packets, reviews, wiki,
  PMO, friction, and active-context records
- preserved paths: `_harness/**`, `product/**`, and `reference/**` retained evidence
  references when present in the root development repository
- `evidenceRetentionBypassed: false`

## Verification
`test_reset_policy_matches_ops_reset_and_fails_closed_after_reset_until_regeneration`
passed:

- before reset, the index reported implemented `ops-reset` policy;
- `OperatingFolderInitializer.reset_ops()` removed `_ops` records;
- product closeout docs remained present;
- `_ops/evidence/PKT-13/evidence-index.json` was removed;
- post-reset `operating-qa` behavior failed closed with `no_source:*` diagnostics until
  sources are regenerated.

`test_retained_reference_evidence_can_be_cited_after_ops_reset_and_regeneration` passed:

- a retained `reference/reports/validation/*-evidence-index.json` record survived
  `ops-reset`;
- regenerated `_ops` source records could cite the retained reference evidence;
- reset policy reports `reference/**` as a preserved retained-evidence path.
