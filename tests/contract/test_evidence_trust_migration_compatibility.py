import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class EvidenceTrustMigrationCompatibilityTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_existing_passed_evidence_migrates_to_manual_only_structural_statuses(self):
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            with store.connection() as conn:
                conn.execute(
                    """
                    insert into evidence (
                      evidence_id, packet_id, claim_id, command_or_tool, runner,
                      timestamp, cwd_or_execution_context, environment_fingerprint,
                      artifact_path, content_hash, content_hash_algorithm,
                      result_status, rationale
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        "ev-legacy",
                        "pkt-legacy",
                        None,
                        "python -m unittest",
                        "manual-runner",
                        "2026-06-21T00:00:00Z",
                        str(ROOT),
                        "legacy",
                        "legacy.log",
                        "a" * 64,
                        "sha256",
                        "passed",
                        "legacy passed output",
                    ),
                )
                conn.commit()

            evidence = EvidenceService(store).get_evidence("ev-legacy")

            self.assertEqual(evidence["validation_status"], "STRUCTURALLY_VALID")
            self.assertEqual(evidence["trust_status"], "MANUAL_ONLY")
            self.assertEqual(evidence["produced_via"], "manual-handoff")


if __name__ == "__main__":
    unittest.main()
