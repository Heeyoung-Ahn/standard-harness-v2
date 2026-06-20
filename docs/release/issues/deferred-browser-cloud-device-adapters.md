# Deferred: Browser cloud and device adapters

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement adapters that can produce browser functional evidence, cloud execution evidence, and device evidence with explicit provenance and failure modes.

## MVP Boundary

The MVP does not equate screenshots, logs, or mock output with production evidence. This issue must preserve that distinction.

## Acceptance Criteria

- Browser adapter distinguishes rendering evidence from functional evidence.
- Cloud adapter records project, region, identity, command, and artifact provenance.
- Device adapter records target identity, environment fingerprint, command, and result.
- Adapters cannot mutate canonical state directly.
