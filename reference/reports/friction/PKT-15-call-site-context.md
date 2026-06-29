# PKT-15 Context Friction Call Site Evidence

## Result
Pass.

## Evidence
- `context/budget.py` captures token-budget friction for budget creation, lookup, and token estimate paths.
- `context/packs.py` captures context-pack omission and sensitive-source friction.
- Test coverage: `test_review_pm_closeout_context_and_authority_call_sites_capture_friction`.

## Boundary
Context friction is advisory evidence unless the active role or packet makes a budget gate blocking.
