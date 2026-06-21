import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SecurityPrivacyIpPolicyTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_secret_like_evidence_snippets_are_redacted(self):
        from standard_harness.security.redaction import EvidenceRedactor

        snippet = "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456 token=ghp_1234567890abcdef"
        redacted = EvidenceRedactor().redact(snippet)

        self.assertNotIn("sk-proj-", redacted["text"])
        self.assertNotIn("ghp_", redacted["text"])
        self.assertEqual(redacted["redaction_count"], 2)

    def test_unclear_license_provenance_blocks_release_or_publication(self):
        from standard_harness.security.ip_license import IPLicenseService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            record = IPLicenseService(store).record_source(
                ip_record_id="ip-unknown",
                source="copied web snippet",
                license_or_usage_basis="unclear",
                generated_vs_copied="copied",
                attribution_need="unknown",
                uncertainty="high",
                release_blocking_status="blocked",
                idempotency_key="ip-unknown",
            )
            result = IPLicenseService(store).evaluate_release()

            self.assertEqual(record["release_blocking_status"], "blocked")
            self.assertEqual(result["status"], "blocked")
            self.assertIn("unclear_license_provenance", result["diagnostic_ids"])

    def test_unclear_license_provenance_blocks_packet_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.security.ip_license import IPLicenseService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_ready_packet_with_policy(store)
            IPLicenseService(store).record_source(
                ip_record_id="ip-unknown",
                source="copied web snippet",
                license_or_usage_basis="unclear",
                generated_vs_copied="copied",
                attribution_need="unknown",
                uncertainty="high",
                release_blocking_status="blocked",
                idempotency_key="ip-unknown",
            )

            closeout = CloseoutService(store).close_packet(
                closeout_id="close-ip",
                packet_id="pkt-001",
                authority_basis="release gate",
                rationale="IP provenance must be clear",
                idempotency_key="close-ip",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("unclear_license_provenance", closeout["diagnostic_ids"])

    def test_privacy_policy_flags_personal_data_without_retention_basis(self):
        from standard_harness.security.privacy import PrivacyPolicy

        result = PrivacyPolicy().evaluate_data_use(
            data_categories=["personal_data"],
            retention_basis="",
            human_approval_record_id=None,
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_retention_basis", result["diagnostic_ids"])
        self.assertIn("missing_human_privacy_approval", result["diagnostic_ids"])


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_ready_packet_with_policy(store):
    from tests.contract.test_policy_bundle_profile import _register_policy_bundle, _seed_ready_packet

    _seed_ready_packet(store)
    _register_policy_bundle(store)


if __name__ == "__main__":
    unittest.main()
