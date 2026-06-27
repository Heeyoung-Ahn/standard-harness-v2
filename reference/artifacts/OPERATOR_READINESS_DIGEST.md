# Operator Readiness Digest Guide

## Purpose

Use the operator readiness digest when an operator needs one bounded report that points to the next safe action across status, packet preflight, trace matrix, directional pilot, security review, browser evidence, context budget, guard overlays, and open risk metadata.

## Command

```bash
npm run harness:operator-digest -- --apply --digest-file reference/evidence/fixtures/operator-readiness-digest.json
```

The command writes:

- `.agents/runtime/operator-readiness-digest.json`
- `.agents/runtime/OPERATOR_READINESS_DIGEST.md`

## Surface Fields

Each supplied surface can include:

- `status` or `completionStatus`
- `sourcePath`
- `validationKind`
- `nextAction`
- risk fields under `risk.risks`
- guard overlays under `guard.overlays`

## Authority Boundary

The digest is evidence only. It cannot approve implementation, close packets, release, close risks, accept residual risk, or prove product behavior by itself. Product verification remains separate from harness structural validation.
