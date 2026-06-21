import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class PolicyBundleProfileTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_policy_bundle_version_is_recorded_in_readiness_and_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.policy.bundles import PolicyBundleService
        from standard_harness.validation.readiness import ReadinessService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_ready_packet(store)
            PolicyBundleService(store).register_bundle(
                policy_bundle_id="bundle-2026-06",
                version="2026.06",
                risk_taxonomy_version="risk-v1",
                gate_policy_version="gate-v1",
                validator_policy_version="validator-v1",
                skill_policy_version="skill-v1",
                adapter_policy_version="adapter-v1",
                security_data_policy_version="security-v1",
                compatibility_status="compatible",
                idempotency_key="bundle-2026-06",
            )

            readiness = ReadinessService(store).check_packet("pkt-001")
            closeout = CloseoutService(store).close_packet(
                closeout_id="close-policy",
                packet_id="pkt-001",
                authority_basis="policy bundle closeout",
                rationale="policy bundle version must be traceable",
                idempotency_key="close-policy",
            )

            self.assertEqual(readiness["policy_bundle_version"], "2026.06")
            self.assertEqual(closeout["policy_bundle_version"], "2026.06")

    def test_default_policy_bundle_version_is_recorded_when_no_bundle_is_registered(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.validation.readiness import ReadinessService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_ready_packet(store)

            readiness = ReadinessService(store).check_packet("pkt-001")
            closeout = CloseoutService(store).close_packet(
                closeout_id="close-default-policy",
                packet_id="pkt-001",
                authority_basis="default policy bundle",
                rationale="closeout records built-in policy version when none registered",
                idempotency_key="close-default-policy",
            )

            self.assertEqual(readiness["status"], "ready")
            self.assertEqual(readiness["policy_bundle_version"], "builtin-base-v1")
            self.assertEqual(closeout["decision_status"], "closed")
            self.assertEqual(closeout["policy_bundle_version"], "builtin-base-v1")

    def test_profile_conflict_detection_blocks_incompatible_active_profiles(self):
        from standard_harness.policy.profiles import ProfileService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            profiles = ProfileService(store)
            profiles.activate_profile(
                activation_id="profile-public",
                profile_id="public-release",
                idempotency_key="profile-public",
            )

            result = profiles.activate_profile(
                activation_id="profile-internal",
                profile_id="internal-only",
                idempotency_key="profile-internal",
            )

            self.assertEqual(result["status"], "blocked")
            self.assertIn("profile_conflict", result["diagnostic_ids"])

    def test_active_finance_profile_blocks_closeout_without_required_human_approval(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.policy.bundles import PolicyBundleService
        from standard_harness.policy.profiles import ProfileService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_ready_packet(store)
            _register_policy_bundle(store)
            ProfileService(store).activate_profile(
                activation_id="profile-finance",
                profile_id="finance",
                idempotency_key="profile-finance",
            )

            closeout = CloseoutService(store).close_packet(
                closeout_id="close-finance",
                packet_id="pkt-001",
                authority_basis="finance profile closeout",
                rationale="finance profile requires human approval",
                idempotency_key="close-finance",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("profile_human_approval_required", closeout["diagnostic_ids"])

    def test_finance_profile_does_not_accept_human_approval_from_another_packet(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.packets import PacketService
        from standard_harness.policy.profiles import ProfileService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_ready_packet(store)
            _register_policy_bundle(store)
            PacketService(store).create_packet(
                packet_id="pkt-other",
                title="Other packet",
                objective="Hold unrelated approval.",
                risk_class="low",
                scope_summary="Other scope.",
                out_of_scope_summary="No relation.",
                change_zones=["other/"],
                acceptance_criteria_ids=["ac-other"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["passing-gate"],
                owner="owner",
                idempotency_key="packet-create-other",
            )
            PacketService(store).approve_packet(
                packet_id="pkt-other",
                approver_id="human-owner",
                approver_role="Human Owner",
                authority_basis="explicit approval",
                approved_scope="other packet only",
                rationale="unrelated approval",
                idempotency_key="approve-other",
            )
            ProfileService(store).activate_profile(
                activation_id="profile-finance",
                profile_id="finance",
                idempotency_key="profile-finance",
            )

            closeout = CloseoutService(store).close_packet(
                closeout_id="close-finance-other-approval",
                packet_id="pkt-001",
                authority_basis="finance profile closeout",
                rationale="unrelated human approval must not satisfy profile",
                idempotency_key="close-finance-other-approval",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("profile_human_approval_required", closeout["diagnostic_ids"])


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_ready_packet(store):
    from standard_harness.domain.evidence import EvidenceService
    from standard_harness.domain.gates import GateService
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry

    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Policy bundle packet",
        objective="Exercise policy bundle traceability.",
        risk_class="low",
        scope_summary="Policy trace.",
        out_of_scope_summary="No external adapter.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["passing-gate"],
        owner="owner",
        approval_required=False,
        idempotency_key="packet-create-pkt-001",
    )
    registry = RequirementRegistry(store)
    registry.register_requirement(
        requirement_id="REQ-001",
        version="1",
        source_doc="docs/requirements/policy.md",
        status="approved",
        classification="Core",
        risk_classification="low",
        acceptance_criteria=["ac-001"],
        completion_classification="evidence-required",
        packet_id="pkt-001",
        idempotency_key="requirement-REQ-001",
    )
    registry.register_acceptance_criterion(
        acceptance_criterion_id="ac-001",
        requirement_id="REQ-001",
        packet_id="pkt-001",
        description="Policy bundle is traceable.",
        status="approved",
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
        environment_fingerprint="test",
        artifact_path="tests/contract/test_policy_bundle_profile.py",
        content="passed",
        result_status="passed",
        rationale="policy bundle fixture evidence",
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


def _register_policy_bundle(store):
    from standard_harness.policy.bundles import PolicyBundleService

    PolicyBundleService(store).register_bundle(
        policy_bundle_id="bundle-2026-06",
        version="2026.06",
        risk_taxonomy_version="risk-v1",
        gate_policy_version="gate-v1",
        validator_policy_version="validator-v1",
        skill_policy_version="skill-v1",
        adapter_policy_version="adapter-v1",
        security_data_policy_version="security-v1",
        compatibility_status="compatible",
        idempotency_key="bundle-2026-06",
    )


if __name__ == "__main__":
    unittest.main()
