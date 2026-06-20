# Deferred: Semantic diff automation

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement semantic change detection that identifies when requirement meaning changes and invalidates affected claims, evidence, gates, projections, and closeout assumptions.

## MVP Boundary

The MVP uses explicit event watermarks and manual registry changes. This issue must preserve the rule that stale or unverified evidence cannot become supported completion.

## Acceptance Criteria

- Semantic diff results classify changed, unchanged, moved, removed, and ambiguous requirement content.
- Impacted packet ids, requirement ids, acceptance criterion ids, evidence ids, and projection ids are listed.
- Ambiguous diffs produce diagnostics requiring human review.
- Diff output is not canonical state until promoted by an event.
