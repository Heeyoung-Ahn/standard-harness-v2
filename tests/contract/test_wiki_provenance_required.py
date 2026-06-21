import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class WikiProvenanceRequiredTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_provenance_requires_packet_evidence_and_source_tier(self):
        from standard_harness.wiki.provenance import WikiProvenanceValidator

        result = WikiProvenanceValidator().validate(
            {"packetId": "pkt-001", "evidenceIds": ["ev-001"], "sourceTier": "trusted-evidence"}
        )

        self.assertEqual(result["status"], "valid")

    def test_missing_evidence_blocks_provenance(self):
        from standard_harness.wiki.provenance import WikiProvenanceValidator

        result = WikiProvenanceValidator().validate({"packetId": "pkt-001", "sourceTier": "generated"})

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_wiki_evidence_link", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
