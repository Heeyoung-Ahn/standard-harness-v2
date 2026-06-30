"""Operator-facing Conductor worker E2E fixture runner."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from standard_harness.adapters.manifest import AdapterManifest
from standard_harness.self_improvement.friction import RuntimeFrictionCapture
from standard_harness.state.store import HarnessStore
from standard_harness.workflow.conductor import ConductorLedger
from standard_harness.workflow.conductor import ConductorRoutingPolicy
from standard_harness.workflow.provider_orchestration import ProviderOrchestrationLedger
from standard_harness.workflow.provider_orchestration import ProviderOrchestrationPolicy


SCHEMA_VERSION = "standard-harness-conductor-worker-e2e/v1"
REAL_CLI_MODES = {"real-smoke", "real_cli", "real-cli"}


@dataclass(frozen=True)
class ConductorWorkerE2ERunner:
    """Run a bounded provider-neutral worker/verifier E2E path."""

    harness_root: str | Path
    friction_capture: RuntimeFrictionCapture | None = None

    def run(
        self,
        *,
        packet_id: str,
        mode: str = "fixture",
        real_cli_approval: bool = False,
        command_descriptor: dict[str, Any] | None = None,
        cli_available: bool = False,
    ) -> dict[str, Any]:
        root = Path(self.harness_root).resolve()
        packet_diagnostics = _packet_id_diagnostics(packet_id)
        if packet_diagnostics:
            return self._blocked_result(
                packet_id=packet_id,
                mode=mode,
                status="execution_blocked",
                real_cli_evidence_status="execution_blocked",
                diagnostics=packet_diagnostics,
            )
        normalized_mode = mode.strip().lower()
        if normalized_mode not in {"fixture", *REAL_CLI_MODES}:
            return self._blocked_result(
                packet_id=packet_id,
                mode=mode,
                status="execution_blocked",
                real_cli_evidence_status="execution_blocked",
                diagnostics=["unsupported_conductor_worker_e2e_mode"],
            )
        if normalized_mode in REAL_CLI_MODES:
            return self._real_cli_boundary_result(
                packet_id=packet_id,
                mode=normalized_mode,
                root=root,
                real_cli_approval=real_cli_approval,
                command_descriptor=command_descriptor,
                cli_available=cli_available,
            )
        return self._fixture_result(packet_id=packet_id, root=root)

    def _fixture_result(
        self,
        *,
        packet_id: str,
        root: Path,
        mode: str = "fixture",
        execution_mode: str = "fixture",
        real_cli_evidence_status: str = "not_applicable",
        command_descriptor: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        store = HarnessStore(root)
        conductor_policy = ConductorRoutingPolicy()
        conductor_ledger = ConductorLedger(store)
        provider_ledger = ProviderOrchestrationLedger(store)
        evidence_dir = root / "_ops" / "evidence" / packet_id / "conductor-worker-e2e"
        evidence_dir.mkdir(parents=True, exist_ok=True)
        input_snapshot_hash = _input_snapshot_hash(packet_id, mode)
        route = conductor_policy.route(
            packet_id=packet_id,
            risk_level="high",
            importance_level="high",
            conductor_id="provider-neutral-conductor",
            input_snapshot_hash=input_snapshot_hash,
            permission_roots=[str(root)],
            context_refs=[f"_ops/evidence/{packet_id}/conductor-worker-e2e/evidence-index.json"],
        )
        conductor_ledger.record_routing_decision(
            routing_decision=route,
            idempotency_key=f"{packet_id}:conductor-worker-e2e:routing",
        )
        provider_policy = ProviderOrchestrationPolicy(_adapter_manifests(root))

        worker_runs: list[dict[str, Any]] = []
        verifier_runs: list[dict[str, Any]] = []
        output_refs: list[dict[str, Any]] = []
        envelope_refs: list[str] = []
        evidence_refs: list[str] = []
        for worker_task in route["selected_workers"]:
            worker_label = worker_task["worker_task_id"].rsplit(":", 1)[-1]
            selected_route = provider_policy.select_adapter(
                worker_task["assigned_role"],
                preferred_provider=worker_task["provider_label"],
            )
            evidence_kind = (
                "captured-cli-evidence"
                if execution_mode == "local_subscription_cli"
                else "fixture-evidence"
            )
            run_kind = (
                "captured-cli-run"
                if execution_mode == "local_subscription_cli"
                else "fixture-run"
            )
            artifact_path = evidence_dir / f"{worker_task['worker_task_id'].replace(':', '-')}-artifact.json"
            artifact_payload = {
                "packetId": packet_id,
                "workerTaskId": worker_task["worker_task_id"],
                "role": worker_task["assigned_role"],
                "provider": worker_task["provider_label"],
                "result": f"{mode} evidence",
                "truthClaim": False,
            }
            _write_json(artifact_path, artifact_payload)
            evidence_id = f"{packet_id}:{worker_label}:{evidence_kind}"
            envelope = _fixture_envelope(
                packet_id=packet_id,
                worker_task=worker_task,
                root=root,
                artifact_path=artifact_path,
                input_snapshot_hash=input_snapshot_hash,
                evidence_id=evidence_id,
                execution_mode=execution_mode,
                run_kind=run_kind,
            )
            envelope_path = evidence_dir / f"{worker_task['worker_task_id'].replace(':', '-')}-envelope.json"
            _write_json(envelope_path, envelope)
            run = provider_ledger.record_run(
                orchestration_run_id=f"{worker_task['worker_task_id']}:{run_kind}",
                packet_id=packet_id,
                role=worker_task["assigned_role"],
                selected_route=selected_route,
                input_snapshot_hash=input_snapshot_hash,
                command_descriptor=command_descriptor or {
                    "argv": ["fixture-worker", worker_label],
                    "shell": False,
                    "timeout_seconds": 30,
                    "mode": mode,
                },
                output_envelope=envelope,
                evidence_refs=[evidence_id],
                diagnostics=[],
                adjudication_state="pending_adjudication",
                status="evidence_recorded",
                idempotency_key=f"{worker_task['worker_task_id']}:{run_kind}",
            )
            output_ref = conductor_policy.worker_output_ref(
                worker_task=worker_task,
                output_envelope_path=str(envelope_path),
                artifact_manifest_refs=[str(artifact_path)],
                evidence_refs=[evidence_id],
                verified_evidence=True,
            )
            conductor_ledger.record_worker_output_ref(
                worker_output_ref=output_ref,
                idempotency_key=f"{worker_task['worker_task_id']}:output-ref",
            )
            public_run = _public_run_record(run)
            if worker_task["assigned_role"].lower() == "reviewer":
                verifier_runs.append(public_run)
            else:
                worker_runs.append(public_run)
            output_refs.append(output_ref)
            envelope_refs.append(str(envelope_path))
            evidence_refs.append(evidence_id)

        provider_adjudication = provider_ledger.record_adjudication(
            packet_id=packet_id,
            left_adapter_run_id=worker_runs[0]["adapterRunId"],
            right_adapter_run_id=verifier_runs[0]["adapterRunId"],
            disagreement="fixture worker and verifier outputs require downstream evidence review",
            follow_up_owner="Tester",
            idempotency_key=f"{packet_id}:provider-adjudication",
        )
        adjudication = conductor_policy.adjudicate(
            packet_id=packet_id,
            worker_outputs=output_refs,
            disagreements=[],
            resolution="fixture worker and verifier envelopes recorded for downstream verification",
            unresolved_items=[],
            next_route="Tester",
        )
        adjudication["provider_adjudication"] = provider_adjudication
        conductor_ledger.record_adjudication(
            adjudication=adjudication,
            idempotency_key=f"{packet_id}:conductor-worker-e2e:adjudication",
        )
        evidence_index_path = _write_evidence_index(
            evidence_dir=evidence_dir,
            packet_id=packet_id,
            mode=mode,
            real_cli_evidence_status=real_cli_evidence_status,
            envelope_refs=envelope_refs,
        )
        return {
            "schemaVersion": SCHEMA_VERSION,
            "packetId": packet_id,
            "mode": mode,
            "status": "pass",
            "selectedConductor": "provider-neutral-conductor",
            "selectedRoute": route["selected_route"],
            "workerRuns": worker_runs,
            "verifierRuns": verifier_runs,
            "outputEnvelopeRefs": envelope_refs,
            "adjudication": adjudication,
            "evidenceRefs": [*evidence_refs, _relative_or_absolute(root, evidence_index_path)],
            "diagnostic_ids": ["fixture_mode_real_cli_not_attempted"] if mode == "fixture" else [],
            "realCliEvidenceStatus": real_cli_evidence_status,
            "authorityBoundary": _authority_boundary(),
            "nextRoute": "Tester",
        }

    def _real_cli_boundary_result(
        self,
        *,
        packet_id: str,
        mode: str,
        root: Path,
        real_cli_approval: bool,
        command_descriptor: dict[str, Any] | None,
        cli_available: bool,
    ) -> dict[str, Any]:
        if not real_cli_approval:
            return self._blocked_result(
                packet_id=packet_id,
                mode=mode,
                status="manual_required",
                real_cli_evidence_status="manual_required",
                diagnostics=["real_cli_smoke_requires_explicit_approval"],
            )
        input_snapshot_hash = _input_snapshot_hash(packet_id, mode)
        provider_policy = ProviderOrchestrationPolicy(_adapter_manifests(root))
        readiness_results = [
            provider_policy.prepare_execution(
                role=role,
                packet_id=packet_id,
                input_snapshot_hash=input_snapshot_hash,
                preferred_provider=provider,
                cli_available=cli_available,
                execution_preconditions=_execution_preconditions(command_descriptor),
            )
            for role, provider in _real_cli_role_providers(command_descriptor).items()
        ]
        blocking = [result for result in readiness_results if result["status"] != "ready"]
        if blocking:
            diagnostics = _readiness_diagnostics(blocking)
            return self._blocked_result(
                packet_id=packet_id,
                mode=mode,
                status="manual_required" if any(result["status"] == "manual_required" for result in blocking) else "execution_blocked",
                real_cli_evidence_status="manual_required" if any(result["status"] == "manual_required" for result in blocking) else "execution_blocked",
                diagnostics=diagnostics,
            )
        capture = (command_descriptor or {}).get("captured_output")
        capture_payload = _resolve_capture_payload(root=root, capture=capture)
        if capture_payload["diagnostics"]:
            return self._blocked_result(
                packet_id=packet_id,
                mode=mode,
                status="execution_blocked",
                real_cli_evidence_status="execution_blocked",
                diagnostics=capture_payload["diagnostics"],
            )
        sensitive_diagnostics = _sensitive_material_diagnostics(command_descriptor or {})
        sensitive_diagnostics.extend(
            _sensitive_material_diagnostics(capture_payload["payload"])
        )
        if sensitive_diagnostics:
            return self._blocked_result(
                packet_id=packet_id,
                mode=mode,
                status="execution_blocked",
                real_cli_evidence_status="execution_blocked",
                diagnostics=sorted(set(sensitive_diagnostics)),
            )
        capture_validation = _validated_capture_records(
            provider_policy=provider_policy,
            packet_id=packet_id,
            input_snapshot_hash=input_snapshot_hash,
            command_descriptor=command_descriptor or {},
            readiness_results=readiness_results,
            capture=capture_payload["payload"],
        )
        if capture_validation["diagnostics"]:
            return self._blocked_result(
                packet_id=packet_id,
                mode=mode,
                status="execution_blocked",
                real_cli_evidence_status="execution_blocked",
                diagnostics=capture_validation["diagnostics"],
            )
        return self._captured_output_result(
            packet_id=packet_id,
            root=root,
            command_descriptor=command_descriptor,
            capture_records=capture_validation["records"],
        )

    def _blocked_result(
        self,
        *,
        packet_id: str,
        mode: str,
        status: str,
        real_cli_evidence_status: str,
        diagnostics: list[str],
    ) -> dict[str, Any]:
        if self.friction_capture is not None and diagnostics:
            self.friction_capture.authority_boundary_violation(
                source_ref="workflow/conductor_worker_e2e.py::ConductorWorkerE2ERunner.run",
                evidence_ref=f"_ops/evidence/runtime-friction/conductor-worker-{packet_id}.json",
                recurrence_key=f"authority-boundary:{diagnostics[0]}",
                idempotency_scope=f"conductor-worker:{packet_id}:{mode}",
            )
        return {
            "schemaVersion": SCHEMA_VERSION,
            "packetId": packet_id,
            "mode": mode,
            "status": status,
            "selectedConductor": "provider-neutral-conductor",
            "selectedRoute": "cross_llm_worker_verifier",
            "workerRuns": [],
            "verifierRuns": [],
            "outputEnvelopeRefs": [],
            "adjudication": {
                "packet_id": packet_id,
                "truth_claim": False,
                "next_route": "Human",
            },
            "evidenceRefs": [],
            "diagnostic_ids": diagnostics,
            "realCliEvidenceStatus": real_cli_evidence_status,
            "authorityBoundary": _authority_boundary(),
            "nextRoute": "Human",
        }

    def _captured_output_result(
        self,
        *,
        packet_id: str,
        root: Path,
        command_descriptor: dict[str, Any] | None,
        capture_records: dict[tuple[str, str], dict[str, Any]],
    ) -> dict[str, Any]:
        store = HarnessStore(root)
        conductor_policy = ConductorRoutingPolicy()
        conductor_ledger = ConductorLedger(store)
        provider_ledger = ProviderOrchestrationLedger(store)
        evidence_dir = root / "_ops" / "evidence" / packet_id / "conductor-worker-e2e"
        evidence_dir.mkdir(parents=True, exist_ok=True)
        input_snapshot_hash = _input_snapshot_hash(packet_id, "real-smoke")
        route = conductor_policy.route(
            packet_id=packet_id,
            risk_level="high",
            importance_level="high",
            conductor_id="provider-neutral-conductor",
            input_snapshot_hash=input_snapshot_hash,
            permission_roots=[str(root)],
            context_refs=[f"_ops/evidence/{packet_id}/conductor-worker-e2e/evidence-index.json"],
        )
        conductor_ledger.record_routing_decision(
            routing_decision=route,
            idempotency_key=f"{packet_id}:conductor-worker-e2e:routing",
        )
        provider_policy = ProviderOrchestrationPolicy(_adapter_manifests(root))
        route = _apply_real_cli_provider_overrides(
            route,
            provider_policy=provider_policy,
            role_providers=_real_cli_role_providers(command_descriptor),
        )

        worker_runs: list[dict[str, Any]] = []
        verifier_runs: list[dict[str, Any]] = []
        output_refs: list[dict[str, Any]] = []
        envelope_refs: list[str] = []
        evidence_refs: list[str] = []
        for worker_task in route["selected_workers"]:
            worker_label = worker_task["worker_task_id"].rsplit(":", 1)[-1]
            record = capture_records[
                (worker_task["assigned_role"], worker_task["provider_label"])
            ]
            selected_route = provider_policy.select_adapter(
                worker_task["assigned_role"],
                preferred_provider=worker_task["provider_label"],
            )
            artifact_path = evidence_dir / f"{worker_task['worker_task_id'].replace(':', '-')}-captured-artifact.json"
            artifact_payload = {
                "packetId": packet_id,
                "workerTaskId": worker_task["worker_task_id"],
                "role": worker_task["assigned_role"],
                "provider": worker_task["provider_label"],
                "source": "trusted_harness_capture",
                "capturedArtifact": record["artifact"],
                "capturedCommand": record["argv"],
                "stdoutSha256": record.get("stdout_sha256"),
                "stderrSha256": record.get("stderr_sha256"),
                "truthClaim": False,
            }
            _write_json(artifact_path, artifact_payload)
            evidence_id = record["evidence_id"]
            envelope = _captured_envelope(
                packet_id=packet_id,
                worker_task=worker_task,
                root=root,
                artifact_path=artifact_path,
                input_snapshot_hash=input_snapshot_hash,
                evidence_id=evidence_id,
                record=record,
            )
            envelope_path = evidence_dir / f"{worker_task['worker_task_id'].replace(':', '-')}-captured-envelope.json"
            _write_json(envelope_path, envelope)
            run = provider_ledger.record_run(
                orchestration_run_id=f"{worker_task['worker_task_id']}:captured-cli-run",
                packet_id=packet_id,
                role=worker_task["assigned_role"],
                selected_route=selected_route,
                input_snapshot_hash=input_snapshot_hash,
                command_descriptor=record["command_descriptor"],
                output_envelope=envelope,
                evidence_refs=[evidence_id],
                diagnostics=[],
                adjudication_state="pending_adjudication",
                status="evidence_recorded",
                idempotency_key=f"{worker_task['worker_task_id']}:captured-cli-run",
            )
            output_ref = conductor_policy.worker_output_ref(
                worker_task=worker_task,
                output_envelope_path=str(envelope_path),
                artifact_manifest_refs=[str(artifact_path)],
                evidence_refs=[evidence_id],
                verified_evidence=True,
            )
            conductor_ledger.record_worker_output_ref(
                worker_output_ref=output_ref,
                idempotency_key=f"{worker_task['worker_task_id']}:captured-output-ref",
            )
            public_run = _public_run_record(run)
            if worker_task["assigned_role"].lower() == "reviewer":
                verifier_runs.append(public_run)
            else:
                worker_runs.append(public_run)
            output_refs.append(output_ref)
            envelope_refs.append(str(envelope_path))
            evidence_refs.append(evidence_id)

        provider_adjudication = provider_ledger.record_adjudication(
            packet_id=packet_id,
            left_adapter_run_id=worker_runs[0]["adapterRunId"],
            right_adapter_run_id=verifier_runs[0]["adapterRunId"],
            disagreement="captured worker and verifier outputs require downstream evidence review",
            follow_up_owner="Tester",
            idempotency_key=f"{packet_id}:provider-adjudication",
        )
        adjudication = conductor_policy.adjudicate(
            packet_id=packet_id,
            worker_outputs=output_refs,
            disagreements=[],
            resolution="captured worker and verifier envelopes recorded for downstream verification",
            unresolved_items=[],
            next_route="Tester",
        )
        adjudication["provider_adjudication"] = provider_adjudication
        conductor_ledger.record_adjudication(
            adjudication=adjudication,
            idempotency_key=f"{packet_id}:conductor-worker-e2e:adjudication",
        )
        evidence_index_path = _write_evidence_index(
            evidence_dir=evidence_dir,
            packet_id=packet_id,
            mode="real-smoke",
            real_cli_evidence_status="pass",
            envelope_refs=envelope_refs,
        )
        return {
            "schemaVersion": SCHEMA_VERSION,
            "packetId": packet_id,
            "mode": "real-smoke",
            "status": "pass",
            "selectedConductor": "provider-neutral-conductor",
            "selectedRoute": route["selected_route"],
            "workerRuns": worker_runs,
            "verifierRuns": verifier_runs,
            "outputEnvelopeRefs": envelope_refs,
            "adjudication": adjudication,
            "evidenceRefs": [*evidence_refs, _relative_or_absolute(root, evidence_index_path)],
            "diagnostic_ids": [],
            "realCliEvidenceStatus": "pass",
            "authorityBoundary": _authority_boundary(),
            "nextRoute": "Tester",
        }


def _adapter_manifests(root: Path) -> list[AdapterManifest]:
    return [
        AdapterManifest.from_dict(
            {
                "adapter_id": "codex-cli-local",
                "adapter_version": "1.0",
                "provider": "codex",
                "supported_roles": ["Developer", "Reviewer"],
                "execution_modes": ["local_subscription_cli", "manual"],
                "credential_mode": "local_subscription",
                "evidence_modes": ["cli_command", "artifact_manifest"],
                "read_write_capability": "write_artifacts",
                "artifact_export_capability": "artifact_manifest",
                "permission_roots": [str(root)],
                "known_limitations": ["requires user-managed local login"],
                "failure_modes": ["success", "blocked", "provider_unavailable"],
                "capabilities": {"non_interactive": True},
            }
        ),
        AdapterManifest.from_dict(
            {
                "adapter_id": "claude-code-local",
                "adapter_version": "1.0",
                "provider": "claude_code",
                "supported_roles": ["Reviewer"],
                "execution_modes": ["local_subscription_cli", "manual"],
                "credential_mode": "local_subscription",
                "evidence_modes": ["cli_command", "artifact_manifest"],
                "read_write_capability": "write_artifacts",
                "artifact_export_capability": "artifact_manifest",
                "permission_roots": [str(root)],
                "known_limitations": ["requires user-managed local login"],
                "failure_modes": ["success", "blocked", "provider_unavailable", "timeout"],
                "capabilities": {"non_interactive": True},
            }
        ),
    ]


def _fixture_envelope(
    *,
    packet_id: str,
    worker_task: dict[str, Any],
    root: Path,
    artifact_path: Path,
    input_snapshot_hash: str,
    evidence_id: str,
    execution_mode: str,
    run_kind: str,
) -> dict[str, Any]:
    return {
        "adapter_run_id": f"{worker_task['worker_task_id']}:{run_kind}",
        "input_snapshot_hash": input_snapshot_hash,
        "permission_roots": [str(root)],
        "artifact_manifest": [
            {
                "path": str(artifact_path),
                "kind": worker_task["expected_output_kind"],
                "sha256": _sha256_text(artifact_path.read_text(encoding="utf-8")),
            }
        ],
        "event_request": {
            "event_type": "adapter.output_submitted",
            "packet_id": packet_id,
            "worker_task_id": worker_task["worker_task_id"],
        },
        "failure_classification": None,
        "evidence_provenance": {
            "execution_mode": execution_mode,
            "result_status": "passed",
            "evidence_id": evidence_id,
            "provider": worker_task["provider_label"],
            "role": worker_task["assigned_role"],
            "timeout_seconds": 30,
            "cancel_status": "not_requested",
        },
    }


def _captured_envelope(
    *,
    packet_id: str,
    worker_task: dict[str, Any],
    root: Path,
    artifact_path: Path,
    input_snapshot_hash: str,
    evidence_id: str,
    record: dict[str, Any],
) -> dict[str, Any]:
    return {
        "adapter_run_id": f"{worker_task['worker_task_id']}:captured-cli-run",
        "input_snapshot_hash": input_snapshot_hash,
        "permission_roots": [str(root)],
        "artifact_manifest": [
            {
                "path": str(artifact_path),
                "kind": record["artifact"]["kind"],
                "sha256": _sha256_text(artifact_path.read_text(encoding="utf-8")),
            }
        ],
        "event_request": {
            "event_type": "adapter.output_submitted",
            "packet_id": packet_id,
            "worker_task_id": worker_task["worker_task_id"],
        },
        "failure_classification": None,
        "evidence_provenance": {
            "execution_mode": "local_subscription_cli",
            "result_status": "passed",
            "evidence_id": evidence_id,
            "provider": worker_task["provider_label"],
            "role": worker_task["assigned_role"],
            "timeout_seconds": record["command_descriptor"]["timeout_seconds"],
            "cancel_status": record.get("cancel_status", "not_requested"),
            "captured_exit_code": record["exit_code"],
            "captured_argv": record["argv"],
            "stdout_sha256": record.get("stdout_sha256"),
            "stderr_sha256": record.get("stderr_sha256"),
        },
    }


def _write_evidence_index(
    *,
    evidence_dir: Path,
    packet_id: str,
    mode: str,
    real_cli_evidence_status: str,
    envelope_refs: list[str],
) -> Path:
    index_path = evidence_dir / "evidence-index.json"
    summary = _evidence_summary(
        packet_id=packet_id,
        real_cli_evidence_status=real_cli_evidence_status,
    )
    payload = {
        "schemaVersion": "standard-harness-evidence-index/v1",
        "packetId": packet_id,
        "summary": summary,
        "entries": [
            {
                "id": f"{packet_id}:conductor-worker-e2e:{mode}",
                "status": "pass",
                "trustStatus": "trusted",
                "freshnessStatus": "fresh",
                "resolutionStatus": "resolved",
                "redactionStatus": "not-sensitive",
                "mode": mode,
                "realCliEvidenceStatus": real_cli_evidence_status,
                "artifactRefs": envelope_refs,
            }
        ],
        "memorySources": _operating_qa_memory_sources(
            packet_id=packet_id,
            evidence_ref=_relative_or_absolute(evidence_dir.parents[3], index_path),
            real_cli_evidence_status=real_cli_evidence_status,
        ),
    }
    _write_json(index_path, payload)
    return index_path


def _operating_qa_memory_sources(
    *, packet_id: str, evidence_ref: str, real_cli_evidence_status: str
) -> list[dict[str, Any]]:
    mode_summary = _evidence_summary(
        packet_id=packet_id,
        real_cli_evidence_status=real_cli_evidence_status,
    )
    return [
        _memory_source("packet", "packet_history", f"{evidence_ref}#packet", mode_summary, evidence_ref),
        _memory_source("evidence", "project_intent", f"{evidence_ref}#project-intent", "Human Owner asks whether worker evidence is fixture, real CLI, or manual required.", evidence_ref),
        _memory_source("evidence", "architecture_decision", f"{evidence_ref}#architecture", "Conductor worker output and adjudication are read-model evidence only.", evidence_ref),
        _memory_source("evidence", "current_convention", f"{evidence_ref}#convention", "Fixture evidence cannot claim real CLI execution.", evidence_ref),
        _memory_source("evidence", "deprecated_context", f"{evidence_ref}#deprecated", "Provider-specific worker identity remains reference context only.", evidence_ref),
        _memory_source("evidence", "known_friction", f"{evidence_ref}#boundary", "Real CLI smoke may be manual required when local provider tools are unavailable or unapproved.", evidence_ref),
        _memory_source("evidence", "open_risk", f"{evidence_ref}#risk", "Fixture evidence must not be treated as real CLI evidence.", evidence_ref),
        _memory_source("evidence", "architecture_decision", f"{evidence_ref}#decision", "Conductor adjudication recommends routes but does not change gate state.", evidence_ref),
    ]


def _evidence_summary(*, packet_id: str, real_cli_evidence_status: str) -> str:
    if real_cli_evidence_status == "pass":
        return (
            f"{packet_id} Conductor worker E2E used trusted captured real CLI "
            "evidence."
        )
    return (
        f"{packet_id} Conductor worker E2E used fixture evidence; "
        f"real CLI evidence status is {real_cli_evidence_status}."
    )


def _memory_source(
    source_type: str, category: str, path: str, summary: str, evidence_ref: str
) -> dict[str, Any]:
    return {
        "source_type": source_type,
        "category": category,
        "path": path,
        "authority_tier": "canonical",
        "freshness_status": "fresh",
        "summary": summary,
        "evidence_refs": [evidence_ref],
        "classification": "INTERNAL",
    }

def _packet_id_diagnostics(packet_id: str) -> list[str]:
    if not isinstance(packet_id, str) or not packet_id.strip():
        return ["invalid_packet_id"]
    value = packet_id.strip()
    forbidden = {"/", "\\", ":", "*", "?", '"', "<", ">", "|"}
    if value in {".", ".."} or any(part in {".", "..", ""} for part in value.replace("\\", "/").split("/")):
        return ["invalid_packet_id"]
    if any(char in value for char in forbidden):
        return ["invalid_packet_id"]
    if value.startswith(".") or value.endswith("."):
        return ["invalid_packet_id"]
    return []


def _execution_preconditions(command_descriptor: dict[str, Any] | None) -> dict[str, Any]:
    descriptor = command_descriptor or {}
    return {
        "approved_packet_boundary": True,
        "explicit_local_configuration": descriptor.get("explicit_local_configuration") is True,
        "authenticated_outside_repo": descriptor.get("authenticated_outside_repo") is True,
        "command_descriptor": descriptor,
        "timeout_seconds": descriptor.get("timeout_seconds"),
        "cancel_supported": descriptor.get("cancel_supported") is True,
        "non_interactive_capture": descriptor.get("non_interactive_capture") is True,
        "input_snapshot_current": descriptor.get("input_snapshot_current") is True,
    }


def _resolve_capture_payload(*, root: Path, capture: Any) -> dict[str, Any]:
    if not isinstance(capture, dict):
        return {
            "diagnostics": ["real_cli_smoke_capture_requires_trusted_harness_capture"],
            "payload": {},
        }
    if "records" in capture:
        return {
            "diagnostics": ["captured_output_requires_trusted_capture_artifact"],
            "payload": {},
        }
    if capture.get("source") != "harness_capture_artifact":
        return {
            "diagnostics": ["captured_output_provenance_missing"],
            "payload": {},
        }
    capture_ref = capture.get("capture_artifact_ref")
    expected_sha256 = capture.get("capture_artifact_sha256")
    if not isinstance(capture_ref, str) or not isinstance(expected_sha256, str):
        return {
            "diagnostics": ["captured_output_artifact_reference_missing"],
            "payload": {},
        }
    capture_path = (root / capture_ref).resolve()
    capture_root = (root / "_ops" / "capture").resolve()
    try:
        capture_path.relative_to(capture_root)
    except ValueError:
        return {
            "diagnostics": ["captured_output_artifact_outside_capture_root"],
            "payload": {},
        }
    if not capture_path.is_file():
        return {"diagnostics": ["captured_output_artifact_missing"], "payload": {}}
    content = capture_path.read_text(encoding="utf-8")
    actual_sha256 = _sha256_text(content)
    if expected_sha256.lower().removeprefix("sha256:") != actual_sha256:
        return {"diagnostics": ["captured_output_artifact_hash_mismatch"], "payload": {}}
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        return {"diagnostics": ["captured_output_artifact_invalid_json"], "payload": {}}
    if not isinstance(payload, dict) or payload.get("trusted_harness_capture") is not True:
        return {
            "diagnostics": ["real_cli_smoke_capture_requires_trusted_harness_capture"],
            "payload": {},
        }
    return {"diagnostics": [], "payload": payload}


def _validated_capture_records(
    *,
    provider_policy: ProviderOrchestrationPolicy,
    packet_id: str,
    input_snapshot_hash: str,
    command_descriptor: dict[str, Any],
    readiness_results: list[dict[str, Any]],
    capture: dict[str, Any],
) -> dict[str, Any]:
    diagnostics: list[str] = []
    records = capture.get("records")
    if not isinstance(records, list) or not records:
        return {"diagnostics": ["captured_output_records_missing"], "records": {}}
    records_by_route: dict[tuple[str, str], dict[str, Any]] = {}
    for ready in readiness_results:
        role = str(ready.get("role"))
        provider = str(ready.get("provider"))
        adapter_id = str(ready.get("adapter_id"))
        record = _find_capture_record(records, role=role, provider=provider, adapter_id=adapter_id)
        if record is None:
            diagnostics.append(f"captured_output_record_missing:{role}:{provider}")
            continue
        normalized = _normalize_capture_record(
            record,
            base_command_descriptor=command_descriptor,
            role=role,
            provider=provider,
            adapter_id=adapter_id,
        )
        diagnostics.extend(normalized["diagnostics"])
        if normalized["record"] is None:
            continue
        record_descriptor = normalized["record"]["command_descriptor"]
        record_readiness = provider_policy.prepare_execution(
            role=role,
            packet_id=packet_id,
            input_snapshot_hash=input_snapshot_hash,
            preferred_provider=provider,
            cli_available=True,
            execution_preconditions=_execution_preconditions(record_descriptor),
        )
        if record_readiness["status"] != "ready":
            diagnostics.extend(_readiness_diagnostics([record_readiness]))
            continue
        records_by_route[(role, provider)] = normalized["record"]
    return {"diagnostics": sorted(set(diagnostics)), "records": records_by_route}


def _real_cli_role_providers(
    command_descriptor: dict[str, Any] | None,
) -> dict[str, str]:
    descriptor = command_descriptor or {}
    reviewer_provider = descriptor.get("reviewer_provider", "claude_code")
    if not isinstance(reviewer_provider, str) or not reviewer_provider.strip():
        reviewer_provider = "claude_code"
    return {
        "Developer": "codex",
        "Reviewer": reviewer_provider.strip().lower(),
    }


def _apply_real_cli_provider_overrides(
    route: dict[str, Any],
    *,
    provider_policy: ProviderOrchestrationPolicy,
    role_providers: dict[str, str],
) -> dict[str, Any]:
    updated_workers: list[dict[str, Any]] = []
    for worker_task in route.get("selected_workers", []):
        updated_task = dict(worker_task)
        role = str(updated_task.get("assigned_role"))
        provider = role_providers.get(role)
        if provider is not None:
            selected_route = provider_policy.select_adapter(
                role,
                preferred_provider=provider,
            )
            updated_task["provider_label"] = selected_route["provider"]
            updated_task["adapter_id"] = selected_route["adapter_id"]
        updated_workers.append(updated_task)
    updated_route = dict(route)
    updated_route["selected_workers"] = updated_workers
    return updated_route


def _sensitive_material_diagnostics(value: Any, path: str = "$") -> list[str]:
    diagnostics: list[str] = []
    sensitive_key_parts = (
        "api_key",
        "apikey",
        "auth_token",
        "bearer_token",
        "access_token",
        "refresh_token",
        "session",
        "cookie",
        "credential",
        "secret",
        "provider_cache",
    )
    sensitive_value_parts = (
        "sk-",
        "authorization:",
        "bearer ",
        "api_key=",
        "begin private key",
        ".codex",
        ".claude",
        "cookie:",
        "session_token",
    )
    if isinstance(value, dict):
        for key, item in value.items():
            key_text = str(key).lower()
            child_path = f"{path}.{key}"
            if any(part in key_text for part in sensitive_key_parts):
                diagnostics.append(f"sensitive_capture_material:{child_path}")
                continue
            diagnostics.extend(_sensitive_material_diagnostics(item, child_path))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            diagnostics.extend(_sensitive_material_diagnostics(item, f"{path}[{index}]"))
    elif isinstance(value, str):
        text = value.lower()
        if any(part in text for part in sensitive_value_parts):
            diagnostics.append(f"sensitive_capture_material:{path}")
    return diagnostics


def _find_capture_record(
    records: list[Any], *, role: str, provider: str, adapter_id: str
) -> dict[str, Any] | None:
    for record in records:
        if not isinstance(record, dict):
            continue
        if (
            record.get("role") == role
            and record.get("provider") == provider
            and record.get("adapter_id") == adapter_id
        ):
            return record
    return None


def _normalize_capture_record(
    record: dict[str, Any],
    *,
    base_command_descriptor: dict[str, Any],
    role: str,
    provider: str,
    adapter_id: str,
) -> dict[str, Any]:
    diagnostics: list[str] = []
    argv = record.get("argv")
    if not isinstance(argv, list) or not argv or not all(isinstance(item, str) for item in argv):
        diagnostics.append("captured_output_argv_missing")
    exit_code = record.get("exit_code")
    if not isinstance(exit_code, int):
        diagnostics.append("captured_output_exit_code_missing")
    elif exit_code != 0:
        diagnostics.append("captured_output_failed")
    if record.get("timeout") is True:
        diagnostics.append("captured_output_timeout")
    if record.get("result_status") not in {"passed", "pass"}:
        diagnostics.append("captured_output_not_passed")
    artifact = record.get("artifact")
    if not isinstance(artifact, dict) or not artifact.get("kind") or "content" not in artifact:
        diagnostics.append("captured_output_artifact_missing")
    evidence_id = record.get("evidence_id")
    if not isinstance(evidence_id, str) or not evidence_id.strip():
        diagnostics.append("captured_output_evidence_id_missing")
    if diagnostics:
        return {"diagnostics": diagnostics, "record": None}
    descriptor = dict(base_command_descriptor)
    descriptor.update(
        {
            "argv": argv,
            "shell": record.get("shell") is True,
            "timeout_seconds": base_command_descriptor.get("timeout_seconds"),
            "cancel_supported": base_command_descriptor.get("cancel_supported") is True,
            "non_interactive_capture": base_command_descriptor.get("non_interactive_capture") is True,
            "input_snapshot_current": base_command_descriptor.get("input_snapshot_current") is True,
            "explicit_local_configuration": base_command_descriptor.get("explicit_local_configuration") is True,
            "authenticated_outside_repo": base_command_descriptor.get("authenticated_outside_repo") is True,
            "captured_output": {"trusted_harness_capture": True},
        }
    )
    normalized = {
        "role": role,
        "provider": provider,
        "adapter_id": adapter_id,
        "argv": argv,
        "shell": record.get("shell") is True,
        "exit_code": exit_code,
        "result_status": record.get("result_status"),
        "timeout": record.get("timeout") is True,
        "cancel_status": record.get("cancel_status", "not_requested"),
        "stdout_sha256": record.get("stdout_sha256"),
        "stderr_sha256": record.get("stderr_sha256"),
        "artifact": artifact,
        "evidence_id": evidence_id.strip(),
        "command_descriptor": descriptor,
    }
    return {"diagnostics": [], "record": normalized}


def _readiness_diagnostics(readiness_results: list[dict[str, Any]]) -> list[str]:
    diagnostics: list[str] = []
    for result in readiness_results:
        code = result.get("diagnostic_code")
        if isinstance(code, str) and code:
            diagnostics.append(code)
        diagnostics.extend(str(item) for item in result.get("missing_preconditions", []) if item)
        diagnostics.extend(str(item) for item in result.get("command_descriptor_diagnostics", []) if item)
    return sorted(set(diagnostics)) or ["real_cli_smoke_not_ready"]


def _public_run_record(run: dict[str, Any]) -> dict[str, Any]:
    return {
        "orchestrationRunId": run["orchestration_run_id"],
        "adapterRunId": run["output_envelope"]["adapter_run_id"],
        "role": run["role"],
        "adapterId": run["adapter_id"],
        "provider": run["provider"],
        "status": run["status"],
        "evidenceRefs": list(run["evidence_refs"]),
        "truthClaim": bool(run["truth_claim"]),
        "diagnostics": list(run["diagnostics"]),
    }


def _authority_boundary() -> dict[str, Any]:
    return {
        "authority": "evidence-read-model-only",
        "approvalStateMutationAllowed": False,
        "forbiddenGateMutations": [
            "ready_for_code",
            "closeout",
            "release",
            "residual_risk",
            "human_gate",
        ],
    }


def _input_snapshot_hash(packet_id: str, mode: str) -> str:
    return f"sha256:{_sha256_text(f'{packet_id}:{mode}')}"


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def _relative_or_absolute(root: Path, path: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return str(path)
