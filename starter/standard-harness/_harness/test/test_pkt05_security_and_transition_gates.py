from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.context.authority import ContextAuthorityPolicy  # noqa: E402
from standard_harness.context.budget import TokenBudgetPolicy  # noqa: E402
from standard_harness.context.packs import ContextPackBuilder  # noqa: E402
from standard_harness.domain.packets import PacketService  # noqa: E402
from standard_harness.handoff.prompts import HandoffPromptBuilder  # noqa: E402
from standard_harness.security.evidence_classification import EvidenceClassifier  # noqa: E402
from standard_harness.state.store import HarnessStore  # noqa: E402
from standard_harness.workflow.orchestration import WorkflowOrchestrationService  # noqa: E402


class Pkt05SecurityAndTransitionGateTests(unittest.TestCase):
    def test_context_pack_and_handoff_omit_sensitive_or_secret_content(self) -> None:
        builder = ContextPackBuilder(
            ContextAuthorityPolicy(
                {
                    "defaultTier": "untrusted-content",
                    "tiers": [{"tier": "evidence", "rank": 3, "patterns": ["_ops/evidence/**"]}],
                }
            ),
            TokenBudgetPolicy({"defaultBudget": 4000, "roleBudgets": {"developer": 4000}}),
        )

        pack = builder.build(
            role="developer",
            packet={"packet_id": "PKT-05"},
            items=[
                {
                    "path": "_ops/evidence/PKT-05/secret.env",
                    "classification": "SECRET",
                    "content": "password=hidden",
                },
                {
                    "path": "_ops/packets/PKT-05.md",
                    "classification": "INTERNAL",
                    "content": "Evidence-backed packet summary.",
                },
            ],
        )
        prompt = HandoffPromptBuilder({"roles": {"developer": {"requiredOutputs": []}}}).build(
            role="developer",
            packet_id="PKT-05",
            context_pack=pack,
        )

        self.assertEqual(len(pack["items"]), 1)
        self.assertEqual(pack["omittedItemDiagnostics"][0]["code"], "sensitive_context_pack_omitted")
        self.assertNotIn("password=hidden", str(pack))
        self.assertNotIn("password=hidden", str(prompt))

    def test_private_key_evidence_is_secret_and_not_promotable(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._write(
                repo_root / "_harness/policies/evidence-classification.yaml",
                """
                {
                  "classifications": ["PUBLIC", "INTERNAL", "SENSITIVE", "SECRET"],
                  "defaults": {"classification": "INTERNAL"},
                  "promotionRules": {
                    "INTERNAL": {"wikiPromotionAllowed": true, "handoffAllowed": true},
                    "SECRET": {"wikiPromotionAllowed": false, "handoffAllowed": false}
                  },
                  "registrationRules": {
                    "SECRET": {"blocked": true, "diagnostic": "secret_evidence_registered"}
                  }
                }
                """,
            )
            result = EvidenceClassifier.from_repo(repo_root).classify(
                content="-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----",
                artifact_path="_ops/evidence/PKT-05/key.pem",
            )

        self.assertEqual(result["classification"], "SECRET")
        self.assertFalse(result["wikiPromotionAllowed"])
        self.assertFalse(result["handoffAllowed"])

    def test_implementation_workflow_blocks_without_packet_doc_review_even_when_approved(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            packet_service = PacketService(store)
            packet_service.create_packet(
                packet_id="PKT-05",
                title="Long memory",
                objective="Build source index",
                risk_class="high",
                change_zones=["_harness/system"],
                acceptance_criteria_ids=["AC-1"],
                evidence_requirements=["unit tests"],
                closeout_criteria=["review"],
                owner="planner",
                idempotency_key="create-pkt-05",
                review_plan={},
            )
            packet_service.approve_packet(
                packet_id="PKT-05",
                approver_id="human-owner",
                approver_role="HumanOwner",
                authority_basis="explicit Ready For Code",
                approved_scope="PKT-05",
                rationale="Approved by user.",
                idempotency_key="approve-pkt-05",
            )

            run = WorkflowOrchestrationService(store).record_run(
                workflow_run_id="run-pkt-05-implementation",
                packet_id="PKT-05",
                phase="implementation",
                actor_role="Developer",
                input_projection_id=None,
                retry_count=0,
                idempotency_key="run-pkt-05-implementation",
            )

        self.assertEqual(run["status"], "blocked")
        self.assertIn("missing_packet_doc_review", run["blocker_diagnostic_ids"])

    @staticmethod
    def _write(path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content.strip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
