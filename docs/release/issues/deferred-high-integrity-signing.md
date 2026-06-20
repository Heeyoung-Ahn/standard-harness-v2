# Deferred: High-integrity signing

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement high-integrity signing and tamper-evidence for events, approvals, evidence manifests, gate results, closeouts, and projections.

## MVP Boundary

Existing SHA-256 hashes remain useful for MVP integrity but are not presented as enterprise-grade signatures.

## Acceptance Criteria

- Signing keys and identity metadata are managed explicitly.
- Signed records include event payload, actor identity, timestamp, source watermark, and signature metadata.
- Verification detects tampering.
- Retention and export behavior are documented.
