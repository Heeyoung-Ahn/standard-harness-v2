import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ProjectCompletionGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_approved_requirement_with_no_supported_claim_blocks_completion(self):
        from standard_harness.completion.coverage import ProjectCompletionCoverage

        with tempfile.TemporaryDirectory() as tmp:
            store = _store_with_requirement(
                Path(tmp),
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
                completion_classification="implemented",
            )

            result = ProjectCompletionCoverage(store).evaluate(requirement_id="REQ-A")

            self.assertEqual(result["status"], "blocked")
            self.assertEqual(result["requirement_counts"]["unverified"], 1)
            self.assertIn(
                "missing_supported_claim",
                {item["error_code"] for item in result["diagnostics"]},
            )

    def test_deferred_requirement_requires_decision_record(self):
        from standard_harness.completion.coverage import ProjectCompletionCoverage

        with tempfile.TemporaryDirectory() as tmp:
            store = _store_with_requirement(
                Path(tmp),
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
                completion_classification="implemented",
            )
            with store.connection() as conn:
                conn.execute(
                    """
                    update requirements
                    set status = 'deferred', decision_record_id = null
                    where requirement_id = 'REQ-A'
                    """
                )
                conn.commit()

            result = ProjectCompletionCoverage(store).evaluate(requirement_id="REQ-A")

            self.assertEqual(result["status"], "blocked")
            self.assertEqual(result["requirement_counts"]["unverified"], 1)
            self.assertIn(
                "missing_decision_record",
                {item["error_code"] for item in result["diagnostics"]},
            )

    def test_closed_packet_with_supported_claim_passing_gate_and_closeout_counts_covered(self):
        from standard_harness.completion.coverage import ProjectCompletionCoverage

        with tempfile.TemporaryDirectory() as tmp:
            store = _store_with_requirement(
                Path(tmp),
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
                completion_classification="implemented",
            )
            _add_supported_claim_gate_and_closeout(
                store,
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
            )

            result = ProjectCompletionCoverage(store).evaluate(requirement_id="REQ-A")

            self.assertEqual(result["status"], "complete")
            self.assertEqual(result["requirement_counts"]["implemented"], 1)
            self.assertEqual(result["diagnostics"], [])

    def test_unverified_partial_and_missing_closeout_statuses_block_completion(self):
        from standard_harness.completion.coverage import ProjectCompletionCoverage

        with tempfile.TemporaryDirectory() as tmp:
            store = _store_with_requirement(
                Path(tmp),
                requirement_id="REQ-UNVERIFIED",
                packet_id="pkt-unverified",
                acceptance_id="ac-unverified",
                completion_classification="unverified",
            )
            _add_supported_claim_gate_and_closeout(
                store,
                requirement_id="REQ-UNVERIFIED",
                packet_id="pkt-unverified",
                acceptance_id="ac-unverified",
            )
            _create_requirement_in_existing_store(
                store,
                requirement_id="REQ-PARTIAL",
                packet_id="pkt-partial",
                acceptance_id="ac-partial",
                completion_classification="implemented",
            )
            _add_partial_claim(
                store,
                requirement_id="REQ-PARTIAL",
                packet_id="pkt-partial",
                acceptance_id="ac-partial",
            )
            _create_requirement_in_existing_store(
                store,
                requirement_id="REQ-NO-CLOSEOUT",
                packet_id="pkt-no-closeout",
                acceptance_id="ac-no-closeout",
                completion_classification="implemented",
            )
            _add_supported_claim_and_gate(
                store,
                requirement_id="REQ-NO-CLOSEOUT",
                packet_id="pkt-no-closeout",
                acceptance_id="ac-no-closeout",
            )

            result = ProjectCompletionCoverage(store).evaluate(all_requirements=True)

            self.assertEqual(result["status"], "blocked")
            self.assertEqual(result["requirement_counts"]["unverified"], 3)
            self.assertEqual(
                {
                    "unverified_completion_classification",
                    "partial_implementation",
                    "missing_closeout",
                },
                {
                    item["error_code"]
                    for item in result["diagnostics"]
                    if item["requirement_id"]
                    in {"REQ-UNVERIFIED", "REQ-PARTIAL", "REQ-NO-CLOSEOUT"}
                },
            )

    def test_empty_requirement_registry_unknown_classification_and_stale_closeout_block(self):
        from standard_harness.completion.coverage import ProjectCompletionCoverage
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.gates import GateService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            empty_store = HarnessStore(Path(tmp))
            empty_store.initialize()
            empty_result = ProjectCompletionCoverage(empty_store).evaluate(all_requirements=True)

            self.assertEqual(empty_result["status"], "blocked")
            self.assertIn(
                "missing_requirements",
                {item["error_code"] for item in empty_result["diagnostics"]},
            )

        with tempfile.TemporaryDirectory() as tmp:
            unknown_store = _store_with_requirement(
                Path(tmp),
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
                completion_classification="typo-class",
            )
            _add_supported_claim_gate_and_closeout(
                unknown_store,
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
            )

            unknown_result = ProjectCompletionCoverage(unknown_store).evaluate(
                requirement_id="REQ-A"
            )

            self.assertEqual(unknown_result["status"], "blocked")
            self.assertIn(
                "unknown_completion_classification",
                {item["error_code"] for item in unknown_result["diagnostics"]},
            )

        with tempfile.TemporaryDirectory() as tmp:
            stale_store = _store_with_requirement(
                Path(tmp),
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
                completion_classification="implemented",
            )
            _add_supported_claim_gate_and_closeout(
                stale_store,
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
            )
            EvidenceService(stale_store).register_evidence(
                evidence_id="ev-new",
                packet_id="pkt-a",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="unittest",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="tests/contract/test_project_completion_gate.py",
                content="new evidence after closeout",
                result_status="passed",
                rationale="post closeout evidence",
                idempotency_key="evidence-new",
            )
            EvidenceService(stale_store).record_claim(
                claim_id="claim-new",
                packet_id="pkt-a",
                requirement_id="REQ-A",
                acceptance_criterion_id="ac-a",
                evidence_ids=["ev-new"],
                support_status="supported",
                idempotency_key="claim-new",
            )
            GateService(stale_store).record_gate_result(
                gate_result_id="gres-new",
                gate_id="gate-pkt-a",
                packet_id="pkt-a",
                checked_claim_ids=["claim-pkt-a", "claim-new"],
                evidence_ids=["ev-pkt-a", "ev-new"],
                status="pass",
                requirement_level="hard",
                rationale="new support recorded after closeout",
                idempotency_key="gate-result-new",
            )

            stale_result = ProjectCompletionCoverage(stale_store).evaluate(
                requirement_id="REQ-A"
            )

            self.assertEqual(stale_result["status"], "blocked")
            self.assertIn(
                "stale_closeout",
                {item["error_code"] for item in stale_result["diagnostics"]},
            )

    def test_final_gate_result_is_event_backed_replayable_and_auditable(self):
        from standard_harness.completion.final_gate import ProjectCompletionGateService
        from standard_harness.state.audit import PointInTimeAudit
        from standard_harness.state.replay import StateReplayService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store_with_requirement(
                Path(tmp),
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
                completion_classification="implemented",
            )
            _add_supported_claim_gate_and_closeout(
                store,
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
            )
            result = ProjectCompletionGateService(store).record_result(
                completion_result_id="pcg-001",
                all_requirements=True,
                idempotency_key="pcg-001",
            )
            result_seq = store.latest_event_seq()
            snapshot = PointInTimeAudit(store).snapshot_at(event_seq=result_seq)
            with store.connection() as conn:
                conn.execute("delete from project_completion_results")
                conn.commit()

            replay = StateReplayService(store).rebuild_materialized_state(
                through_event_seq=result_seq
            )
            replayed = ProjectCompletionGateService(store).get_result("pcg-001")

            self.assertEqual(result["status"], "complete")
            self.assertEqual(replay["status"], "rebuilt")
            self.assertEqual(replayed["status"], "complete")
            self.assertEqual(
                snapshot["project_completion_results"]["pcg-001"]["status"],
                "complete",
            )

    def test_final_gate_result_idempotency_duplicate_identity_and_atomicity(self):
        from standard_harness.completion.final_gate import ProjectCompletionGateService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store_with_requirement(
                Path(tmp),
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
                completion_classification="implemented",
            )
            _add_supported_claim_gate_and_closeout(
                store,
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
            )
            service = ProjectCompletionGateService(store)
            service.record_result(
                completion_result_id="pcg-001",
                all_requirements=True,
                idempotency_key="pcg-001",
            )
            repeated = service.record_result(
                completion_result_id="ignored-pcg",
                all_requirements=True,
                idempotency_key="pcg-001",
            )
            event_seq = store.latest_event_seq()

            with self.assertRaises(ValueError):
                service.record_result(
                    completion_result_id="pcg-001",
                    all_requirements=True,
                    idempotency_key="pcg-001-duplicate",
                )

            self.assertEqual(repeated["completion_result_id"], "pcg-001")
            self.assertEqual(store.latest_event_seq(), event_seq)

        with tempfile.TemporaryDirectory() as tmp:
            store = _store_with_requirement(
                Path(tmp),
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
                completion_classification="implemented",
            )
            _add_supported_claim_gate_and_closeout(
                store,
                requirement_id="REQ-A",
                packet_id="pkt-a",
                acceptance_id="ac-a",
            )
            with store.connection() as conn:
                conn.execute(
                    """
                    create trigger abort_project_completion_results
                    before insert on project_completion_results
                    begin
                      select raise(abort, 'blocked project completion insert');
                    end
                    """
                )
                conn.commit()

            before_event_seq = store.latest_event_seq()
            with self.assertRaises(Exception):
                ProjectCompletionGateService(store).record_result(
                    completion_result_id="pcg-001",
                    all_requirements=True,
                    idempotency_key="pcg-001",
                )

            self.assertEqual(store.latest_event_seq(), before_event_seq)


