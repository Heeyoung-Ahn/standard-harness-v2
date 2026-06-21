import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class CloudFailureDegradesSafelyEval(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_cloud_failure_produces_structured_diagnostics(self):
        from standard_harness.cloud.orchestration import CloudOrchestrationService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store)

            result = CloudOrchestrationService(store).start_remote_work(
                orchestration_run_id="cloud-failure",
                packet_id="pkt-001",
                actor_id="dev-1",
                actor_role="Developer",
                remote_environment_id="remote-dev",
                permission_roots=["src/"],
                input_snapshot_hash="sha256:input",
                evidence_output={"artifact_path": "evidence/cloud.json", "content_hash": "sha256:evidence"},
                cloud_service_available=True,
                failure_classification="timeout",
                idempotency_key="cloud-failure",
            )

            self.assertEqual(result["status"], "blocked")
            self.assertEqual(result["failure_classification"], "timeout")
            self.assertIn("cloud_timeout", result["diagnostic_ids"])

    def test_missing_cloud_service_degrades_to_manual_local_blocked_path(self):
        from standard_harness.cloud.orchestration import CloudOrchestrationService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store)

            result = CloudOrchestrationService(store).start_remote_work(
                orchestration_run_id="cloud-missing",
                packet_id="pkt-001",
                actor_id="dev-1",
                actor_role="Developer",
                remote_environment_id="remote-dev",
                permission_roots=["src/"],
                input_snapshot_hash="sha256:input",
                evidence_output={"artifact_path": "evidence/cloud.json", "content_hash": "sha256:evidence"},
                cloud_service_available=False,
                idempotency_key="cloud-missing",
            )

            self.assertEqual(result["status"], "blocked")
            self.assertEqual(result["failure_classification"], "cloud_service_missing")
            self.assertIn("cloud_service_missing", result["diagnostic_ids"])
            self.assertIn("manual_local_fallback_required", result["diagnostic_ids"])


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_packet(store):
    from standard_harness.domain.packets import PacketService

    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Cloud failure packet",
        objective="Degrade safely when cloud is unavailable.",
        risk_class="medium",
        scope_summary="Cloud failure path.",
        out_of_scope_summary="No remote execution bypass.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["cloud-evidence"],
        closeout_criteria=["passing-gate"],
        owner="owner",
        approval_required=False,
        idempotency_key="packet-create-pkt-001",
    )


if __name__ == "__main__":
    unittest.main()
