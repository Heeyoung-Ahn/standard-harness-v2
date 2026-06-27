# Requirement Trace Matrix Guide

## Purpose

Use the requirement trace matrix when a packet needs operator-visible coverage from requirement to packet, implementation file, test, evidence, documentation, reviewer status, security status, and risk disposition.

## Command

```bash
npm run harness:trace-matrix -- --apply --trace-file reference/evidence/fixtures/requirement-trace-matrix.json
```

The command writes:

- `.agents/runtime/requirement-trace-matrix.json`
- `.agents/runtime/REQUIREMENT_TRACE_MATRIX.md`

## Trace Row Fields

Each row should include:

- `requirementId`
- `requirementType` or `validationKind`
- `packetPath`
- `implementationFiles`
- `tests`
- `evidenceManifests`
- `documentation`
- `reviewerProfile`
- `specialistReview` when required
- `securityReview` when required
- `residualRisk`
- `risk` with owner, impact, mitigation, and closeout blocking fields for high or critical risk

## Authority Boundary

The trace matrix is evidence only. It cannot approve implementation, close packets, release, close risks, accept residual risk, or prove product behavior by itself. Product behavior rows and harness validation rows must stay separate.
