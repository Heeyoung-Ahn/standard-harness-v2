import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class WikiPageSchemaTests(unittest.TestCase):
    def test_wiki_page_schema_requires_authority_metadata(self):
        schema = json.loads((ROOT / "_harness/schemas/wiki-page.schema.json").read_text(encoding="utf-8"))

        required = set(schema["required"])
        self.assertTrue(
            {
                "entryType",
                "sourceTier",
                "provenance",
                "owner",
                "reviewStatus",
                "relatedHrIds",
                "relatedXpIds",
                "packetIds",
                "evidenceIds",
            }.issubset(required)
        )


if __name__ == "__main__":
    unittest.main()
