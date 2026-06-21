import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class WorkflowOrchestrationTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_implementation_cannot_start_before_required_approval(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore
        from standard_harness.workflow.orchestration import WorkflowOrchestrationService

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Workflow packet",
                objective="Exercise workflow approvals.",
                risk_class="low",
                scope_summary="Workflow.",
                out_of_scope_summary="No external systems.",
                change_zones=["src/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["approval"],
                owner="owner",
                idempotency_key="packet-create-pkt-001",
            )

            blocked = WorkflowOrchestrationService(store).record_run(
                workflow_run_id="wf-001",
                packet_id="pkt-001",
                phase="implementation",
                actor_role="Developer",
                input_projection_id=None,
                retry_count=0,
                idempotency_key="wf-001",
            )

            self.assertEqual(blocked["status"], "blocked")
            self.assertIn("missing_approval", blocked["blocker_diagnostic_ids"])
            with store.connection() as conn:
                event = conn.execute(
                    "select event_type from events order by event_seq desc limit 1"
                ).fetchone()
            self.assertEqual(event["event_type"], "workflow.run_recorded")

            PacketService(store).approve_packet(
                packet_id="pkt-001",
                approver_id="owner",
                approver_role="Human Owner",
                authority_basis="explicit approval",
                approved_scope="implementation",
                rationale="Approved workflow test.",
                idempotency_key="approve-pkt-001",
            )
            active = WorkflowOrchestrationService(store).record_run(
                workflow_run_id="wf-002",
                packet_id="pkt-001",
                phase="implementation",
                actor_role="Developer",
                input_projection_id=None,
                retry_count=0,
                idempotency_key="wf-002",
            )

            self.assertEqual(active["status"], "active")
            self.assertEqual(active["blocker_diagnostic_ids"], [])


if __name__ == "__main__":
    unittest.main()
