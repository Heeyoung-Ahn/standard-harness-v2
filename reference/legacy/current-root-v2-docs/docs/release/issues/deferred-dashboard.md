# Deferred: Dashboard

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Build a dashboard that reads canonical state and generated projections without becoming canonical state itself.

## MVP Boundary

The dashboard must not replace the SQLite state kernel, append-only events, or validation CLI.

## Acceptance Criteria

- Dashboard clearly shows packet lifecycle, approval state, evidence status, claim support, gate status, closeout decision, diagnostics, and projection freshness.
- Dashboard reads state through approved read APIs or projections.
- Dashboard cannot mark claims supported or gates passed by UI text alone.
