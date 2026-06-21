import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class DependencyIntakePolicyTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_dependency_intake_records_source_license_scripts_network_trust_and_rollback(self):
        from standard_harness.policy.dependency import DependencyIntakeService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            dependency = DependencyIntakeService(store).record_dependency(
                dependency_id="dep-playwright",
                name="playwright",
                version="1.0.0",
                source="npm",
                license_basis="Apache-2.0",
                install_scripts=["postinstall"],
                network_behavior="downloads browser binaries",
                trust_tier="reviewed",
                waiver_expiry="2026-12-31",
                rollback_path="npm remove playwright",
                idempotency_key="dep-playwright",
            )

            self.assertEqual(dependency["source"], "npm")
            self.assertEqual(dependency["license_basis"], "Apache-2.0")
            self.assertEqual(dependency["install_scripts"], ["postinstall"])
            self.assertEqual(dependency["network_behavior"], "downloads browser binaries")
            self.assertEqual(dependency["trust_tier"], "reviewed")
            self.assertEqual(dependency["rollback_path"], "npm remove playwright")

    def test_dependency_with_missing_rollback_path_blocks_intake(self):
        from standard_harness.policy.dependency import DependencyIntakeService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            result = DependencyIntakeService(store).evaluate_intake(
                source="npm",
                license_basis="MIT",
                install_scripts=[],
                network_behavior="none",
                trust_tier="reviewed",
                rollback_path="",
            )

            self.assertEqual(result["status"], "blocked")
            self.assertIn("missing_rollback_path", result["diagnostic_ids"])

    def test_blocked_dependency_intake_blocks_packet_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.policy.dependency import DependencyIntakeService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_ready_packet_with_policy(store)
            DependencyIntakeService(store).record_dependency(
                dependency_id="dep-risky",
                name="risky",
                version="1.0.0",
                source="npm",
                license_basis="MIT",
                install_scripts=["postinstall"],
                network_behavior="downloads binary",
                trust_tier="reviewed",
                waiver_expiry=None,
                rollback_path="",
                idempotency_key="dep-risky",
            )

            closeout = CloseoutService(store).close_packet(
                closeout_id="close-dependency",
                packet_id="pkt-001",
                authority_basis="dependency gate",
                rationale="blocked dependency intake prevents closeout",
                idempotency_key="close-dependency",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("blocked_dependency_intake", closeout["diagnostic_ids"])


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_ready_packet_with_policy(store):
    from tests.contract.test_policy_bundle_profile import _register_policy_bundle, _seed_ready_packet

    _seed_ready_packet(store)
    _register_policy_bundle(store)


if __name__ == "__main__":
    unittest.main()
