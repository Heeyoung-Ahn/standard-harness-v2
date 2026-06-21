import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ChallengeReviewRequiredForP0ExceptionTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_p0_exception_request_requires_challenge_gate_before_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.reviews.adjudication import ChallengeReviewService
        from standard_harness.validation.aggregator import ValidationService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store_with_packet(Path(tmp))
            ChallengeReviewService(store).open_challenge(
                challenge_id="challenge-p0",
                challenged_item_id="p0-exception",
                reviewer_role="Independent Reviewer",
                rationale="P0 gate exception requested.",
                idempotency_key="challenge-p0",
                packet_id="pkt-001",
                triggers=["p0_gate_exception_request"],
                decision_id="DEC-P0-001",
            )

            diagnostics = ValidationService(store, repo_root=ROOT).validate_packet("pkt-001")
            closeout = CloseoutService(store).close_packet(
                closeout_id="closeout-p0",
                packet_id="pkt-001",
                authority_basis="attempt closeout with open P0 exception challenge",
                rationale="should block",
                idempotency_key="closeout-p0",
            )

            error_codes = {diagnostic["error_code"] for diagnostic in diagnostics}
            self.assertIn("missing_challenge_review", error_codes)
            self.assertIn("missing_human_decision_record", error_codes)
            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("missing_challenge_review", closeout["diagnostic_ids"])


def _store_with_packet(root: Path):
    from standard_harness.domain.packets import PacketService
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="P0 exception packet",
        objective="Validate challenge gate closeout blocking.",
        packet_type="harness-system",
        risk_class="high",
        scope_summary="Challenge gate.",
        out_of_scope_summary="XP-02 evidence trust.",
        change_zones=["src/standard_harness/"],
        acceptance_criteria_ids=[],
        evidence_requirements=[],
        closeout_criteria=[],
        owner="human-owner",
        approval_required=False,
        idempotency_key="packet-create-p0",
    )
    return store


if __name__ == "__main__":
    unittest.main()
