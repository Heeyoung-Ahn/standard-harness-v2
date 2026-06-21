import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class EvidenceTrustModelV02Tests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_evidence_schema_declares_trust_and_validation_status(self):
        schema = json.loads(
            (ROOT / "_harness" / "schemas" / "evidence.schema.json").read_text(
                encoding="utf-8"
            )
        )

        for field in [
            "evidenceId",
            "type",
            "path",
            "producerRole",
            "producerProvider",
            "producedVia",
            "command",
            "exitCode",
            "baseCommit",
            "headCommit",
            "workspaceId",
            "hash",
            "claims",
            "trustStatus",
            "validationStatus",
        ]:
            self.assertIn(field, schema["required"])
        self.assertIn("REPRODUCED_BY_HARNESS", schema["properties"]["trustStatus"]["enum"])
        self.assertIn("TRUSTED_CI", schema["properties"]["trustStatus"]["enum"])
        self.assertIn("MANUAL_ONLY", schema["properties"]["trustStatus"]["enum"])

    def test_manual_handoff_passed_evidence_is_structural_not_trusted(self):
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.evidence.trust import EvidenceTrustPolicy

        tmp, store = _store_with_registry(packet_type="product-feature")
        with tmp:
            evidence = EvidenceService(store).register_evidence(
                evidence_id="ev-manual",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="tester",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="tests/contract/test_evidence_trust_model_v02.py",
                content="passed output",
                result_status="passed",
                rationale="manual handoff output",
                idempotency_key="ev-manual",
            )

            self.assertEqual(evidence["validation_status"], "STRUCTURALLY_VALID")
            self.assertEqual(evidence["trust_status"], "MANUAL_ONLY")
            self.assertFalse(EvidenceTrustPolicy().can_closeout(evidence))

    def test_harness_reproduced_evidence_can_support_closeout(self):
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.evidence.trust import EvidenceTrustPolicy

        tmp, store = _store_with_registry(packet_type="product-feature")
        with tmp:
            evidence = EvidenceService(store).register_evidence(
                evidence_id="ev-harness",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="tester",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="tests/contract/test_evidence_trust_model_v02.py",
                content="passed output",
                result_status="passed",
                rationale="harness reproduced output",
                idempotency_key="ev-harness",
                produced_via="harness-reproduction",
                base_commit="base-sha",
                head_commit="head-sha",
                workspace_id="pkt-001",
            )

            self.assertEqual(evidence["trust_status"], "REPRODUCED_BY_HARNESS")
            self.assertTrue(EvidenceTrustPolicy().can_closeout(evidence))


def _store_with_registry(packet_type="docs-only"):
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry
    from standard_harness.state.store import HarnessStore

    tmp = tempfile.TemporaryDirectory()
    store = HarnessStore(Path(tmp.name))
    store.initialize()
    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Evidence trust packet",
        objective="Validate evidence trust.",
        packet_type=packet_type,
        risk_class="medium",
        scope_summary="Evidence trust.",
        out_of_scope_summary="XP-04 E2E.",
        change_zones=["src/standard_harness/domain/evidence.py"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["trusted-test-evidence"],
        test_plan=["python -m unittest tests.contract.test_evidence_trust_model_v02"],
        closeout_criteria=["supported-claim", "trusted-evidence"],
        owner="human-owner",
        approval_required=False,
        idempotency_key=f"packet-create-{packet_type}",
    )
    registry = RequirementRegistry(store)
    registry.register_requirement(
        requirement_id="REQ-001",
        version="1",
        source_doc="docs/requirements/example.md",
        status="approved",
        classification="Core",
        risk_classification="medium",
        acceptance_criteria=["ac-001"],
        completion_classification="unverified",
        packet_id="pkt-001",
        idempotency_key="requirement-REQ-001",
    )
    registry.register_acceptance_criterion(
        acceptance_criterion_id="ac-001",
        requirement_id="REQ-001",
        packet_id="pkt-001",
        description="Trusted evidence exists.",
        status="proposed",
        idempotency_key="acceptance-ac-001",
    )
    return tmp, store


if __name__ == "__main__":
    unittest.main()
