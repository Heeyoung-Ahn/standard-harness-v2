# PKT-15 Proposal Loop Evidence

## Result
Pass.

## Evidence
- `RepeatedFrictionPromotionLoop` promotes recurring, proposal-eligible, evidence-backed friction groups.
- The loop creates an improvement proposal, review entries, and a starter-promotion candidate.
- Candidate state ends at `approval-needed`.
- `can_approve_promotion` remains `False`.
- Test coverage: `test_repeated_friction_loop_promotes_to_approval_needed_candidate_only`.

## Boundary
The compound loop prepares candidate evidence only. It does not approve starter promotion.
