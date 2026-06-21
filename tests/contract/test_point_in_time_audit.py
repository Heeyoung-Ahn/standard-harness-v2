import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class PointInTimeAuditTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_snapshot_reconstructs_state_at_event_sequence(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.gates import GateService
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.audit import PointInTimeAudit
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            packets = PacketService(store)
            packets.create_packet(
                packet_id="pkt-001",
                title="Audit packet",
                objective="Audit point-in-time state.",
                risk_class="low",
                scope_summary="Audit state.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["snapshot"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            packet_seq = store.latest_event_seq()
            packets.approve_packet(
                packet_id="pkt-001",
                approver_id="owner-1",
                approver_role="Human Owner",
                authority_basis="explicit approval",
                approved_scope="audit test",
                rationale="Approve after first snapshot point",
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
                description="Audit reconstructs closeout evidence chain.",
                status="proposed",
                idempotency_key="acceptance-ac-001",
            )
            evidence = EvidenceService(store)
            evidence.register_evidence(
                evidence_id="ev-001",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest tests.contract.test_point_in_time_audit",
                runner="unittest",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="tests/contract/test_point_in_time_audit.py",
                content="passed",
                result_status="passed",
                rationale="Audit fixture evidence",
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
                checked_claim_ids=["claim-001"],
                evidence_ids=["ev-001"],
                status="pass",
                requirement_level="hard",
                rationale="supported by passed evidence",
                packet_id="pkt-001",
                idempotency_key="gate-result-001",
            )
            CloseoutService(store).close_packet(
                closeout_id="co-001",
                packet_id="pkt-001",
                authority_basis="FP-01 audit closeout",
                rationale="All audit fixture evidence is present.",
                idempotency_key="closeout-001",
            )
            closeout_seq = store.latest_event_seq()

            first_snapshot = PointInTimeAudit(store).snapshot_at(event_seq=packet_seq)
            later_snapshot = PointInTimeAudit(store).snapshot_at(event_seq=closeout_seq)

            self.assertEqual(first_snapshot["source_event_range"], f"1-{packet_seq}")
            self.assertEqual(first_snapshot["packets"]["pkt-001"]["approval_state"], "pending")
            self.assertNotIn("REQ-001", first_snapshot["requirements"])
            self.assertEqual(later_snapshot["packets"]["pkt-001"]["approval_state"], "approved")
            self.assertIn("REQ-001", later_snapshot["requirements"])
            self.assertIn("ac-001", later_snapshot["acceptance_criteria"])
            self.assertIn("ev-001", later_snapshot["evidence"])
            self.assertIn("claim-001", later_snapshot["claims"])
            self.assertIn("gate-001", later_snapshot["gate_declarations"])
            self.assertIn("gact-001", later_snapshot["gate_activations"])
            self.assertIn("gres-001", later_snapshot["gate_results"])
            self.assertIn("co-001", later_snapshot["closeouts"])
            self.assertTrue(later_snapshot["snapshot_id"].startswith("audit_"))
            self.assertTrue(later_snapshot["restore_checksum"])

            with store.connection() as conn:
                row = conn.execute(
                    "select * from audit_snapshots where snapshot_id = ?",
                    (later_snapshot["snapshot_id"],),
                ).fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["event_seq_range"], f"1-{closeout_seq}")
