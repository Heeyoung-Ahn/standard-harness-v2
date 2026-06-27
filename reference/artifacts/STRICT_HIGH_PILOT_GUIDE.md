# Strict/High Pilot Guide

## Purpose

Use this guide when a sandbox or pilot exercises strict/high behavior. The goal is to collect clear evidence without weakening production gates.

## When Strict/High Is Expected

Use strict/high when the work touches approval, authorization, security, data migration, destructive commands, release/deploy, reusable harness runtime, state machine behavior, or other high-blast-radius surfaces.

This friction is intentional. Do not downgrade a packet only to reduce prompts, tests, or review.

## Minimal Evidence Bundle

| Evidence | Required content |
|---|---|
| Packet approval | Packet ID, scope, lane/risk, approval evidence, source refs |
| Product tests | Command, exit status, relevant output summary |
| Harness validation | `harness:validate`, `harness:validation-report`, `harness:status` as applicable |
| Security review | Secret/dependency/untrusted/guard results when the surface applies |
| Browser evidence | State from `passed`, `failed`, `not_required`, `blocked_environment`, `not_run_agent_error` |
| HTTP evidence | Separate from Browser evidence |
| Closeout | Tester/Reviewer/Planner handoff or explicit no-change investigation result |

## Codex Browser Smoke Checklist

1. Start or identify the local server.
2. Initialize the Codex Browser plugin through the documented in-app Browser workflow.
3. Open the local target URL.
4. Exercise the packet's required UI flow.
5. Capture screenshot or browser artifact path.
6. Record Browser smoke state separately from HTTP smoke.

If the agent fails step 2, record `not_run_agent_error`. If the environment blocks browser execution, record `blocked_environment`.

## Pilot Confidence Boundary

Pilot evidence can prove workflow feasibility, evidence shape, and harness friction. It does not prove production readiness unless the active packet acceptance criteria, risk gates, security review, and product-specific acceptance are also satisfied.
