import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class CostTrackingTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_cost_record_contains_required_fields(self):
        from standard_harness.pmo.cost import CostTrackingService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store)

            cost = CostTrackingService(store).record_cost(
                cost_record_id="cost-001",
                packet_id="pkt-001",
                tool_name="codex",
                operation_type="implementation",
                usage_quantity=42,
                usage_unit="minutes",
                cost_estimate=12.5,
                risk_tier="medium",
                idempotency_key="cost-001",
            )

            self.assertEqual(cost["tool_name"], "codex")
            self.assertEqual(cost["operation_type"], "implementation")
            self.assertEqual(cost["usage_quantity"], 42)
            self.assertEqual(cost["usage_unit"], "minutes")
            self.assertEqual(cost["cost_estimate"], 12.5)
            self.assertEqual(cost["risk_tier"], "medium")
            self.assertGreaterEqual(cost["source_watermark"], 1)

    def test_cost_records_are_signals_and_never_suppress_required_evidence_or_gates(self):
        from standard_harness.completion.coverage import ProjectCompletionCoverage
        from standard_harness.pmo.cost import CostTrackingService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_requirement_only(store)
            CostTrackingService(store).record_cost(
                cost_record_id="cost-001",
                packet_id="pkt-001",
                tool_name="codex",
                operation_type="implementation",
                usage_quantity=100,
                usage_unit="tokens",
                cost_estimate=1.0,
                risk_tier="low",
                idempotency_key="cost-001",
            )

            result = ProjectCompletionCoverage(store).evaluate(requirement_id="REQ-001")

            self.assertEqual(result["status"], "blocked")
            self.assertIn("missing_supported_claim", {d["error_code"] for d in result["diagnostics"]})


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_packet(store):
    from standard_harness.domain.packets import PacketService

    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Cost packet",
        objective="Track cost signal.",
        risk_class="low",
        scope_summary="Cost signal.",
        out_of_scope_summary="No gate suppression.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["passing-gate"],
        owner="owner",
        approval_required=False,
        idempotency_key="packet-create-pkt-001",
    )


def _seed_requirement_only(store):
    from standard_harness.domain.requirements import RequirementRegistry

    _seed_packet(store)
    RequirementRegistry(store).register_requirement(
        requirement_id="REQ-001",
        version="1",
        source_doc="docs/requirements/cost.md",
        status="approved",
        classification="Core",
        risk_classification="low",
        acceptance_criteria=["ac-001"],
        completion_classification="evidence-required",
        packet_id="pkt-001",
        idempotency_key="requirement-REQ-001",
    )
    RequirementRegistry(store).register_acceptance_criterion(
        acceptance_criterion_id="ac-001",
        requirement_id="REQ-001",
        packet_id="pkt-001",
        description="Cost does not suppress evidence requirements.",
        status="approved",
        idempotency_key="acceptance-ac-001",
    )


if __name__ == "__main__":
    unittest.main()
