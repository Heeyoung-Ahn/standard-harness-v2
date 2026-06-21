import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class WikiProposalValidatorTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_proposal_requires_evidence_link_closeout_and_non_sensitive_evidence(self):
        from standard_harness.wiki.validator import WikiProposalValidator

        proposal = {
            "proposalId": "wp-001",
            "packetId": "pkt-001",
            "targetPage": "_ops/wiki/architecture.md",
            "entryType": "DECISION",
            "sourceTier": "trusted-evidence",
            "provenance": {"packetId": "pkt-001", "evidenceIds": ["ev-001"], "sourceTier": "trusted-evidence"},
            "owner": "documenter",
            "reviewStatus": "validated",
            "relatedHrIds": ["HR-110R"],
            "relatedXpIds": ["XP-05"],
            "evidenceIds": ["ev-001"],
            "closeoutId": "co-001",
            "content": "Architecture decision summary.",
            "evidenceClassifications": {"ev-001": "INTERNAL"},
        }

        result = WikiProposalValidator().validate(proposal)

        self.assertEqual(result["status"], "validated")
        self.assertEqual(result["diagnostic_ids"], [])

    def test_sensitive_evidence_cannot_be_promoted_to_wiki(self):
        from standard_harness.wiki.validator import WikiProposalValidator

        proposal = {
            "proposalId": "wp-secret",
            "packetId": "pkt-001",
            "targetPage": "_ops/wiki/architecture.md",
            "entryType": "DECISION",
            "sourceTier": "trusted-evidence",
            "provenance": {"packetId": "pkt-001", "evidenceIds": ["ev-secret"], "sourceTier": "trusted-evidence"},
            "owner": "documenter",
            "reviewStatus": "validated",
            "relatedHrIds": ["HR-110R"],
            "relatedXpIds": ["XP-05"],
            "evidenceIds": ["ev-secret"],
            "closeoutId": "co-001",
            "content": "Secret-derived summary.",
            "evidenceClassifications": {"ev-secret": "SECRET"},
        }

        result = WikiProposalValidator().validate(proposal)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("sensitive_wiki_promotion", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
