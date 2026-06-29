# PKT-15 Operating QA Evidence

## Human Owner Question Model
The implementation can answer:
- What happened: runtime friction is captured from validation, review, PM, closeout, context, authority, and conductor-worker paths.
- Why it happened: friction includes category, source path, recurrence key, idempotency scope, and evidence references.
- What evidence exists: repeated friction can be traced into proposal, candidate, dry-run, smoke, security, and review reports.
- What is next: promotion candidates stop at approval-needed and require Human/trusted-harness approval.

## Queryable Operating Intelligence
- Validation/review/PM/closeout/context/authority call sites now feed the same friction capture model.
- Repeated friction promotes into evidence-linked proposals and starter-promotion candidates.
- Candidate evidence includes dry-run and copied-starter smoke results.

## Boundary
This is an operating-intelligence query layer for evidence and next-action routing. It is not an approval engine.