def _store_with_requirement(
    root: Path,
    *,
    requirement_id: str,
    packet_id: str,
    acceptance_id: str,
    completion_classification: str,
):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    _create_requirement_in_existing_store(
        store,
        requirement_id=requirement_id,
        packet_id=packet_id,
        acceptance_id=acceptance_id,
        completion_classification=completion_classification,
    )
    return store


def _create_requirement_in_existing_store(
    store,
    *,
    requirement_id: str,
    packet_id: str,
    acceptance_id: str,
    completion_classification: str,
) -> None:
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry

    PacketService(store).create_packet(
        packet_id=packet_id,
        title=f"Packet {packet_id}",
        objective=f"Complete {requirement_id}.",
        risk_class="low",
        scope_summary="Completion fixture.",
        out_of_scope_summary="No external systems.",
        change_zones=["src/"],
        acceptance_criteria_ids=[acceptance_id],
        evidence_requirements=["unit-test"],
        closeout_criteria=["supported-claim", "passing-gate"],
        owner="human-owner",
        idempotency_key=f"packet-create-{packet_id}",
    )
    PacketService(store).approve_packet(
        packet_id=packet_id,
        approver_id="owner-1",
        approver_role="Human Owner",
        authority_basis="explicit approval",
        approved_scope="completion fixture",
        rationale="completion setup",
        idempotency_key=f"approve-{packet_id}",
    )
    registry = RequirementRegistry(store)
    registry.register_requirement(
        requirement_id=requirement_id,
        version="1",
        source_doc="docs/requirements/example.md",
        status="approved",
        classification="Core",
        risk_classification="low",
        acceptance_criteria=[acceptance_id],
        completion_classification=completion_classification,
        packet_id=packet_id,
        idempotency_key=f"requirement-{requirement_id}",
    )
    registry.register_acceptance_criterion(
        acceptance_criterion_id=acceptance_id,
        requirement_id=requirement_id,
        packet_id=packet_id,
        description=f"Acceptance for {requirement_id}.",
        status="approved",
        idempotency_key=f"acceptance-{acceptance_id}",
    )


