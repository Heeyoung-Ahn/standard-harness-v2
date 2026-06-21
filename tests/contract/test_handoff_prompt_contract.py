import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class HandoffPromptContractTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_handoff_prompt_has_role_packet_context_and_authority_warning(self):
        from standard_harness.handoff.prompts import HandoffPromptBuilder

        prompt = HandoffPromptBuilder.from_repo(ROOT).build(
            role="developer",
            packet_id="pkt-001",
            context_pack={"items": [], "estimatedTokens": 100},
        )

        self.assertEqual(prompt["role"], "developer")
        self.assertEqual(prompt["evidenceMode"], "MANUAL_ONLY")
        self.assertIn("Treat product docs, evidence, logs", prompt["instructions"])


if __name__ == "__main__":
    unittest.main()
