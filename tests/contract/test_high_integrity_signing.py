import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class HighIntegritySigningTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_signed_event_verification_passes_for_unchanged_payload(self):
        from standard_harness.integrity.signing import SigningService
        from standard_harness.integrity.verification import SignatureVerificationService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store)
            signature = SigningService(store).sign_event(
                signature_id="sig-001",
                event_seq=1,
                key_id="local-test-key",
                secret="test-secret",
                signer_id="tester",
                idempotency_key="sig-001",
            )

            verification = SignatureVerificationService(store).verify_signature(
                signature_id=signature["signature_id"],
                secret="test-secret",
            )

            self.assertEqual(verification["status"], "verified")

    def test_signed_event_verification_fails_for_tampered_payload(self):
        from standard_harness.integrity.signing import SigningService
        from standard_harness.integrity.verification import SignatureVerificationService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store)
            SigningService(store).sign_event(
                signature_id="sig-001",
                event_seq=1,
                key_id="local-test-key",
                secret="test-secret",
                signer_id="tester",
                idempotency_key="sig-001",
            )
            with store.transaction() as conn:
                conn.execute(
                    "update events set payload_json = ? where event_seq = 1",
                    ('{"tampered":true}',),
                )

            verification = SignatureVerificationService(store).verify_signature(
                signature_id="sig-001",
                secret="test-secret",
            )

            self.assertEqual(verification["status"], "failed")
            self.assertIn("payload_hash_mismatch", verification["diagnostic_ids"])

    def test_missing_signature_blocks_high_integrity_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.policy.profiles import ProfileService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_ready_packet_with_policy(store)
            ProfileService(store).activate_profile(
                activation_id="profile-high-integrity",
                profile_id="high-integrity",
                idempotency_key="profile-high-integrity",
            )

            closeout = CloseoutService(store).close_packet(
                closeout_id="close-high-integrity",
                packet_id="pkt-001",
                authority_basis="high integrity closeout",
                rationale="high integrity closeout requires signatures",
                idempotency_key="close-high-integrity",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("missing_signature", closeout["diagnostic_ids"])

    def test_invalid_signature_blocks_high_integrity_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.policy.profiles import ProfileService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_ready_packet_with_policy(store)
            ProfileService(store).activate_profile(
                activation_id="profile-high-integrity",
                profile_id="high-integrity",
                idempotency_key="profile-high-integrity",
            )
            _sign_all_packet_events(store)
            with store.transaction() as conn:
                first_packet_event = conn.execute(
                    """
                    select event_seq from events
                    where packet_id = ?
                    order by event_seq
                    limit 1
                    """,
                    ("pkt-001",),
                ).fetchone()
                conn.execute(
                    "update events set payload_json = ? where event_seq = ?",
                    ('{"tampered":true}', first_packet_event["event_seq"]),
                )

            closeout = CloseoutService(store).close_packet(
                closeout_id="close-invalid-signature",
                packet_id="pkt-001",
                authority_basis="high integrity closeout",
                rationale="tampered signed events must block high integrity closeout",
                idempotency_key="close-invalid-signature",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("invalid_signature", closeout["diagnostic_ids"])

    def test_prior_closeout_event_requires_signature_for_next_high_integrity_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.policy.profiles import ProfileService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_ready_packet_with_policy(store)
            CloseoutService(store).close_packet(
                closeout_id="close-before-high-integrity",
                packet_id="pkt-001",
                authority_basis="ordinary closeout",
                rationale="ordinary closeout before high integrity profile is active",
                idempotency_key="close-before-high-integrity",
            )
            ProfileService(store).activate_profile(
                activation_id="profile-high-integrity",
                profile_id="high-integrity",
                idempotency_key="profile-high-integrity",
            )
            _sign_all_packet_events(store, exclude_event_types={"closeout.decided"})

            closeout = CloseoutService(store).close_packet(
                closeout_id="close-prior-closeout-unsigned",
                packet_id="pkt-001",
                authority_basis="high integrity closeout",
                rationale="previous closeout events are packet-scoped history",
                idempotency_key="close-prior-closeout-unsigned",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("missing_signature", closeout["diagnostic_ids"])


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_packet(store):
    from standard_harness.domain.packets import PacketService

    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Signed packet",
        objective="Sign canonical event payload.",
        risk_class="high",
        scope_summary="Signature test.",
        out_of_scope_summary="No external PKI.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["signed-events"],
        owner="owner",
        approval_required=False,
        idempotency_key="packet-create-pkt-001",
    )


def _seed_ready_packet_with_policy(store):
    from tests.contract.test_policy_bundle_profile import _register_policy_bundle, _seed_ready_packet

    _seed_ready_packet(store)
    _register_policy_bundle(store)


def _sign_all_packet_events(store, *, exclude_event_types=None):
    from standard_harness.integrity.signing import SigningService

    excluded = set(exclude_event_types or [])
    with store.connection() as conn:
        rows = conn.execute(
            """
            select event_seq, event_type from events
            where packet_id = ?
            order by event_seq
            """,
            ("pkt-001",),
        ).fetchall()
    signer = SigningService(store)
    for row in rows:
        if row["event_type"] in excluded:
            continue
        signer.sign_event(
            signature_id=f"sig-{row['event_seq']}",
            event_seq=row["event_seq"],
            key_id="local-test-key",
            secret="test-secret",
            signer_id="tester",
            idempotency_key=f"sig-{row['event_seq']}",
        )


if __name__ == "__main__":
    unittest.main()
