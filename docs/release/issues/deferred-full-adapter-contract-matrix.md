# Deferred: Full adapter contract matrix

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Define and test a complete adapter contract matrix across execution modes, evidence modes, permission roots, artifact export behavior, and failure classifications.

## MVP Boundary

The MVP rejects direct state mutation and mock-success production evidence. This issue expands coverage without weakening those boundaries.

## Acceptance Criteria

- Matrix includes success, fail, blocked, stale, substitute, not applicable, partial output, timeout, permission denied, and malformed envelope cases.
- Tests verify adapter outputs request events rather than writing state directly.
- Tests verify mock adapters cannot satisfy production evidence gates.
