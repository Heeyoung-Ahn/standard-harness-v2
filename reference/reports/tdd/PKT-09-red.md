# PKT-09 TDD RED Evidence

- Packet: `PKT-09_SKILL_ROUTING_AND_OPERATOR_ERGONOMICS`
- Command: `py -3 starter\standard-harness\_harness\test\test_skill_routing_operator_ergonomics.py`
- Exit code: `1`
- Ran at: `2026-06-29T18:55:17+09:00`
- Expected failure kind: missing skill router intent API and contract behavior.

## Output Excerpt

```text
TypeError: SkillRouter.route() got an unexpected keyword argument 'intent_text'
FAILED (errors=14)
```

## RED Disposition

The test failed for the expected reason: the existing starter skill router only accepted
exact `task_type` routing and did not yet expose PKT-09 intent routing, hard-gate,
chaining, no-superpowers, or skill-use ledger behavior.
