# V2.2 Hardening Guide

## Use this guide when

- a packet changes behavior-bearing code and TDD evidence is required;
- a packet touches auth, secrets, CI/CD, dependencies, approval workflow, or high/critical risk scope;
- a packet uses parallel execution;
- a packet reaches closeout and should create durable compound learning;
- a review must be audit-replayable.

## Packet closeout minimum evidence

| Evidence surface | Required for | v2.2 hardening rule |
|---|---|---|
| TDD Evidence Contract | Behavior-bearing code | RED non-zero, expected failure kind, GREEN exit 0, RED before GREEN, artifacts exist |
| CSO Security Review | Security/high-risk work | Mandatory phases, finding quality, confidence threshold, redaction, accepted-risk approval |
| Parallel Execution Plan | Parallel batch work | Baseline, dependency graph, worktree if applicable, actual files, merge order, post-merge test, cleanup |
| Review Evidence Pipeline | Independent review closeout | Scope artifact, no-mutation mode, findings schema, fingerprint dedupe |
| Compound Learning Closeout | Closeout learning | v2.2 frontmatter, source packet path, file refs, verification, stale/overlap scan |

## Recommended command sequence

```bash
npm run harness:packet-preflight -- --packet reference/packets/PKT-EXAMPLE.md
npm run harness:evidence
npm run harness:reviewer-profile -- --work-item WI-EXAMPLE --apply
npm run harness:review-scope
npm run harness:review-findings
npm run harness:learning-staleness -- --apply
npm run harness:automation-candidates -- --apply
npm run harness:dashboard -- --apply
```

## Boundary

v2.2 validates evidence artifacts and packet contracts. It does not automatically run product tests, create worktrees, merge branches, perform full static security analysis, or rewrite review findings. Those actions remain agent/human work; the harness checks that their evidence is present, bound, and replayable.
