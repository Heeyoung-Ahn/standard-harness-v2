# Deferred: Automated SSOT extraction

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement automated extraction of requirements from approved SSOT documents while preserving stable requirement ids, source document references, source ranges, parser confidence, and reviewability.

## MVP Boundary

The MVP supports manual requirement registration. This issue must not weaken the manual registry or allow unverified extraction output to become authoritative completion state.

## Acceptance Criteria

- Extracted requirements include stable ids, version, source document, source range, status, classification, risk classification, acceptance criteria, and completion classification.
- Extraction output is reviewable before promotion.
- Promotion appends events rather than mutating canonical tables directly.
- Low-confidence parser output produces structured diagnostics.
