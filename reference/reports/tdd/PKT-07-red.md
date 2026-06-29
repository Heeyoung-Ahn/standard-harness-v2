# PKT-07 TDD RED Evidence

- Packet: `PKT-07_CONDUCTOR_SURFACE_AND_CLI_WORKER_ROUTING_LOOP`
- RED command: `PYTHONDONTWRITEBYTECODE=1 python starter\standard-harness\_harness\test\test_conductor_routing_loop.py`
- RED exit: 1
- RED failure: `ModuleNotFoundError: No module named 'standard_harness.workflow.conductor'`
- RED rationale: PKT-07 requires a Conductor-facing runtime contract for selection,
  entry generation, delegated approval validation, routing policy, and command/path
  safety. The test failed because that module did not exist yet.
