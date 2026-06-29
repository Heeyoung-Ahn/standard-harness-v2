# PKT-15 Candidate Lifecycle Evidence

## Result
Pass.

## Lifecycle
1. Runtime call sites capture evidence-backed friction.
2. Repeated friction is grouped by recurrence key.
3. Proposal-eligible recurrence creates an improvement proposal.
4. Proposal creates a starter-promotion candidate.
5. Candidate stops at `approval-needed`.

## Evidence
- Test: `test_repeated_friction_loop_promotes_to_approval_needed_candidate_only`.
- Code: `self_improvement/proposals.py`, `self_improvement/starter_promotion.py`.

## Authority
No candidate path grants release, publish, product verification, closeout, risk closure, or residual-risk acceptance.
