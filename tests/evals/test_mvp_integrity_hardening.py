import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class MvpIntegrityHardeningTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def _create_packet(self, store, packet_id="pkt-001", acceptance_ids=None):
        from standard_harness.domain.packets import PacketService

        PacketService(store).create_packet(
            packet_id=packet_id,
            title=f"Packet {packet_id}",
            objective="Verify MVP integrity hardening.",
            risk_class="low",
            scope_summary="Integrity test scope.",
            out_of_scope_summary="No final-product capabilities.",
            change_zones=["src/"],
            acceptance_criteria_ids=acceptance_ids or ["ac-001"],
            evidence_requirements=["unit-test"],
            closeout_criteria=["supported claim", "passing gate"],
            owner="human-owner",
            idempotency_key=f"packet-create-{packet_id}",
        )

    def _approve_packet(self, store, packet_id="pkt-001"):
        from standard_harness.domain.packets import PacketService

        PacketService(store).approve_packet(
            packet_id=packet_id,
            approver_id="owner-1",
            approver_role="Human Owner",
            authority_basis="explicit approval",
            approved_scope="low-risk integrity packet",
            rationale="KFIX integrity test",
            idempotency_key=f"approve-{packet_id}",
        )

    def _register_requirement_and_acceptance(self, store, packet_id, requirement_id, acceptance_id):
        from standard_harness.domain.requirements import RequirementRegistry

        registry = RequirementRegistry(store)
        registry.register_requirement(
            requirement_id=requirement_id,
            version="1",
            source_doc="docs/requirements/example.md",
            status="approved",
            classification="Core",
            risk_classification="low",
            acceptance_criteria=[acceptance_id],
            completion_classification="unverified",
            packet_id=packet_id,
            idempotency_key=f"requirement-{requirement_id}",
        )
        registry.register_acceptance_criterion(
            acceptance_criterion_id=acceptance_id,
            requirement_id=requirement_id,
            packet_id=packet_id,
            description=f"Acceptance {acceptance_id} is satisfied.",
            status="proposed",
            idempotency_key=f"acceptance-{acceptance_id}",
        )

    def _register_passed_evidence(self, store, packet_id, evidence_id):
        from standard_harness.domain.evidence import EvidenceService

        EvidenceService(store).register_evidence(
            evidence_id=evidence_id,
            packet_id=packet_id,
            claim_id=None,
            command_or_tool="python -m unittest",
            runner="unittest",
            cwd_or_execution_context=str(ROOT),
            environment_fingerprint="python-test",
            artifact_path="tests/evals/test_mvp_integrity_hardening.py",
            content=f"passed output for {evidence_id}",
            result_status="passed",
            rationale="KFIX evidence",
            idempotency_key=f"evidence-{evidence_id}",
        )

    def _record_supported_claim(self, store, packet_id, claim_id, requirement_id, acceptance_id, evidence_id):
        from standard_harness.domain.evidence import EvidenceService

        EvidenceService(store).record_claim(
            claim_id=claim_id,
            packet_id=packet_id,
            requirement_id=requirement_id,
            acceptance_criterion_id=acceptance_id,
            evidence_ids=[evidence_id],
            support_status="supported",
            idempotency_key=f"claim-{claim_id}",
        )

    def _activate_gate(self, store, packet_id="pkt-001"):
        from standard_harness.domain.gates import GateService

        gates = GateService(store)
        gates.declare_gate(
            gate_id=f"gate-{packet_id}",
            packet_id=packet_id,
            gate_type="evidence",
            requirement_level="hard",
            declared_by_source="packet",
            idempotency_key=f"gate-declare-{packet_id}",
        )
        gates.activate_gate(
            gate_activation_id=f"gact-{packet_id}",
            gate_id=f"gate-{packet_id}",
            packet_id=packet_id,
            idempotency_key=f"gate-activate-{packet_id}",
        )
        return gates

    def test_closeout_blocks_when_any_acceptance_criterion_has_no_supported_claim(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            self._create_packet(store, acceptance_ids=["ac-001", "ac-002"])
            self._approve_packet(store)
            self._register_requirement_and_acceptance(store, "pkt-001", "REQ-001", "ac-001")
            self._register_passed_evidence(store, "pkt-001", "ev-001")
            self._record_supported_claim(store, "pkt-001", "claim-001", "REQ-001", "ac-001", "ev-001")
            gates = self._activate_gate(store)
            gates.record_gate_result(
                gate_result_id="gres-001",
                gate_id="gate-pkt-001",
                packet_id="pkt-001",
                checked_claim_ids=["claim-001"],
                evidence_ids=["ev-001"],
                status="pass",
                requirement_level="hard",
                rationale="only one acceptance criterion is covered",
                idempotency_key="gate-result-001",
            )

            closeout = CloseoutService(store).close_packet(
                closeout_id="co-001",
                packet_id="pkt-001",
                authority_basis="MVP closeout",
                rationale="Attempt partial closeout.",
                idempotency_key="closeout-001",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("missing_supported_claim", closeout["diagnostic_ids"])

    def test_gate_pass_rejects_evidence_not_linked_to_checked_claim(self):
        from standard_harness.domain.gates import GateService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            self._create_packet(store)
            self._register_requirement_and_acceptance(store, "pkt-001", "REQ-001", "ac-001")
            self._register_passed_evidence(store, "pkt-001", "ev-001")
            self._register_passed_evidence(store, "pkt-001", "ev-002")
            self._record_supported_claim(store, "pkt-001", "claim-001", "REQ-001", "ac-001", "ev-001")
            self._activate_gate(store)

            with self.assertRaises(ValueError):
                GateService(store).record_gate_result(
                    gate_result_id="gres-001",
                    gate_id="gate-pkt-001",
                    packet_id="pkt-001",
                    checked_claim_ids=["claim-001"],
                    evidence_ids=["ev-002"],
                    status="pass",
                    requirement_level="hard",
                    rationale="unlinked evidence",
                    idempotency_key="gate-result-001",
                )

    def test_gate_pass_requires_linked_evidence_for_each_checked_claim(self):
        from standard_harness.domain.gates import GateService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            self._create_packet(store, acceptance_ids=["ac-001", "ac-002"])
            self._register_requirement_and_acceptance(store, "pkt-001", "REQ-001", "ac-001")
            self._register_requirement_and_acceptance(store, "pkt-001", "REQ-002", "ac-002")
            self._register_passed_evidence(store, "pkt-001", "ev-001")
            self._register_passed_evidence(store, "pkt-001", "ev-002")
            self._record_supported_claim(store, "pkt-001", "claim-001", "REQ-001", "ac-001", "ev-001")
            self._record_supported_claim(store, "pkt-001", "claim-002", "REQ-002", "ac-002", "ev-002")
            self._activate_gate(store)

            with self.assertRaises(ValueError):
                GateService(store).record_gate_result(
                    gate_result_id="gres-001",
                    gate_id="gate-pkt-001",
                    packet_id="pkt-001",
                    checked_claim_ids=["claim-001", "claim-002"],
                    evidence_ids=["ev-001"],
                    status="pass",
                    requirement_level="hard",
                    rationale="second claim has no linked gate evidence",
                    idempotency_key="gate-result-001",
                )

    def test_duplicate_packet_id_with_new_idempotency_key_is_rejected_without_event(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            self._create_packet(store, packet_id="pkt-001")
            latest = store.latest_event_seq()

            with self.assertRaises(ValueError):
                PacketService(store).create_packet(
                    packet_id="pkt-001",
                    title="Duplicate packet",
                    objective="Must be rejected before event append.",
                    risk_class="low",
                    scope_summary="Duplicate.",
                    out_of_scope_summary="No changes.",
                    change_zones=["src/"],
                    acceptance_criteria_ids=["ac-001"],
                    evidence_requirements=["unit-test"],
                    closeout_criteria=["supported claim"],
                    owner="human-owner",
                    idempotency_key="packet-create-pkt-001-new",
                )

            self.assertEqual(store.latest_event_seq(), latest)

    def test_append_event_rejects_stale_expected_state_version(self):
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()

            with self.assertRaises(ValueError):
                store.append_event(
                    event_type="test.event",
                    actor_id="tester",
                    actor_role="Tester",
                    authority_basis="contract-test",
                    idempotency_key="stale-write",
                    payload={"value": 1},
                    expected_state_version=999,
                )

            self.assertEqual(store.latest_event_seq(), 0)

    def test_registry_rejects_unknown_and_cross_packet_references(self):
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            registry = RequirementRegistry(store)

            with self.assertRaises(ValueError):
                registry.register_requirement(
                    requirement_id="REQ-UNKNOWN",
                    version="1",
                    source_doc="docs/requirements/example.md",
                    status="approved",
                    classification="Core",
                    risk_classification="low",
                    acceptance_criteria=["ac-001"],
                    completion_classification="unverified",
                    packet_id="pkt-missing",
                    idempotency_key="requirement-unknown",
                )

            self._create_packet(store, "pkt-001", ["ac-001"])
            self._create_packet(store, "pkt-002", ["ac-002"])
            self._register_requirement_and_acceptance(store, "pkt-001", "REQ-001", "ac-001")

            with self.assertRaises(ValueError):
                registry.register_acceptance_criterion(
                    acceptance_criterion_id="ac-002",
                    requirement_id="REQ-MISSING",
                    packet_id="pkt-001",
                    description="Unknown requirement.",
                    status="proposed",
                    idempotency_key="acceptance-missing-req",
                )

            with self.assertRaises(ValueError):
                registry.register_acceptance_criterion(
                    acceptance_criterion_id="ac-002",
                    requirement_id="REQ-001",
                    packet_id="pkt-002",
                    description="Cross-packet requirement.",
                    status="proposed",
                    idempotency_key="acceptance-cross-packet",
                )

            self._register_requirement_and_acceptance(store, "pkt-002", "REQ-002", "ac-002")
            self._register_passed_evidence(store, "pkt-002", "ev-002")
            with self.assertRaises(ValueError):
                EvidenceService(store).record_claim(
                    claim_id="claim-cross",
                    packet_id="pkt-001",
                    requirement_id="REQ-001",
                    acceptance_criterion_id="ac-001",
                    evidence_ids=["ev-002"],
                    support_status="supported",
                    idempotency_key="claim-cross",
                )

    def test_readiness_blocks_when_packet_acceptance_ids_are_not_registered(self):
        from standard_harness.state.store import HarnessStore
        from standard_harness.validation.readiness import ReadinessService

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            self._create_packet(store, acceptance_ids=["ac-001"])
            self._approve_packet(store)

            readiness = ReadinessService(store).check_packet("pkt-001")

            self.assertEqual(readiness["status"], "blocked")
            self.assertIn(
                "unregistered_acceptance_criterion",
                {diagnostic["error_code"] for diagnostic in readiness["diagnostics"]},
            )


if __name__ == "__main__":
    unittest.main()