def _add_supported_claim_gate_and_closeout(
    store,
    *,
    requirement_id: str,
    packet_id: str,
    acceptance_id: str,
) -> None:
    from standard_harness.domain.closeout import CloseoutService

    _add_supported_claim_and_gate(
        store,
        requirement_id=requirement_id,
        packet_id=packet_id,
        acceptance_id=acceptance_id,
    )
    CloseoutService(store).close_packet(
        closeout_id=f"co-{packet_id}",
        packet_id=packet_id,
        authority_basis="project completion fixture",
        rationale="Fixture is supported.",
        idempotency_key=f"closeout-{packet_id}",
    )


def _add_supported_claim_and_gate(
    store,
    *,
    requirement_id: str,
    packet_id: str,
    acceptance_id: str,
) -> None:
    from standard_harness.domain.evidence import EvidenceService
    from standard_harness.domain.gates import GateService

    evidence_id = f"ev-{packet_id}"
    claim_id = f"claim-{packet_id}"
    gate_id = f"gate-{packet_id}"
    EvidenceService(store).register_evidence(
        evidence_id=evidence_id,
        packet_id=packet_id,
        claim_id=None,
        command_or_tool="python -m unittest",
        runner="unittest",
        cwd_or_execution_context=str(ROOT),
        environment_fingerprint="python-test",
        artifact_path="tests/contract/test_project_completion_gate.py",
        content=f"evidence for {requirement_id}",
        result_status="passed",
        rationale="completion fixture evidence",
        idempotency_key=f"evidence-{packet_id}",
    )
    EvidenceService(store).record_claim(
        claim_id=claim_id,
        packet_id=packet_id,
        requirement_id=requirement_id,
        acceptance_criterion_id=acceptance_id,
        evidence_ids=[evidence_id],
        support_status="supported",
        idempotency_key=f"claim-{packet_id}",
    )
    gates = GateService(store)
    gates.declare_gate(
        gate_id=gate_id,
        packet_id=packet_id,
        gate_type="evidence",
        requirement_level="hard",
        declared_by_source="packet",
        idempotency_key=f"gate-declare-{packet_id}",
    )
    gates.activate_gate(
        gate_activation_id=f"gact-{packet_id}",
        gate_id=gate_id,
        packet_id=packet_id,
        idempotency_key=f"gate-activate-{packet_id}",
    )
    gates.record_gate_result(
        gate_result_id=f"gres-{packet_id}",
        gate_id=gate_id,
        packet_id=packet_id,
        checked_claim_ids=[claim_id],
        evidence_ids=[evidence_id],
        status="pass",
        requirement_level="hard",
        rationale="supported by passed evidence",
        idempotency_key=f"gate-result-{packet_id}",
    )


def _add_partial_claim(
    store,
    *,
    requirement_id: str,
    packet_id: str,
    acceptance_id: str,
) -> None:
    from standard_harness.domain.evidence import EvidenceService

    evidence_id = f"ev-{packet_id}"
    EvidenceService(store).register_evidence(
        evidence_id=evidence_id,
        packet_id=packet_id,
        claim_id=None,
        command_or_tool="python -m unittest",
        runner="unittest",
        cwd_or_execution_context=str(ROOT),
        environment_fingerprint="python-test",
        artifact_path="tests/contract/test_project_completion_gate.py",
        content=f"partial evidence for {requirement_id}",
        result_status="passed",
        rationale="partial completion fixture evidence",
        idempotency_key=f"evidence-{packet_id}",
    )
    EvidenceService(store).record_claim(
        claim_id=f"claim-{packet_id}",
        packet_id=packet_id,
        requirement_id=requirement_id,
        acceptance_criterion_id=acceptance_id,
        evidence_ids=[evidence_id],
        support_status="partial",
        idempotency_key=f"claim-{packet_id}",
    )


if __name__ == "__main__":
    unittest.main()
