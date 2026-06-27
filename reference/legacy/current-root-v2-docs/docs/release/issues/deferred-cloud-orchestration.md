# Deferred: Cloud orchestration

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement cloud orchestration for remote work execution while preserving packet authority, evidence provenance, and state synchronization.

## MVP Boundary

Cloud execution must not bypass local state, approval records, evidence requirements, or gate enforcement.

## Acceptance Criteria

- Remote work has explicit packet id, actor identity, permission roots, and evidence output.
- State synchronization is event-based.
- Network or cloud failures produce structured diagnostics.
- Local audit remains possible without cloud dashboard access.
