import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RegistryMinimumTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def _store_with_packet(self):
        from standard_harness.domain.packets import PacketService
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
        return tmp, store

    def test_manual_requirement_registration_records_source_and_status(self):
        from standard_harness.domain.requirements import RequirementRegistry

        tmp, store = self._store_with_packet()
        with tmp:
            registry = RequirementRegistry(store)
            requirement = registry.register_requirement(
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

            self.assertEqual(requirement["requirement_id"], "REQ-001")
            self.assertEqual(requirement["status"], "approved")
            self.assertEqual(requirement["acceptance_criteria"], ["ac-001"])
            self.assertEqual(store.latest_event_seq(), 2)

    def test_acceptance_criteria_link_requirement_and_packet(self):
        from standard_harness.domain.requirements import RequirementRegistry

        tmp, store = self._store_with_packet()
        with tmp:
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
            criterion = registry.register_acceptance_criterion(
                acceptance_criterion_id="ac-001",
                requirement_id="REQ-001",
                packet_id="pkt-001",
                description="Command inventory is documented.",
                status="proposed",
                idempotency_key="acceptance-ac-001",
            )

            self.assertEqual(criterion["requirement_id"], "REQ-001")
            self.assertEqual(criterion["packet_id"], "pkt-001")

    def test_artifact_registry_records_path_owner_and_packet(self):
        from standard_harness.domain.artifacts import ArtifactRegistry

        tmp, store = self._store_with_packet()
        with tmp:
            registry = ArtifactRegistry(store)
            artifact = registry.register_artifact(
                artifact_id="art-001",
                artifact_type="document",
                path="docs/requirements/example.md",
                owner="Planner",
                lifecycle_status="active",
                source_reference="REQ-001",
                packet_id="pkt-001",
                idempotency_key="artifact-art-001",
            )

            self.assertEqual(artifact["artifact_id"], "art-001")
            self.assertEqual(artifact["packet_id"], "pkt-001")
            self.assertEqual(artifact["path"], "docs/requirements/example.md")

    def test_automated_ssot_extraction_is_not_present_in_mvp_registry(self):
        from standard_harness.domain.requirements import RequirementRegistry

        tmp, store = self._store_with_packet()
        with tmp:
            registry = RequirementRegistry(store)
            self.assertFalse(hasattr(registry, "extract_from_ssot"))


if __name__ == "__main__":
    unittest.main()
