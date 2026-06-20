import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class EvidenceClaimTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def _store_with_registry(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore

        tmp = tempfile.TemporaryDirectory()
        store = HarnessStore(Path(tmp.name))
        store.initialize()
        PacketService(store).create_packet(
            packet_id="pkt-001",
            title="Command inventory docs",
            objective="Document available command inventory.",
            risk_class="low",
            scope_summary="Inspect and document commands.",
            out_of_scope_summary="No runtime behavior changes.",
            change_zones=["docs/"],
            acceptance_criteria_ids=["ac-001"],
            evidence_requirements=["command-output"],
            closeout_criteria=["evidence-registered"],
            owner="human-owner",
            idempotency_key="packet-create-pkt-001",
        )
        registry = RequirementRegistry(store)
        registry.register_requirement(
            requirement_id="REQ-001",
            version="1",
            source_doc="docs/requirements/example.md",
            status="approved",
            classification="Core",
            risk_classification="low",
            acceptance_criteria=["ac-001"],
            completion_classification="unverified",
            packet_id="pkt-001",
            idempotency_key="requirement-REQ-001",
        )
        registry.register_acceptance_criterion(
            acceptance_criterion_id="ac-001",
            requirement_id="REQ-001",
            packet_id="pkt-001",
            description="Command inventory is documented.",
            status="proposed",
            idempotency_key="acceptance-ac-001",
        )
        return tmp, store

    def test_evidence_registration_requires_provenance_and_allows_optional_claim(self):
        from standard_harness.domain.evidence import EvidenceService

        tmp, store = self._store_with_registry()
        with tmp:
            service = EvidenceService(store)
            evidence = service.register_evidence(
                evidence_id="ev-001",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="unittest",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="tests/contract/test_evidence_claims.py",
                content="evidence output",
                result_status="passed",
                rationale="contract test evidence",
                idempotency_key="evidence-ev-001",
            )

            self.assertEqual(evidence["claim_id"], None)
            self.assertEqual(evidence["result_status"], "passed")
            self.assertEqual(evidence["content_hash_algorithm"], "sha256")
            self.assertEqual(len(evidence["content_hash"]), 64)

    def test_supported_claim_requires_valid_evidence(self):
        from standard_harness.domain.evidence import EvidenceService

        tmp, store = self._store_with_registry()
        with tmp:
            service = EvidenceService(store)
            with self.assertRaises(ValueError):
                service.record_claim(
                    claim_id="claim-001",
                    packet_id="pkt-001",
                    requirement_id="REQ-001",
                    acceptance_criterion_id="ac-001",
                    evidence_ids=[],
                    support_status="supported",
                    idempotency_key="claim-001",
                )

            claim = service.record_claim(
                claim_id="claim-001",
                packet_id="pkt-001",
                requirement_id="REQ-001",
                acceptance_criterion_id="ac-001",
                evidence_ids=[],
                support_status="unverified",
                idempotency_key="claim-001-unverified",
            )
            self.assertEqual(claim["support_status"], "unverified")

    def test_supported_claim_can_link_valid_passed_evidence(self):
        from standard_harness.domain.evidence import EvidenceService

        tmp, store = self._store_with_registry()
        with tmp:
            service = EvidenceService(store)
            service.register_evidence(
                evidence_id="ev-001",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="unittest",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="tests/contract/test_evidence_claims.py",
                content="evidence output",
                result_status="passed",
                rationale="contract test evidence",
                idempotency_key="evidence-ev-001",
            )
            claim = service.record_claim(
                claim_id="claim-001",
                packet_id="pkt-001",
                requirement_id="REQ-001",
                acceptance_criterion_id="ac-001",
                evidence_ids=["ev-001"],
                support_status="supported",
                idempotency_key="claim-001",
            )

            self.assertEqual(claim["support_status"], "supported")
            self.assertEqual(claim["evidence_ids"], ["ev-001"])

    def test_failed_evidence_blocks_supported_claim(self):
        from standard_harness.domain.evidence import EvidenceService

        tmp, store = self._store_with_registry()
        with tmp:
            service = EvidenceService(store)
            service.register_evidence(
                evidence_id="ev-001",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="unittest",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="tests/contract/test_evidence_claims.py",
                content="failing evidence output",
                result_status="failed",
                rationale="contract test failed evidence",
                idempotency_key="evidence-ev-001",
            )

            with self.assertRaises(ValueError):
                service.record_claim(
                    claim_id="claim-001",
                    packet_id="pkt-001",
                    requirement_id="REQ-001",
                    acceptance_criterion_id="ac-001",
                    evidence_ids=["ev-001"],
                    support_status="supported",
                    idempotency_key="claim-001",
                )


if __name__ == "__main__":
    unittest.main()
