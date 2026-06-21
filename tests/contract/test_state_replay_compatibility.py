import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class StateReplayCompatibilityTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def _closed_packet_store(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.gates import GateService
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore

        tmp = tempfile.TemporaryDirectory()
        store = HarnessStore(Path(tmp.name))
        store.initialize()
        packets = PacketService(store)
        packets.create_packet(
            packet_id="pkt-001",
            title="Replay packet",
            objective="Prove event replay rebuilds materialized state.",
            risk_class="low",
            scope_summary="Replay state.",
            out_of_scope_summary="No external services.",
            change_zones=["src/standard_harness/state/"],
            acceptance_criteria_ids=["ac-001"],
            evidence_requirements=["unit-test"],
            closeout_criteria=["passing-gate"],
            owner="human-owner",
            idempotency_key="packet-create-pkt-001",
        )
        packets.approve_packet(
            packet_id="pkt-001",
            approver_id="owner-1",
            approver_role="Human Owner",
            authority_basis="explicit approval",
            approved_scope="FP-01 replay test",
            rationale="Replay fixture approval",
            idempotency_key="approve-pkt-001",
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
            description="Replay reconstructs the supported closeout path.",
            status="proposed",
            idempotency_key="acceptance-ac-001",
        )
        evidence = EvidenceService(store)
        evidence.register_evidence(
            evidence_id="ev-001",
            packet_id="pkt-001",
            claim_id=None,
            command_or_tool="python -m unittest tests.contract.test_state_replay_compatibility",
            runner="unittest",
            cwd_or_execution_context=str(ROOT),
            environment_fingerprint="python-test",
            artifact_path="tests/contract/test_state_replay_compatibility.py",
            content="passed",
            result_status="passed",
            rationale="Replay fixture evidence",
            idempotency_key="evidence-ev-001",
        )
        evidence.record_claim(
            claim_id="claim-001",
            packet_id="pkt-001",
            requirement_id="REQ-001",
            acceptance_criterion_id="ac-001",
            evidence_ids=["ev-001"],
            support_status="supported",
            idempotency_key="claim-001",
        )
        gates = GateService(store)
        gates.declare_gate(
            gate_id="gate-001",
            packet_id="pkt-001",
            gate_type="evidence",
            requirement_level="hard",
            declared_by_source="packet",
            idempotency_key="gate-declare-001",
        )
        gates.activate_gate(
            gate_activation_id="gact-001",
            gate_id="gate-001",
            packet_id="pkt-001",
            idempotency_key="gate-activate-001",
        )
        gates.record_gate_result(
            gate_result_id="gres-001",
            gate_id="gate-001",
            packet_id="pkt-001",
            checked_claim_ids=["claim-001"],
            evidence_ids=["ev-001"],
            status="pass",
            requirement_level="hard",
            rationale="supported by passed evidence",
            idempotency_key="gate-result-001",
        )
        CloseoutService(store).close_packet(
            closeout_id="co-001",
            packet_id="pkt-001",
            authority_basis="FP-01 replay closeout",
            rationale="All replay fixture evidence is present.",
            idempotency_key="closeout-001",
        )
        return tmp, store

    def test_rebuild_materialized_state_from_events(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.gates import GateService
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.replay import StateReplayService

        tmp, store = self._closed_packet_store()
        with tmp:
            latest_event_seq = store.latest_event_seq()
            with store.connection() as conn:
                for table in (
                    "closeouts",
                    "gate_results",
                    "gate_activations",
                    "gate_declarations",
                    "claims",
                    "evidence",
                    "acceptance_criteria",
                    "requirements",
                    "approval_records",
                    "packets",
                ):
                    conn.execute(f"delete from {table}")
                conn.commit()

            report = StateReplayService(store).rebuild_materialized_state()

            self.assertEqual(report["status"], "rebuilt")
            self.assertEqual(report["source_event_range"], f"1-{latest_event_seq}")
            self.assertEqual(report["replayed_event_count"], latest_event_seq)
            self.assertEqual(report["unknown_event_types"], [])
            self.assertEqual(PacketService(store).get_packet("pkt-001")["lifecycle_state"], "closed")
            self.assertEqual(RequirementRegistry(store).get_requirement("REQ-001")["packet_id"], "pkt-001")
            self.assertEqual(EvidenceService(store).get_evidence("ev-001")["result_status"], "passed")
            self.assertEqual(GateService(store).get_gate_result("gres-001")["status"], "pass")
            self.assertEqual(CloseoutService(store).get_closeout("co-001")["decision_status"], "closed")

    def test_replay_reports_unknown_event_types_without_silent_success(self):
        from standard_harness.state.replay import StateReplayService

        with tempfile.TemporaryDirectory() as tmp:
            from standard_harness.state.store import HarnessStore

            store = HarnessStore(Path(tmp))
            store.initialize()
            store.append_event(
                event_type="unexpected.future_event",
                actor_id="tester",
                actor_role="Tester",
                authority_basis="contract test",
                idempotency_key="unexpected-event",
                payload={"example": True},
            )

            report = StateReplayService(store).rebuild_materialized_state()

            self.assertEqual(report["status"], "blocked")
            self.assertEqual(report["unknown_event_types"], ["unexpected.future_event"])

    def test_compatibility_policy_rejects_unknown_major_schema(self):
        from standard_harness.state.compatibility import CompatibilityPolicy
        from standard_harness.state.migrations import schema_version

        policy = CompatibilityPolicy(current_schema_version=schema_version())

        self.assertEqual(policy.check_schema(schema_version())["status"], "compatible")
        self.assertEqual(policy.check_schema(f"{schema_version()}.1")["status"], "incompatible")
        self.assertEqual(policy.check_schema("99")["status"], "incompatible")
        self.assertEqual(policy.check_schema("not-a-number")["status"], "incompatible")
