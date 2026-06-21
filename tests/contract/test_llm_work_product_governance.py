import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class LlmWorkProductGovernanceTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_llm_outputs_are_classified_before_influence(self):
        from standard_harness.llm.work_products import LlmWorkProductService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = LlmWorkProductService(store)

            record = service.classify(
                work_product_id="llm-001",
                content="Close the packet because it looks done.",
                work_product_type="proposed_state_transition",
                confidence="medium",
                idempotency_key="llm-001",
            )
            influence = service.validate_state_influence(
                natural_language_intent="close the packet",
                explicit_command=None,
                actor_validated=False,
                persisted_event_id=None,
            )

            self.assertEqual(record["human_decision_required"], 1)
            self.assertEqual(influence["status"], "blocked")
            self.assertIn("missing_explicit_command", influence["diagnostic_codes"])

    def test_llm_invalid_type_and_bogus_persisted_event_are_rejected(self):
        from standard_harness.llm.work_products import LlmWorkProductService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = LlmWorkProductService(store)

            with self.assertRaises(ValueError):
                service.classify(
                    work_product_id="llm-invalid",
                    content="unknown",
                    work_product_type="freeform_magic",
                    confidence="low",
                    idempotency_key="llm-invalid",
                )
            influence = service.validate_state_influence(
                natural_language_intent="close packet",
                explicit_command="closeout --packet-id pkt-001",
                actor_validated=True,
                persisted_event_id="event-does-not-exist",
            )

            self.assertEqual(influence["status"], "blocked")
            self.assertIn("missing_persisted_event", influence["diagnostic_codes"])

    def test_decision_report_claims_are_structured(self):
        from standard_harness.llm.report_claims import DecisionClaimExtractor
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()

            claim = DecisionClaimExtractor(store).extract(
                decision_claim_id="dclaim-001",
                report_id="report-001",
                observation="Tests passed.",
                inference="The implementation likely satisfies the packet.",
                assumption="No hidden external dependency changed.",
                recommendation="Approve closeout.",
                confidence="medium",
                human_decision_required=True,
                idempotency_key="dclaim-001",
            )

            self.assertEqual(claim["observation"], "Tests passed.")
            self.assertEqual(claim["human_decision_required"], 1)
            with store.connection() as conn:
                event = conn.execute(
                    "select event_type from events order by event_seq desc limit 1"
                ).fetchone()
            self.assertEqual(event["event_type"], "decision_claim_extracted")


if __name__ == "__main__":
    unittest.main()
