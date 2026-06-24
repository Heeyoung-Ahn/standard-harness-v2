import json
import os
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SecretEvidencePolicyRootTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_secret_evidence_policy_loads_from_store_root_not_execution_cwd(self):
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as harness_tmp, tempfile.TemporaryDirectory() as cwd_tmp:
            harness_root = Path(harness_tmp)
            cwd_root = Path(cwd_tmp)
            _write_classification_policy(harness_root, secret_blocked=True)
            _write_classification_policy(cwd_root, secret_blocked=False)

            store = HarnessStore(harness_root)
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Secret policy root packet",
                objective="Secret policy must come from store root.",
                risk_class="high",
                scope_summary="Evidence registration.",
                out_of_scope_summary="No secret persistence.",
                change_zones=["tests/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["secret-scan"],
                closeout_criteria=["no-secret-evidence"],
                owner="human-owner",
                approval_required=False,
                idempotency_key="packet-create-pkt-001",
            )

            old_cwd = Path.cwd()
            os.chdir(cwd_root)
            try:
                with self.assertRaisesRegex(ValueError, "secret_evidence_registered"):
                    EvidenceService(store).register_evidence(
                        evidence_id="ev-secret",
                        packet_id="pkt-001",
                        claim_id=None,
                        command_or_tool="python -m unittest",
                        runner="unittest",
                        cwd_or_execution_context=str(cwd_root),
                        environment_fingerprint="python-test",
                        artifact_path="_ops/evidence/secret.log",
                        content="api_key=supersecretvalue123456",
                        result_status="passed",
                        rationale="secret evidence must be rejected by harness-root policy",
                        idempotency_key="evidence-ev-secret",
                    )
            finally:
                os.chdir(old_cwd)

            with store.connection() as conn:
                row = conn.execute(
                    "select 1 from evidence where evidence_id = ?", ("ev-secret",)
                ).fetchone()

            self.assertIsNone(row)


def _write_classification_policy(root: Path, *, secret_blocked: bool) -> None:
    policy = {
        "classifications": ["PUBLIC", "INTERNAL", "SENSITIVE", "SECRET"],
        "defaults": {"classification": "INTERNAL"},
        "promotionRules": {
            "PUBLIC": {"wikiPromotionAllowed": True, "handoffAllowed": True},
            "INTERNAL": {"wikiPromotionAllowed": True, "handoffAllowed": True},
            "SENSITIVE": {"wikiPromotionAllowed": False, "handoffAllowed": True},
            "SECRET": {"wikiPromotionAllowed": False, "handoffAllowed": False},
        },
        "registrationRules": {
            "SECRET": {
                "blocked": secret_blocked,
                "diagnostic": "secret_evidence_registered",
            }
        },
    }
    path = root / "_harness/policies/evidence-classification.yaml"
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps(policy), encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
