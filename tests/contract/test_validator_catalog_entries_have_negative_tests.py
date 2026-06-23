import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ValidatorCatalogNegativeTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_release_blocking_catalog_entries_have_negative_tests(self):
        from standard_harness.validation.catalog import ValidatorCatalog

        catalog = ValidatorCatalog.from_repo(ROOT)

        self.assertNotIn("missing_negative_tests", catalog.release_blocking_diagnostics())


if __name__ == "__main__":
    unittest.main()
