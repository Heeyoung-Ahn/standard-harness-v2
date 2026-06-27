# Receiving Code Review

Use this skill when review feedback arrives and must be evaluated before implementation or closeout.

## Use When
- A reviewer, subagent, Tester, or user provides findings or requested changes.
- Findings appear unclear, conflicting, overbroad, or possibly incorrect.
- Remediation must be scoped before code edits.

## Do Not Use When
- Feedback is not actionable and no decision is needed.
- The review asks for scope outside the approved packet without new approval.
- The response would silently accept destructive, deployment, approval, or generated-state changes.

## Workflow
1. Restate each finding in concrete terms.
2. Classify severity: critical, important, minor, question, or not-a-bug.
3. Check the finding against approved scope, source artifacts, and observed behavior.
4. Accept valid findings, rebut incorrect findings with evidence, and defer out-of-scope items.
5. Implement only approved, in-scope remediation.
6. Re-run the focused checks affected by the remediation.

## Evidence To Produce
- Finding disposition table.
- Scope and authority decision for each finding.
- Remediation summary or rebuttal evidence.
- Verification after remediation.

## Authority Boundary
This skill evaluates review feedback. It must not blindly implement out-of-scope findings, suppress valid critical findings, or treat a reviewer suggestion as approval to expand scope.
