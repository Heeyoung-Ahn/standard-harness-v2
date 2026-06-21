import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class GateProfileApplicabilityTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_gate_profile_policy_covers_required_packet_types(self):
        from standard_harness.policy.gate_profiles import GateProfilePolicy

        policy = GateProfilePolicy.load(ROOT)
        expected = {
            "docs-only": {"schema", "boundary", "docs-command-if-command-changed", "closeout"},
            "product-feature": {
                "test-plan",
                "implementation",
                "evidence-trust",
                "test",
                "e2e-applicability",
                "requirements",
                "security",
                "ai-review",
                "refactor",
                "closeout",
            },
            "product-bugfix": {
                "test-plan",
                "regression",
                "evidence-trust",
                "requirements",
                "security-if-triggered",
                "refactor",
                "closeout",
            },
            "product-refactor": {
                "test-plan",
                "regression",
                "contract-if-applicable",
                "refactor",
                "ai-review",
                "closeout",
            },
            "security-data": {
                "security-hard-gate",
                "test",
                "regression",
                "e2e-or-rationale",
                "human-risk-decision-if-residual-risk",
            },
            "harness-system": {
                "harness-validation",
                "boundary",
                "manual-command-if-docs-changed",
                "starter-impact",
                "closeout",
            },
            "starter-promotion": {
                "starter-contamination",
                "manual-smoke",
                "harness-validation",
                "closeout",
            },
        }

        self.assertEqual(set(policy.packet_types()), set(expected))
        for packet_type, gates in expected.items():
            self.assertEqual(set(policy.required_gate_ids(packet_type)), gates)

    def test_gate_result_records_hr191_metadata_defaults(self):
        from standard_harness.domain.gates import GateService

        tmp, store = _store_with_supported_claim()
        with tmp:
            gates = GateService(store)
            gates.declare_gate(
                gate_id="gate-001",
                packet_id="pkt-001",
                gate_type="test",
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
            result = gates.record_gate_result(
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

            self.assertEqual(result["policy_version"], "0.2.0")
            self.assertEqual(result["gate_profile_version"], "product-feature@1")
            self.assertEqual(result["validator_version"], "harness-validator@0.2.0")
            self.assertEqual(result["evaluated_at_commit"], "unknown")
            self.assertEqual(result["risks"], [])
            self.assertEqual(result["unknowns"], [])
            self.assertEqual(result["required_actions"], [])


def _store_with_supported_claim():
    from standard_harness.domain.evidence import EvidenceService
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry
    from standard_harness.state.store import HarnessStore

    tmp = tempfile.TemporaryDirectory()
    store = HarnessStore(Path(tmp.name))
    store.initialize()
    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Feature packet",
        objective="Create supported claim.",
        packet_type="product-feature",
        risk_class="medium",
        scope_summary="Feature.",
        out_of_scope_summary="Challenge policy.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["passing-gate"],
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
        description="Feature is tested.",
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
        artifact_path="tests/contract/test_gate_profile_applicability.py",
        content="evidence output",
        result_status="passed",
        rationale="contract test evidence",
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
    return tmp, store


if __name__ == "__main__":
    unittest.main()
