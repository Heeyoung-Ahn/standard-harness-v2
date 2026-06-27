# Subagent-Driven Development

Use this skill when independent subtasks can be delegated safely and the user has explicitly requested subagents or an approved packet contains explicit subagent authorization traceable to user approval.

## Use When
- The user explicitly asks for subagents, delegated agents, parallel agents, or multi-agent review.
- An approved packet explicitly authorizes subagent use and the authorization traces to user approval.
- Tasks are independent, bounded, and can be assigned without shared write conflicts.

## Do Not Use When
- The user did not request subagents and the packet does not explicitly authorize them.
- The next step is on the critical path and should be done locally.
- Subtasks would edit the same files, require hidden session context, or expand scope.
- The agent output would be treated as approval, Tester evidence, or Reviewer closeout without the required owner route.

## Workflow
1. Identify which work stays local on the critical path.
2. Split only independent sidecar tasks.
3. Give each subagent self-contained context, constraints, expected output, and disjoint ownership.
4. Instruct subagents not to revert unrelated changes and not to expand scope.
5. Review returned findings or patches before integrating them.
6. Run full verification after integration.

## Evidence To Produce
- Delegation authorization source.
- Subtask ownership and constraints.
- Subagent outputs and main-agent disposition.
- Integration and verification evidence.

## Authority Boundary
This skill does not spawn subagents by itself. Subagents require explicit user request or explicit packet authorization traceable to user approval. Subagent output is evidence or implementation input, not approval or closeout authority.
