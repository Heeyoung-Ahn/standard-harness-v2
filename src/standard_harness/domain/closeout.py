"""Closeout decision service."""

from __future__ import annotations

import json
from pathlib import Path

from standard_harness.domain.packets import PacketService
from standard_harness.domain.packets import LIFECYCLE_STATES
from standard_harness.gitops.drift import FilesystemDriftService
from standard_harness.integrity.verification import SignatureVerificationService
from standard_harness.evidence.trust import EvidenceTrustPolicy
from standard_harness.policy.gate_profiles import GateProfilePolicy
from standard_harness.policy.bundles import PolicyBundleService
from standard_harness.policy.release import ReleasePolicyBoundary
from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore
from standard_harness.validation.boundary import BoundaryValidator
from standard_harness.validation.boundary import boundary_input_from_packet
from standard_harness.validation.ai_review import AIReviewValidator
from standard_harness.validation.challenge_gate import ChallengeGateValidator
from standard_harness.validation.e2e_applicability import E2EApplicabilityValidator
from standard_harness.validation.evidence_trust import packet_requires_trusted_evidence
from standard_harness.validation.refactor_review import RefactorReviewValidator
from standard_harness.validation.requirements_review import RequirementsReviewValidator
from standard_harness.validation.review_governance import ReviewGovernanceValidator
from standard_harness.validation.security_review import SecurityReviewValidator


