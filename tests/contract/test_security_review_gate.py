import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SecurityReviewGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_threat_model_records_assets_boundaries_assumptions_abuse_cases_and_mitigations(self):
        from standard_harness.security.threat_model import ThreatModelService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            threat_model = ThreatModelService(store).record_threat_model(
                threat_model_id="tm-001",
                assets=["state database"],
                trust_boundaries=["local filesystem"],
                attacker_assumptions=["malicious adapter output"],
                abuse_cases=["path escape"],
                mitigations=[{"id": "mit-001", "status": "implemented"}],
                idempotency_key="tm-001",
            )

            self.assertEqual(threat_model["assets"], ["state database"])
            self.assertEqual(threat_model["trust_boundaries"], ["local filesystem"])
            self.assertEqual(threat_model["attacker_assumptions"], ["malicious adapter output"])
            self.assertEqual(threat_model["abuse_cases"], ["path escape"])
            self.assertEqual(threat_model["mitigations"][0]["status"], "implemented")

    def test_security_review_gate_blocks_release_when_required_mitigations_are_open(self):
        from standard_harness.security.threat_model import SecurityReviewGate, ThreatModelService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            ThreatModelService(store).record_threat_model(
                threat_model_id="tm-open",
                assets=["state database"],
                trust_boundaries=["local filesystem"],
                attacker_assumptions=["malicious adapter output"],
                abuse_cases=["path escape"],
                mitigations=[
                    {"id": "mit-open", "status": "open", "required_for_release": True}
                ],
                idempotency_key="tm-open",
            )

            result = SecurityReviewGate(store).evaluate_release()

            self.assertEqual(result["status"], "blocked")
            self.assertIn("open_required_mitigation", result["diagnostic_ids"])

    def test_open_required_threat_model_mitigation_blocks_packet_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.security.threat_model import ThreatModelService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_ready_packet_with_policy(store)
            ThreatModelService(store).record_threat_model(
                threat_model_id="tm-open",
                assets=["state database"],
                trust_boundaries=["local filesystem"],
                attacker_assumptions=["malicious adapter output"],
                abuse_cases=["path escape"],
                mitigations=[
                    {"id": "mit-open", "status": "open", "required_for_release": True}
                ],
                idempotency_key="tm-open",
            )

            closeout = CloseoutService(store).close_packet(
                closeout_id="close-security",
                packet_id="pkt-001",
                authority_basis="security review gate",
                rationale="security mitigations must be closed",
                idempotency_key="close-security",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("open_required_mitigation", closeout["diagnostic_ids"])


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
