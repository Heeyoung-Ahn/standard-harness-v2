import sys
import tempfile
import unittest
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class StateRecoveryProtocolTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_recovery_detects_missing_materialized_rows_and_rebuilds(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.recovery import RecoveryService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Recovery packet",
                objective="Recover materialized packet row.",
                risk_class="low",
                scope_summary="State recovery.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["recovery-report"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            source_watermark = store.latest_event_seq()
            with store.connection() as conn:
                conn.execute("delete from packets where packet_id = ?", ("pkt-001",))
                conn.commit()

            report = RecoveryService(store).recover_materialized_state(reason="contract-test")

            self.assertEqual(report["recovery_status"], "rebuilt")
            self.assertEqual(report["source_event_range"], f"1-{source_watermark}")
            self.assertTrue(report["projection_checksum"])
            self.assertIn("packets", report["rebuilt_tables"])
            self.assertEqual(PacketService(store).get_packet("pkt-001")["packet_id"], "pkt-001")

            with store.connection() as conn:
                recovery_row = conn.execute(
                    "select * from recovery_runs where recovery_id = ?",
                    (report["recovery_id"],),
                ).fetchone()
                event_types = [
                    row["event_type"]
                    for row in conn.execute(
                        """
                        select event_type from events
                        where event_type in ('recovery_started', 'projection_rebuilt', 'recovery_blocked')
                        order by event_seq
                        """
                    ).fetchall()
                ]
            self.assertIsNotNone(recovery_row)
            self.assertEqual(recovery_row["recovery_status"], "rebuilt")
            self.assertEqual(event_types, ["recovery_started", "projection_rebuilt"])

    def test_public_packet_create_rolls_back_event_when_materialization_fails(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            with store.connection() as conn:
                conn.execute(
                    """
                    create trigger abort_packet_insert
                    before insert on packets
                    begin
                      select raise(abort, 'forced packet materialization failure');
                    end
                    """
                )
                conn.commit()

            with self.assertRaises(sqlite3.DatabaseError):
                PacketService(store).create_packet(
                    packet_id="pkt-atomic",
                    title="Atomic packet",
                    objective="Prove append and materialization rollback together.",
                    risk_class="low",
                    scope_summary="Atomic state change.",
                    out_of_scope_summary="No external services.",
                    change_zones=["src/standard_harness/state/"],
                    acceptance_criteria_ids=["ac-atomic"],
                    evidence_requirements=["unit-test"],
                    closeout_criteria=["atomic-rollback"],
                    owner="human-owner",
                    idempotency_key="packet-create-atomic",
                )

            self.assertEqual(store.latest_event_seq(), 0)
            with store.connection() as conn:
                packet_row = conn.execute(
                    "select 1 from packets where packet_id = ?", ("pkt-atomic",)
                ).fetchone()
            self.assertIsNone(packet_row)

    def test_packet_mutator_idempotency_does_not_create_untraced_materialized_state(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            packets = PacketService(store)
            packets.create_packet(
                packet_id="pkt-001",
                title="Idempotent packet",
                objective="Preserve event/materialized consistency.",
                risk_class="low",
                scope_summary="Idempotency.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["idempotent"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            first = packets.approve_packet(
                packet_id="pkt-001",
                approver_id="owner-1",
                approver_role="Human Owner",
                authority_basis="explicit approval",
                approved_scope="initial approval",
                rationale="first",
                idempotency_key="approve-pkt-001",
            )
            second = packets.approve_packet(
                packet_id="pkt-001",
                approver_id="owner-2",
                approver_role="Human Owner",
                authority_basis="explicit approval",
                approved_scope="duplicate approval should be ignored",
                rationale="second",
                idempotency_key="approve-pkt-001",
            )
            packet = packets.get_packet("pkt-001")

            self.assertEqual(first["approval_record_id"], second["approval_record_id"])
            self.assertEqual(packet["approval_record_id"], first["approval_record_id"])
            with store.connection() as conn:
                approval_count = conn.execute(
                    "select count(*) as count from approval_records"
                ).fetchone()["count"]
            self.assertEqual(approval_count, 1)

    def test_packet_transition_idempotency_does_not_reapply_different_state(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            packets = PacketService(store)
            packets.create_packet(
                packet_id="pkt-001",
                title="Transition idempotency packet",
                objective="Preserve transition event/materialized consistency.",
                risk_class="low",
                scope_summary="Idempotency.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["idempotent"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
                approval_required=False,
            )
            first = packets.transition_packet(
                packet_id="pkt-001",
                lifecycle_state="in_progress",
                actor_id="dev-1",
                actor_role="Developer",
                authority_basis="packet work",
                idempotency_key="transition-pkt-001",
            )
            second = packets.transition_packet(
                packet_id="pkt-001",
                lifecycle_state="blocked",
                actor_id="dev-1",
                actor_role="Developer",
                authority_basis="packet work",
                idempotency_key="transition-pkt-001",
            )

            self.assertEqual(first["lifecycle_state"], "in_progress")
            self.assertEqual(second["lifecycle_state"], "in_progress")
            self.assertEqual(packets.get_packet("pkt-001")["lifecycle_state"], "in_progress")
            self.assertEqual(store.latest_event_seq(), 2)

    def test_recovery_blocks_unknown_event_types_with_diagnostics(self):
        from standard_harness.state.recovery import RecoveryService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            store.append_event(
                event_type="future.unknown",
                actor_id="tester",
                actor_role="Tester",
                authority_basis="contract test",
                idempotency_key="future-unknown",
                payload={"example": True},
            )

            report = RecoveryService(store).recover_materialized_state(reason="contract-test")

            self.assertEqual(report["recovery_status"], "blocked")
            self.assertIn("unknown_event_type:future.unknown", report["diagnostic_ids"])
            with store.connection() as conn:
                event_types = [
                    row["event_type"]
                    for row in conn.execute(
                        """
                        select event_type from events
                        where event_type in ('recovery_started', 'projection_rebuilt', 'recovery_blocked')
                        order by event_seq
                        """
                    ).fetchall()
                ]
            self.assertEqual(event_types, ["recovery_started", "recovery_blocked"])

    def test_stale_projection_blocks_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.gates import GateService
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.projection.current_context import CurrentContextProjection
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            packets = PacketService(store)
            packets.create_packet(
                packet_id="pkt-001",
                title="Stale projection packet",
                objective="Block closeout when current context is stale.",
                risk_class="low",
                scope_summary="Projection freshness.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["fresh-projection"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            CurrentContextProjection(store).generate(packet_id="pkt-001")
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
                description="Projection freshness is checked.",
                status="proposed",
                idempotency_key="acceptance-ac-001",
            )
            evidence = EvidenceService(store)
            evidence.register_evidence(
                evidence_id="ev-001",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="unittest",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="tests/contract/test_state_recovery_protocol.py",
                content="passed",
                result_status="passed",
                rationale="Projection freshness fixture evidence",
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

            closeout = CloseoutService(store).close_packet(
                closeout_id="co-001",
                packet_id="pkt-001",
                authority_basis="FP-01 closeout",
                rationale="Should block on stale projection.",
                idempotency_key="closeout-001",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("stale_projection", closeout["diagnostic_ids"])
