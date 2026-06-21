import sys
import tempfile
import unittest
from pathlib import Path
import subprocess
import json


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CLI = ROOT / "tools" / "harness_cli.py"


class DashboardReadModelTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_dashboard_exposes_lifecycle_approval_evidence_claim_gate_closeout_diagnostics_and_projection_freshness(self):
        from standard_harness.dashboard.read_model import DashboardReadModel
        from standard_harness.projection.current_context import CurrentContextProjection

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_closed_packet(store)
            CurrentContextProjection(store).generate(packet_id="pkt-001")

            packet_view = DashboardReadModel(store).packet_detail("pkt-001")

            self.assertEqual(packet_view["packet"]["lifecycle_state"], "closed")
            self.assertEqual(packet_view["approval"]["approval_state"], "not_required")
            self.assertEqual(packet_view["evidence"][0]["evidence_id"], "ev-001")
            self.assertEqual(packet_view["claims"][0]["claim_id"], "claim-001")
            self.assertEqual(packet_view["gates"]["results"][0]["gate_result_id"], "gres-001")
            self.assertEqual(packet_view["closeouts"][0]["decision_status"], "closed")
            self.assertIn("diagnostics", packet_view)
            self.assertEqual(packet_view["projection_freshness"]["freshness_status"], "fresh")

    def test_dashboard_stale_projection_warning_is_visible(self):
        from standard_harness.dashboard.read_model import DashboardReadModel
        from standard_harness.domain.packets import PacketService
        from standard_harness.projection.current_context import CurrentContextProjection

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_closed_packet(store)
            CurrentContextProjection(store).generate(packet_id="pkt-001")
            PacketService(store).transition_packet(
                packet_id="pkt-001",
                lifecycle_state="reopened",
                actor_id="owner",
                actor_role="Owner",
                authority_basis="test stale projection",
                idempotency_key="reopen-pkt-001",
            )

            packet_view = DashboardReadModel(store).packet_detail("pkt-001")

            self.assertEqual(packet_view["projection_freshness"]["freshness_status"], "stale")
            self.assertEqual(packet_view["warnings"], ["stale_projection"])

    def test_context_output_discloses_memory_entry_types(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_closed_packet(store)

            result = subprocess.run(
                [
                    sys.executable,
                    str(CLI),
                    "--json",
                    "--harness-root",
                    tmp,
                    "context",
                    "--packet-id",
                    "pkt-001",
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            payload = json.loads(result.stdout)

            self.assertIn("memory_entries", payload)
            self.assertIn("entry_type", payload["memory_entries"][0])


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_closed_packet(store):
    from tests.contract.test_policy_bundle_profile import _register_policy_bundle, _seed_ready_packet
    from standard_harness.domain.closeout import CloseoutService

    _seed_ready_packet(store)
    _register_policy_bundle(store)
    CloseoutService(store).close_packet(
        closeout_id="close-001",
        packet_id="pkt-001",
        authority_basis="dashboard fixture",
        rationale="closed packet for dashboard",
        idempotency_key="close-001",
    )


if __name__ == "__main__":
    unittest.main()
