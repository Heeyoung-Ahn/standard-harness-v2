import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SecretEvidenceRegistrationBlockedTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_secret_evidence_registration_is_blocked_before_persistence(self):
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Secret evidence packet",
                objective="Secret evidence must not register.",
                risk_class="high",
                scope_summary="Secret scan.",
                out_of_scope_summary="No storage of secret content.",
                change_zones=["tests/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["passing-gate"],
                owner="human-owner",
                approval_required=False,
                idempotency_key="packet-create-pkt-001",
            )

            with self.assertRaisesRegex(ValueError, "secret_evidence_registered"):
                EvidenceService(store).register_evidence(
                    evidence_id="ev-secret",
                    packet_id="pkt-001",
                    claim_id=None,
                    command_or_tool="python -m unittest",
                    runner="unittest",
                    cwd_or_execution_context=str(ROOT),
                    environment_fingerprint="python-test",
                    artifact_path="_ops/evidence/secret.log",
                    content="api_key=supersecretvalue123456",
                    result_status="passed",
                    rationale="secret evidence must be rejected",
                    idempotency_key="evidence-ev-secret",
                )

            with store.connection() as conn:
                row = conn.execute(
                    "select 1 from evidence where evidence_id = ?", ("ev-secret",)
                ).fetchone()
                event = conn.execute(
                    "select 1 from events where idempotency_key = ?", ("evidence-ev-secret",)
                ).fetchone()

            self.assertIsNone(row)
            self.assertIsNone(event)


if __name__ == "__main__":
    unittest.main()
