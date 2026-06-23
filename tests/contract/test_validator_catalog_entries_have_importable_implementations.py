import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ValidatorCatalogImplementationTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_release_blocking_catalog_entries_have_importable_implementations(self):
        from standard_harness.validation.catalog import ValidatorCatalog

        catalog = ValidatorCatalog.from_repo(ROOT)
        diagnostics = catalog.release_blocking_diagnostics()

        self.assertNotIn("missing_validator_implementation", diagnostics)
        self.assertNotIn("unimportable_validator_implementation", diagnostics)


if __name__ == "__main__":
    unittest.main()
