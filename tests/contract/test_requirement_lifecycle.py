import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RequirementLifecycleTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def _store_with_requirement(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore

        tmp = tempfile.TemporaryDirectory()
        store = HarnessStore(Path(tmp.name))
        store.initialize()
        PacketService(store).create_packet(
            packet_id="pkt-001",
            title="Requirement lifecycle packet",
            objective="Exercise requirement lifecycle transitions.",
            risk_class="low",
            scope_summary="Requirement lifecycle.",
            out_of_scope_summary="No external services.",
            change_zones=["docs/requirements/"],
            acceptance_criteria_ids=["ac-1"],
            evidence_requirements=["unit-test"],
            closeout_criteria=["decision-record"],
            owner="human-owner",
            idempotency_key="packet-create-pkt-001",
            approval_required=False,
        )
        RequirementRegistry(store).register_requirement(
            requirement_id="REQ-A",
            version="1",
            source_doc="requirements.md",
            status="approved",
            classification="Core",
            risk_classification="low",
            acceptance_criteria=["ac-1"],
            completion_classification="unverified",
            packet_id="pkt-001",
            idempotency_key="req-a",
        )
        return tmp, store

    def test_requirement_can_be_deferred_with_decision_record(self):
        from standard_harness.domain.requirements import RequirementRegistry

        tmp, store = self._store_with_requirement()
        with tmp:
            updated = RequirementRegistry(store).transition_requirement(
                requirement_id="REQ-A",
                status="deferred",
                decision_record_id="DR-100",
                rationale="Deferred to Standard conformance.",
                idempotency_key="req-a-deferred",
            )

            self.assertEqual(updated["status"], "deferred")
            self.assertEqual(updated["decision_record_id"], "DR-100")
            self.assertEqual(updated["decision_rationale"], "Deferred to Standard conformance.")
            with store.connection() as conn:
                event = conn.execute(
                    "select event_type from events order by event_seq desc limit 1"
                ).fetchone()
            self.assertEqual(event["event_type"], "requirement.transitioned")

    def test_requirement_registration_rejects_unknown_status(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Requirement validation packet",
                objective="Reject invalid requirement status.",
                risk_class="low",
                scope_summary="Requirement lifecycle.",
                out_of_scope_summary="No external services.",
                change_zones=["docs/requirements/"],
                acceptance_criteria_ids=["ac-1"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["status-validation"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
                approval_required=False,
            )

            with self.assertRaises(ValueError):
                RequirementRegistry(store).register_requirement(
                    requirement_id="REQ-B",
                    version="1",
                    source_doc="requirements.md",
                    status="mystery",
                    classification="Core",
                    risk_classification="low",
                    acceptance_criteria=["ac-1"],
                    completion_classification="unverified",
                    packet_id="pkt-001",
                    idempotency_key="req-b",
                )

    def test_requirement_registration_rejects_decision_required_status_without_decision_record(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Requirement decision guard packet",
                objective="Reject direct deferred registration without a decision record.",
                risk_class="low",
                scope_summary="Requirement lifecycle.",
                out_of_scope_summary="No external services.",
                change_zones=["docs/requirements/"],
                acceptance_criteria_ids=["ac-1"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["decision-record"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
                approval_required=False,
            )

            with self.assertRaises(ValueError):
                RequirementRegistry(store).register_requirement(
                    requirement_id="REQ-C",
                    version="1",
                    source_doc="requirements.md",
                    status="deferred",
                    classification="Core",
                    risk_classification="low",
                    acceptance_criteria=["ac-1"],
                    completion_classification="unverified",
                    packet_id="pkt-001",
                    idempotency_key="req-c",
                )

    def test_terminal_or_scope_changing_requirement_status_requires_decision_record(self):
        from standard_harness.domain.requirements import RequirementRegistry

        tmp, store = self._store_with_requirement()
        with tmp:
            with self.assertRaises(ValueError):
                RequirementRegistry(store).transition_requirement(
                    requirement_id="REQ-A",
                    status="rejected",
                    decision_record_id="",
                    rationale="No decision record.",
                    idempotency_key="req-a-rejected",
                )

    def test_requirement_transition_idempotency_does_not_create_untraced_state(self):
        from standard_harness.domain.requirements import RequirementRegistry

        tmp, store = self._store_with_requirement()
        with tmp:
            registry = RequirementRegistry(store)
            first = registry.transition_requirement(
                requirement_id="REQ-A",
                status="deferred",
                decision_record_id="DR-100",
                rationale="Deferred once.",
                idempotency_key="req-a-deferred",
            )
            second = registry.transition_requirement(
                requirement_id="REQ-A",
                status="retired",
                decision_record_id="DR-200",
                rationale="Duplicate key must not mutate.",
                idempotency_key="req-a-deferred",
            )

            self.assertEqual(first["status"], "deferred")
            self.assertEqual(second["status"], "deferred")
            self.assertEqual(registry.get_requirement("REQ-A")["decision_record_id"], "DR-100")

    def test_requirement_transition_replays_and_audits_decision_fields(self):
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.audit import PointInTimeAudit
        from standard_harness.state.replay import StateReplayService

        tmp, store = self._store_with_requirement()
        with tmp:
            registry = RequirementRegistry(store)
            registry.transition_requirement(
                requirement_id="REQ-A",
                status="deferred",
                decision_record_id="DR-100",
                rationale="Deferred once.",
                idempotency_key="req-a-deferred",
            )
            transition_seq = store.latest_event_seq()
            snapshot = PointInTimeAudit(store).snapshot_at(event_seq=transition_seq)
            with store.connection() as conn:
                conn.execute("delete from requirements")
                conn.commit()

            report = StateReplayService(store).rebuild_materialized_state(through_event_seq=transition_seq)
            replayed = registry.get_requirement("REQ-A")

            self.assertEqual(report["status"], "rebuilt")
            self.assertEqual(replayed["status"], "deferred")
            self.assertEqual(replayed["decision_record_id"], "DR-100")
            self.assertEqual(snapshot["requirements"]["REQ-A"]["decision_record_id"], "DR-100")
