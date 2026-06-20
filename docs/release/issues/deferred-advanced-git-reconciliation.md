# Deferred: Advanced Git reconciliation

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement advanced Git reconciliation for branches, worktrees, moved artifacts, deleted artifacts, unregistered changes, event import/export, and external-tool drift.

## MVP Boundary

No automatic merge, rebase, cherry-pick, or multi-branch reconciliation is part of MVP. This issue must preserve packet ownership and evidence traceability.

## Acceptance Criteria

- Reconciliation detects unregistered changes in packet-owned zones.
- Moved and deleted artifacts are represented by events.
- Branch or worktree identity is captured in evidence and diagnostics.
- Automatic repair requires explicit approval when it changes source files.
