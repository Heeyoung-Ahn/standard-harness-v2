import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ValidateReleaseRunsConformanceTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_validation_service_release_runs_v21_conformance(self):
        from standard_harness.state.store import HarnessStore
        from standard_harness.validation.aggregator import ValidationService

        service = ValidationService(HarnessStore(ROOT / ".harness/state"), repo_root=ROOT)

        self.assertEqual(service.validate_release(), [])

    def test_cli_exposes_v21_conformance_and_release_validation(self):
        from standard_harness.cli.main import _build_parser, _handle_validate
        from standard_harness.state.store import HarnessStore

        parser = _build_parser()
        parsed = parser.parse_args(["validate", "--v21-conformance", "--release"])
        diagnostics = _handle_validate(HarnessStore(ROOT / ".harness/state"), parsed.command_args)

        self.assertEqual(diagnostics, [])


if __name__ == "__main__":
    unittest.main()
