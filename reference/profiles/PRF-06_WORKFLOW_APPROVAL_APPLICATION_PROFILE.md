# PRF-06 Workflow Approval Application Profile

## Purpose
Use this optional profile for internal systems with explicit workflow states, approvals, role permissions, audit events, exception handling, reopen/rollback rules, or review gates.

## Approval Rule
- Activate this profile explicitly before workflow-heavy packets claim `Ready For Code`.
- Workflow state, approval matrix, permission matrix, and audit event evidence must be available before implementation.
- Project-specific approver names, department paths, thresholds, screen labels, and business policies stay in project packets.

## 1. Activation Trigger
- Records move through lifecycle states.
- Users approve, reject, return, reopen, cancel, or lock records.
- Role/permission, audit, and exception handling are implementation-critical.

## 2. Required Design Evidence
- State machine artifact:
- Approval rule matrix:
- Role / permission matrix:
- Audit event spec:
- Exception / rollback / reopen rule:
- Lock/freeze rule:
- Notification/escalation boundary:

## 3. Safety Rules
- No state transition should be implemented without source, actor, precondition, side effect, and audit event evidence.
- Approval bypass, forced reopen, and rollback paths require explicit project-packet acceptance.
- Core does not define one universal approval chain.

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- State machine artifact:
- Approval rule matrix:
- Role / permission matrix:
- Audit event spec:
- Exception / rollback / reopen rule:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Cite this profile in `Active profile references`.
- Cite concrete workflow/approval/audit project artifacts from the packet.
- Do not approve `Ready For Code` when any required matrix or state-machine source is missing.
