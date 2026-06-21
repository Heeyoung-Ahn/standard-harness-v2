import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class WaiverLifecycleTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_waiver_records_approval_scope_expiration_revocation_control_and_gate_metadata(self):
        from standard_harness.waivers.lifecycle import WaiverLifecycleService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            waiver = WaiverLifecycleService(store).record_waiver(
                waiver_id="waiver-001",
                approver_id="security-owner",
                approver_role="Security Owner",
                scope="dependency install script exception",
                expires_at="2026-12-31",
                compensating_control="manual checksum verification",
                affected_gate_ids=["gate-dependency"],
                revocation_status="active",
                idempotency_key="waiver-001",
            )

            self.assertEqual(waiver["approver_id"], "security-owner")
            self.assertEqual(waiver["scope"], "dependency install script exception")
            self.assertEqual(waiver["expires_at"], "2026-12-31")
            self.assertEqual(waiver["compensating_control"], "manual checksum verification")
            self.assertEqual(waiver["affected_gate_ids"], ["gate-dependency"])
            self.assertEqual(waiver["revocation_status"], "active")

    def test_expired_or_revoked_waivers_are_ignored_by_gate_evaluation(self):
        from standard_harness.waivers.lifecycle import WaiverLifecycleService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            waivers = WaiverLifecycleService(store)
            waivers.record_waiver(
                waiver_id="waiver-expired",
                approver_id="owner",
                approver_role="Owner",
                scope="temporary gate bypass",
                expires_at="2026-01-01",
                compensating_control="manual review",
                affected_gate_ids=["gate-dependency"],
                revocation_status="active",
                idempotency_key="waiver-expired",
            )
            waivers.record_waiver(
                waiver_id="waiver-revoked",
                approver_id="owner",
                approver_role="Owner",
                scope="temporary gate bypass",
                expires_at="2026-12-31",
                compensating_control="manual review",
                affected_gate_ids=["gate-dependency"],
                revocation_status="revoked",
                idempotency_key="waiver-revoked",
            )

            result = waivers.evaluate_gate_waiver(
                gate_id="gate-dependency",
                evaluated_at="2026-06-21",
                non_waivable_gate_ids=[],
            )

            self.assertEqual(result["status"], "blocked")
            self.assertIn("no_active_waiver", result["diagnostic_ids"])

    def test_non_waivable_gates_cannot_be_bypassed_by_profile_or_local_policy(self):
        from standard_harness.waivers.lifecycle import WaiverLifecycleService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            WaiverLifecycleService(store).record_waiver(
                waiver_id="waiver-hard-gate",
                approver_id="owner",
                approver_role="Owner",
                scope="try to bypass hard gate",
                expires_at="2026-12-31",
                compensating_control="manual review",
                affected_gate_ids=["gate-release"],
                revocation_status="active",
                idempotency_key="waiver-hard-gate",
            )

            result = WaiverLifecycleService(store).evaluate_gate_waiver(
                gate_id="gate-release",
                evaluated_at="2026-06-21",
                non_waivable_gate_ids=["gate-release"],
            )

            self.assertEqual(result["status"], "blocked")
            self.assertIn("non_waivable_gate", result["diagnostic_ids"])

    def test_central_non_waivable_gate_policy_blocks_even_when_caller_omits_list(self):
        from standard_harness.waivers.lifecycle import WaiverLifecycleService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            WaiverLifecycleService(store).record_waiver(
                waiver_id="waiver-release",
                approver_id="owner",
                approver_role="Owner",
                scope="try to bypass release gate",
                expires_at="2026-12-31",
                compensating_control="manual review",
                affected_gate_ids=["gate-release"],
                revocation_status="active",
                idempotency_key="waiver-release",
            )

            result = WaiverLifecycleService(store).evaluate_gate_waiver(
                gate_id="gate-release",
                evaluated_at="2026-06-21",
                non_waivable_gate_ids=[],
            )

            self.assertEqual(result["status"], "blocked")
            self.assertIn("non_waivable_gate", result["diagnostic_ids"])


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


if __name__ == "__main__":
    unittest.main()
