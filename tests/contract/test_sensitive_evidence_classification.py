import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SensitiveEvidenceClassificationTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_policy_defines_v02_evidence_classifications(self):
        from standard_harness.security.evidence_classification import EvidenceClassificationPolicy

        policy = EvidenceClassificationPolicy.load(
            ROOT / "_harness" / "policies" / "evidence-classification.yaml"
        )

        self.assertEqual(policy.classifications, ["PUBLIC", "INTERNAL", "SENSITIVE", "SECRET"])
        self.assertFalse(policy.can_promote_to_wiki("SECRET"))
        self.assertFalse(policy.can_include_in_handoff("SECRET"))
        self.assertFalse(policy.can_promote_to_wiki("SENSITIVE"))
        self.assertFalse(policy.can_include_in_handoff("SENSITIVE"))

    def test_classifier_defaults_normal_evidence_to_internal(self):
        from standard_harness.security.evidence_classification import EvidenceClassifier

        result = EvidenceClassifier.from_repo(ROOT).classify(
            content="Ran 248 tests in 209.436s OK",
            artifact_path="tests/contract/test_sensitive_evidence_classification.py",
        )

        self.assertEqual(result["classification"], "INTERNAL")
        self.assertEqual(result["diagnostic_ids"], [])
        self.assertTrue(result["wikiPromotionAllowed"])
        self.assertTrue(result["handoffAllowed"])

    def test_classifier_marks_secret_content_non_promotable(self):
        from standard_harness.security.evidence_classification import EvidenceClassifier

        result = EvidenceClassifier.from_repo(ROOT).classify(
            content="api_key=supersecretvalue123456",
            artifact_path="_ops/evidence/run.log",
        )

        self.assertEqual(result["classification"], "SECRET")
        self.assertIn("secret_evidence_registered", result["diagnostic_ids"])
        self.assertFalse(result["wikiPromotionAllowed"])
        self.assertFalse(result["handoffAllowed"])

    def test_registered_normal_evidence_records_internal_classification(self):
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Evidence classification packet",
                objective="Classify normal evidence.",
                risk_class="low",
                scope_summary="Evidence classification.",
                out_of_scope_summary="No secret evidence.",
                change_zones=["tests/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["passing-gate"],
                owner="human-owner",
                approval_required=False,
                idempotency_key="packet-create-pkt-001",
            )

            evidence = EvidenceService(store).register_evidence(
                evidence_id="ev-001",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="unittest",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="tests/contract/test_sensitive_evidence_classification.py",
                content="passed",
                result_status="passed",
                rationale="normal evidence classification",
                idempotency_key="evidence-ev-001",
            )

            self.assertEqual(evidence["classification"], "INTERNAL")


if __name__ == "__main__":
    unittest.main()
