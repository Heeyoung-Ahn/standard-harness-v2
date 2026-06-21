"""Readiness checks over parsed canonical state."""

from __future__ import annotations

from standard_harness.domain.packets import PacketService
from standard_harness.policy.bundles import PolicyBundleService
from standard_harness.policy.release import ReleasePolicyBoundary
from standard_harness.state.store import HarnessStore
from standard_harness.validation.diagnostics import DiagnosticRecord


class ReadinessService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def check_packet(self, packet_id: str) -> dict[str, object]:
        packet = PacketService(self.store).get_packet(packet_id)
        policy_bundle_version = PolicyBundleService(self.store).latest_compatible_version()
        diagnostics: list[dict[str, object]] = []
        for diagnostic_id in ReleasePolicyBoundary(self.store).diagnostics(packet_id=packet_id):
            diagnostics.append(
                DiagnosticRecord(
                    error_code=diagnostic_id,
                    severity="high",
                    category="policy",
                    message=f"Policy boundary blocks readiness: {diagnostic_id}",
                    repair_hint="Resolve policy bundle, dependency, security, IP, or profile blockers before proceeding.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    freshness_watermark=self.store.latest_event_seq(),
                ).to_dict()
            )

        required_list_fields = [
            ("change_zones", "missing_change_zones"),
            ("acceptance_criteria_ids", "missing_acceptance_criteria"),
            ("evidence_requirements", "missing_evidence_requirements"),
            ("closeout_criteria", "missing_closeout_criteria"),
        ]
        for field, error_code in required_list_fields:
            if not packet[field]:
                diagnostics.append(
                    DiagnosticRecord(
                        error_code=error_code,
                        severity="high",
                        category="readiness",
                        message=f"Packet field is required: {field}",
                        repair_hint=f"Populate packet.{field} before proceeding.",
                        affected_entity_type="packet",
                        affected_entity_id=packet_id,
                        packet_id=packet_id,
                        field=field,
                        expected_value="non_empty",
                        actual_value="empty",
                        freshness_watermark=self.store.latest_event_seq(),
                    ).to_dict()
                )

        if diagnostics:
            return {
                "status": "blocked",
                "diagnostics": diagnostics,
                "policy_bundle_version": policy_bundle_version,
            }

        if packet["approval_required"] and packet["approval_state"] != "approved":
            diagnostics.append(
                DiagnosticRecord(
                    error_code="missing_approval",
                    severity="high",
                    category="readiness",
                    message="Packet requires approval before work can proceed.",
                    repair_hint="Run packet-approve with an authorized approval record.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="approval_state",
                    expected_value="approved",
                    actual_value=str(packet["approval_state"]),
                    freshness_watermark=self.store.latest_event_seq(),
                ).to_dict()
            )
            return {
                "status": "hold",
                "diagnostics": diagnostics,
                "policy_bundle_version": policy_bundle_version,
            }

        missing_acceptance_ids = [
            acceptance_id
            for acceptance_id in packet["acceptance_criteria_ids"]
            if not self._acceptance_exists(packet_id, acceptance_id)
        ]
        for acceptance_id in missing_acceptance_ids:
            diagnostics.append(
                DiagnosticRecord(
                    error_code="unregistered_acceptance_criterion",
                    severity="high",
                    category="readiness",
                    message="Packet acceptance criterion is not registered.",
                    repair_hint="Register the acceptance criterion before proceeding.",
                    affected_entity_type="acceptance_criterion",
                    affected_entity_id=acceptance_id,
                    packet_id=packet_id,
                    acceptance_criterion_id=acceptance_id,
                    field="acceptance_criteria_ids",
                    expected_value="registered",
                    actual_value="missing",
                    freshness_watermark=self.store.latest_event_seq(),
                ).to_dict()
            )
        if diagnostics:
            return {
                "status": "blocked",
                "diagnostics": diagnostics,
                "policy_bundle_version": policy_bundle_version,
            }

        return {"status": "ready", "diagnostics": [], "policy_bundle_version": policy_bundle_version}

    def _acceptance_exists(self, packet_id: str, acceptance_criterion_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select 1 from acceptance_criteria
                where packet_id = ? and acceptance_criterion_id = ?
                """,
                (packet_id, acceptance_criterion_id),
            ).fetchone()
        return row is not None