class CloseoutService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def close_packet(
        self,
        *,
        closeout_id: str,
        packet_id: str,
        authority_basis: str,
        rationale: str,
        idempotency_key: str,
        review_bundle_id: str | None = None,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_closeout(closeout_id)
        if self._closeout_exists(closeout_id):
            raise ValueError(f"closeout_id already exists: {closeout_id}")
        packet = PacketService(self.store).get_packet(packet_id)
        self._record_pre_closeout_drift(packet_id)
        source_watermark = self.store.latest_event_seq()
        policy_bundle_version = PolicyBundleService(self.store).latest_compatible_version()
        claims = self._supported_claims(packet_id)
        gate_results = self._passing_gate_results(packet_id)
        evidence_ids = sorted({evidence_id for claim in claims for evidence_id in claim["evidence_ids"]})
        diagnostics: list[str] = []
        for diagnostic_id in self._packet_kernel_diagnostics(packet):
            _add_diagnostic(diagnostics, diagnostic_id)
        for diagnostic_id in self._challenge_gate_diagnostics(packet_id):
            _add_diagnostic(diagnostics, diagnostic_id)
        registered_acceptance_ids = self._registered_acceptance_ids(packet_id)
        supported_acceptance_ids = {
            str(claim["acceptance_criterion_id"]) for claim in claims
        }
        for acceptance_id in packet["acceptance_criteria_ids"]:
            if acceptance_id not in registered_acceptance_ids:
                _add_diagnostic(diagnostics, "unregistered_acceptance_criterion")
            if acceptance_id not in supported_acceptance_ids:
                _add_diagnostic(diagnostics, "missing_supported_claim")
        if not claims:
            _add_diagnostic(diagnostics, "missing_evidence")
        for claim in claims:
            if not claim["evidence_ids"] or not all(
                self._evidence_is_passed(packet_id, evidence_id)
                for evidence_id in claim["evidence_ids"]
            ):
                _add_diagnostic(diagnostics, "missing_evidence")
        if self._requires_trusted_evidence(packet):
            if not evidence_ids:
                _add_diagnostic(diagnostics, "missing_trusted_evidence")
            for evidence_id in evidence_ids:
                if not self._evidence_is_trusted_for_closeout(packet_id, evidence_id):
                    _add_diagnostic(diagnostics, "missing_trusted_evidence")
                    if self._evidence_is_manual_only(packet_id, evidence_id):
                        _add_diagnostic(diagnostics, "manual_only_evidence")
        if not gate_results:
            _add_diagnostic(diagnostics, "missing_gate_pass")
        checked_claim_ids = {claim_id for gate in gate_results for claim_id in gate["checked_claim_ids"]}
        required_claim_ids = {str(claim["claim_id"]) for claim in claims}
        if gate_results and not required_claim_ids.issubset(checked_claim_ids):
            _add_diagnostic(diagnostics, "missing_gate_claim_coverage")
        for diagnostic_id in self._boundary_diagnostics(packet):
            _add_diagnostic(diagnostics, diagnostic_id)
        for diagnostic_id in self._review_gate_diagnostics(packet):
            _add_diagnostic(diagnostics, diagnostic_id)
        for diagnostic_id in self._review_governance_diagnostics(packet):
            _add_diagnostic(diagnostics, diagnostic_id)
        for diagnostic_id in self._projection_diagnostics(packet_id):
            _add_diagnostic(diagnostics, diagnostic_id)
        for diagnostic_id in self._review_bundle_diagnostics(
            packet_id, review_bundle_id, source_watermark
        ):
            _add_diagnostic(diagnostics, diagnostic_id)
        for diagnostic_id in self._recovery_diagnostics():
            _add_diagnostic(diagnostics, diagnostic_id)
        for diagnostic_id in self._filesystem_drift_diagnostics(packet_id):
            _add_diagnostic(diagnostics, diagnostic_id)
        for diagnostic_id in ReleasePolicyBoundary(self.store).diagnostics(packet_id=packet_id):
            _add_diagnostic(diagnostics, diagnostic_id)
        for diagnostic_id in self._high_integrity_diagnostics(packet_id):
            _add_diagnostic(diagnostics, diagnostic_id)
        decision_status = "closed" if not diagnostics else "blocked"
        closeout = {
            "closeout_id": closeout_id,
            "packet_id": packet_id,
            "packet_version": packet["packet_version"],
            "decision_status": decision_status,
            "checked_claim_ids": [claim["claim_id"] for claim in claims],
            "gate_result_ids": [gate["gate_result_id"] for gate in gate_results],
            "evidence_ids": evidence_ids,
            "diagnostic_ids": diagnostics,
            "source_event_range": f"1-{source_watermark}",
            "source_watermark": source_watermark,
            "authority_basis": authority_basis,
            "policy_bundle_version": policy_bundle_version,
            "review_bundle_id": review_bundle_id,
            "decided_at": utc_now_iso(),
            "rationale": rationale,
        }
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="closeout.decided",
                actor_id="reviewer",
                actor_role="Reviewer",
                authority_basis=authority_basis,
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                packet_version=int(packet["packet_version"]),
                payload=closeout,
                conn=conn,
            )
            conn.execute(
                """
                insert or ignore into closeouts (
                  closeout_id, packet_id, packet_version, decision_status,
                  checked_claim_ids_json, gate_result_ids_json, evidence_ids_json,
                  diagnostic_ids_json, policy_bundle_version, review_bundle_id, source_event_range, source_watermark,
                  authority_basis, decided_at, rationale
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    closeout_id,
                    packet_id,
                    closeout["packet_version"],
                    decision_status,
                    json.dumps(closeout["checked_claim_ids"], sort_keys=True),
                    json.dumps(closeout["gate_result_ids"], sort_keys=True),
                    json.dumps(closeout["evidence_ids"], sort_keys=True),
                    json.dumps(closeout["diagnostic_ids"], sort_keys=True),
                    policy_bundle_version,
                    review_bundle_id,
                    closeout["source_event_range"],
                    source_watermark,
                    authority_basis,
                    closeout["decided_at"],
                    rationale,
                ),
            )
            conn.execute(
                "update packets set lifecycle_state = ?, updated_at = ? where packet_id = ?",
                (decision_status, closeout["decided_at"], packet_id),
            )
        return self.get_closeout(closeout_id)

    def get_closeout(self, closeout_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute("select * from closeouts where closeout_id = ?", (closeout_id,)).fetchone()
        if row is None:
            raise KeyError(f"Unknown closeout: {closeout_id}")
        result = dict(row)
        result["checked_claim_ids"] = json.loads(result.pop("checked_claim_ids_json"))
        result["gate_result_ids"] = json.loads(result.pop("gate_result_ids_json"))
        result["evidence_ids"] = json.loads(result.pop("evidence_ids_json"))
        result["diagnostic_ids"] = json.loads(result.pop("diagnostic_ids_json"))
        result.setdefault("review_bundle_id", None)
        result.setdefault("policy_bundle_version", None)
        return result

    def _supported_claims(self, packet_id: str) -> list[dict[str, object]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select * from claims where packet_id = ? and support_status = 'supported'",
                (packet_id,),
            ).fetchall()
        claims = []
        for row in rows:
            claim = dict(row)
            claim["evidence_ids"] = json.loads(claim.pop("evidence_ids_json"))
            claim["gate_result_ids_optional"] = json.loads(claim.pop("gate_result_ids_json"))
            claims.append(claim)
        return claims

    def _passing_gate_results(self, packet_id: str) -> list[dict[str, object]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select * from gate_results where packet_id = ? and status = 'pass'",
                (packet_id,),
            ).fetchall()
        results = []
        for row in rows:
            result = dict(row)
            result["checked_claim_ids"] = json.loads(result.pop("checked_claim_ids_json"))
            result["evidence_ids"] = json.loads(result.pop("evidence_ids_json"))
            results.append(result)
        return results

    def _registered_acceptance_ids(self, packet_id: str) -> set[str]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select acceptance_criterion_id from acceptance_criteria where packet_id = ?",
                (packet_id,),
            ).fetchall()
        return {row["acceptance_criterion_id"] for row in rows}

    def _evidence_is_passed(self, packet_id: str, evidence_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select result_status from evidence
                where packet_id = ? and evidence_id = ?
                """,
                (packet_id, evidence_id),
            ).fetchone()
        return row is not None and row["result_status"] == "passed"

    def _evidence_is_trusted_for_closeout(self, packet_id: str, evidence_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select * from evidence
                where packet_id = ? and evidence_id = ?
                """,
                (packet_id, evidence_id),
            ).fetchone()
        if row is None:
            return False
        return EvidenceTrustPolicy().can_closeout(dict(row))

    def _evidence_is_manual_only(self, packet_id: str, evidence_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select trust_status from evidence
                where packet_id = ? and evidence_id = ?
                """,
                (packet_id, evidence_id),
            ).fetchone()
        return row is not None and row["trust_status"] == "MANUAL_ONLY"

    def _requires_trusted_evidence(self, packet: dict[str, object]) -> bool:
        return packet_requires_trusted_evidence(packet)

    def _boundary_diagnostics(self, packet: dict[str, object]) -> list[str]:
        boundary_input = boundary_input_from_packet(packet)
        if boundary_input is None:
            return []
        try:
            result = BoundaryValidator.from_repo(Path.cwd()).validate(boundary_input)
        except (OSError, ValueError):
            return ["invalid_zone_mapping"]
        return list(result["diagnostic_ids"])

    def _review_gate_diagnostics(self, packet: dict[str, object]) -> list[str]:
        closeout_plan = packet.get("closeout_plan")
        if not isinstance(closeout_plan, dict):
            return []
        review_gates = closeout_plan.get("reviewGates") or closeout_plan.get("review_gates")
        if not isinstance(review_gates, dict):
            return []
        diagnostics: list[str] = []
        e2e_input = review_gates.get("e2eApplicability")
        if isinstance(e2e_input, dict):
            diagnostics.extend(E2EApplicabilityValidator().evaluate(e2e_input)["diagnostic_ids"])
        requirements_input = review_gates.get("requirementsReview")
        if isinstance(requirements_input, dict):
            diagnostics.extend(RequirementsReviewValidator().evaluate(requirements_input)["diagnostic_ids"])
        security_input = review_gates.get("securityReview")
        if isinstance(security_input, dict):
            diagnostics.extend(
                SecurityReviewValidator.from_repo(Path.cwd()).evaluate(security_input)["diagnostic_ids"]
            )
        refactor_input = review_gates.get("refactorReview")
        if isinstance(refactor_input, dict):
            diagnostics.extend(
                RefactorReviewValidator.from_repo(Path.cwd()).evaluate(refactor_input)["diagnostic_ids"]
            )
        ai_input = review_gates.get("aiReview")
        if isinstance(ai_input, dict):
            diagnostics.extend(AIReviewValidator().evaluate(ai_input)["diagnostic_ids"])
        return diagnostics

    def _review_governance_diagnostics(self, packet: dict[str, object]) -> list[str]:
        return ReviewGovernanceValidator(self.store.harness_root).closeout_diagnostics(packet)

    def _closeout_exists(self, closeout_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from closeouts where closeout_id = ?", (closeout_id,)
            ).fetchone()
        return row is not None

    def _projection_diagnostics(self, packet_id: str) -> list[str]:
        with self.store.connection() as conn:
            projection = conn.execute(
                """
                select source_watermark from projections
                where packet_id = ? and projection_type = 'current_context'
                order by trace_event_seq desc limit 1
                """,
                (packet_id,),
            ).fetchone()
            if projection is None:
                return []
            latest_source = conn.execute(
                """
                select coalesce(max(event_seq), 0) as seq
                from events
                where event_type != 'projection.generated'
                  and event_type not in (
                    'recovery_started', 'projection_rebuilt', 'recovery_blocked',
                    'audit_snapshot_created', 'backup_created', 'restore_verified'
                  )
                """
            ).fetchone()["seq"]
        if int(projection["source_watermark"]) < int(latest_source):
            return ["stale_projection"]
        return []

    def _recovery_diagnostics(self) -> list[str]:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select recovery_status from recovery_runs
                order by recorded_at desc limit 1
                """
            ).fetchone()
        if row is not None and row["recovery_status"] != "rebuilt":
            return ["blocked_recovery"]
        return []

    def _review_bundle_diagnostics(
        self, packet_id: str, review_bundle_id: str | None, source_watermark: int
    ) -> list[str]:
        if review_bundle_id is None:
            with self.store.connection() as conn:
                row = conn.execute(
                    """
                    select 1 from review_bundles
                    where packet_id = ?
                    limit 1
                    """,
                    (packet_id,),
                ).fetchone()
            return ["missing_review_bundle"] if row is not None else []
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select source_watermark from review_bundles
                where review_bundle_id = ? and packet_id = ?
                """,
                (review_bundle_id, packet_id),
            ).fetchone()
        if row is None:
            return ["missing_review_bundle"]
        latest = self._latest_review_bundle(packet_id)
        if latest is not None and latest != review_bundle_id:
            return ["stale_review_bundle"]
        latest_after_bundle = self._latest_event_after_review_bundle(review_bundle_id)
        if int(latest_after_bundle) > int(row["source_watermark"]):
            return ["stale_review_bundle"]
        return []

    def _latest_review_bundle(self, packet_id: str) -> str | None:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select review_bundle_id from review_bundles
                where packet_id = ?
                order by source_watermark desc, trace_event_seq desc
                limit 1
                """,
                (packet_id,),
            ).fetchone()
        return None if row is None else str(row["review_bundle_id"])

    def _latest_event_after_review_bundle(self, review_bundle_id: str) -> int:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select coalesce(max(event_seq), 0) as seq
                from events
                where event_type not in (
                  'projection.generated',
                  'review_bundle.created',
                  'audit_snapshot_created',
                  'backup_created',
                  'restore_verified'
                )
                """
            ).fetchone()
        return int(row["seq"])

    def _filesystem_drift_diagnostics(self, packet_id: str) -> list[str]:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select 1 from filesystem_drifts
                where packet_id = ? and resolution_status = 'open'
                limit 1
                """,
                (packet_id,),
            ).fetchone()
        return ["filesystem_drift_unresolved"] if row is not None else []

    def _record_pre_closeout_drift(self, packet_id: str) -> None:
        drift_id = f"pre-closeout-{packet_id}-{self.store.latest_event_seq()}"
        FilesystemDriftService(self.store).detect_packet_drift(
            drift_id=drift_id,
            packet_id=packet_id,
            repo_root=self.store.harness_root,
            idempotency_key=f"pre-closeout-drift-{drift_id}",
        )

    def _high_integrity_diagnostics(self, packet_id: str) -> list[str]:
        if not self._high_integrity_active():
            return []
        verifier = SignatureVerificationService(self.store)
        diagnostics = []
        if verifier.missing_packet_event_signatures(packet_id):
            diagnostics.append("missing_signature")
        if verifier.invalid_packet_event_signatures(packet_id):
            diagnostics.append("invalid_signature")
        return diagnostics

    def _high_integrity_active(self) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select 1 from profile_activations
                where profile_id = 'high-integrity' and status = 'active'
                limit 1
                """
            ).fetchone()
        return row is not None

    def _packet_kernel_diagnostics(self, packet: dict[str, object]) -> list[str]:
        diagnostics = []
        if str(packet["lifecycle_state"]) not in LIFECYCLE_STATES:
            diagnostics.extend(["invalid_packet_schema", "invalid_state_transition"])
        gate_profile_version = str(packet.get("gate_profile_version", ""))
        if not gate_profile_version:
            diagnostics.extend(["invalid_packet_schema", "missing_gate_profile"])
        else:
            try:
                expected = GateProfilePolicy.load(self.store.harness_root).profile_version(
                    str(packet.get("packet_type", "docs-only"))
                )
            except (FileNotFoundError, KeyError, ValueError):
                expected = None
            if expected is not None and gate_profile_version != expected:
                diagnostics.append("missing_gate_profile")
        return diagnostics

    def _challenge_gate_diagnostics(self, packet_id: str) -> list[str]:
        try:
            return ChallengeGateValidator.load(self.store.harness_root).diagnostics_for_store(
                store=self.store,
                repo_root=self.store.harness_root,
                packet_id=packet_id,
            )
        except FileNotFoundError:
            return ["missing_challenge_gate_policy"]


def _add_diagnostic(diagnostics: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostics:
        diagnostics.append(diagnostic_id)
