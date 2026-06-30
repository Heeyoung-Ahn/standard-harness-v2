"""Command-line dispatcher for the Standard Harness MVP."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Callable, Iterable, Sequence

from standard_harness.completion.final_gate import ProjectCompletionGateService
from standard_harness.domain.artifacts import ArtifactRegistry
from standard_harness.domain.closeout import CloseoutService
from standard_harness.domain.evidence import EvidenceService
from standard_harness.domain.gates import GateService
from standard_harness.domain.packets import PacketService
from standard_harness.domain.requirements import RequirementRegistry
from standard_harness.handoff.prompts import HandoffPromptBuilder
from standard_harness.memory.question_answering import LongMemoryQuestionAnsweringService
from standard_harness.memory.question_answering import LongMemorySourceDiscovery
from standard_harness.memory.question_answering import LongMemorySourceIndexBuilder
from standard_harness.memory.operational import OperationalMemoryService
from standard_harness.operating_folders import OperatingFolderInitializer
from standard_harness.projection.current_context import CurrentContextProjection
from standard_harness.self_improvement.friction import FrictionCapturePolicy
from standard_harness.self_improvement.friction import StoredFrictionSignalRegistry
from standard_harness.self_improvement.recurring import RecurringFrictionDetector
from standard_harness.self_improvement.starter_promotion import CompoundFeedbackMetrics
from standard_harness.skills.router import SkillRouter
from standard_harness.starter.contamination import StarterContaminationChecker
from standard_harness.starter.contamination import CLEAN_EXPORT_MODE
from standard_harness.starter.contamination import INSTALLED_RUNTIME_MODE
from standard_harness.state.store import HarnessStore, resolve_harness_root
from standard_harness.validation.aggregator import ValidationService
from standard_harness.validation.readiness import ReadinessService
from standard_harness.workflow.conductor_worker_e2e import ConductorWorkerE2ERunner
from standard_harness.workflow.conductor import ConductorApprovalService
from standard_harness.workflow.conductor_cli import load_grant
from standard_harness.workflow.conductor_cli import persist_conductor_approval
from standard_harness.workflow.conductor_cli import write_grant_record


COMMANDS = (
    "init",
    "ops-reset",
    "operating-qa",
    "conductor-worker-e2e",
    "conductor-grant-create",
    "conductor-approve",
    "packet-create",
    "packet-approve",
    "packet-transition",
    "requirement-register",
    "acceptance-register",
    "artifact-register",
    "evidence-register",
    "claim-record",
    "gate-declare",
    "gate-activate",
    "readiness",
    "gate-record",
    "closeout",
    "context",
    "starter-check",
    "project-completion",
    "handoff-prompt",
    "skill-route",
    "compound-feedback",
    "validate",
)


@dataclass(frozen=True)
class Diagnostic:
    error_code: str
    severity: str
    category: str
    message: str
    repair_hint: str
    affected_entity_type: str | None = None
    affected_entity_id: str | None = None


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="harness_cli.py",
        description="Standard Harness v2 MVP command line interface.",
    )
    parser.add_argument("--json", action="store_true", dest="json_output", help="emit JSON output")
    parser.add_argument(
        "--harness-root",
        default=None,
        help="override the harness root; tests should use a temporary path",
    )
    parser.add_argument("command", nargs="?", help="command to run")
    parser.add_argument("command_args", nargs=argparse.REMAINDER)
    return parser


def _json_response(status: str, diagnostics: Iterable[Diagnostic]) -> str:
    return json.dumps(
        {
            "status": status,
            "diagnostics": [asdict(diagnostic) for diagnostic in diagnostics],
        },
        sort_keys=True,
    )


def _ok_response(**data: object) -> str:
    payload = {"status": "ok"}
    payload.update(data)
    return json.dumps(payload, sort_keys=True)


def _error_response(error_code: str, message: str, command: str | None) -> str:
    return _json_response(
        "error",
        [
            Diagnostic(
                error_code=error_code,
                severity="high",
                category="cli",
                message=message,
                repair_hint="Inspect command arguments and rerun with --json for structured output.",
                affected_entity_type="command",
                affected_entity_id=command,
            )
        ],
    )


def _unknown_command(command: str | None) -> Diagnostic:
    value = command or ""
    return Diagnostic(
        error_code="unknown_command",
        severity="high",
        category="cli",
        message=f"Unknown command: {value}",
        repair_hint="Run with --help to inspect available MVP commands.",
        affected_entity_type="command",
        affected_entity_id=value,
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    command_args = list(args.command_args)

    if args.command == "init":
        harness_root = resolve_harness_root(args.harness_root)
        store = HarnessStore(harness_root)
        db_path = store.initialize()
        operating_folders = OperatingFolderInitializer(harness_root).initialize()
        if args.json_output:
            print(
                _ok_response(
                    harness_root=str(Path(harness_root)),
                    state_db=str(db_path),
                    initialized_folders=operating_folders["initialized_folders"],
                    operating_folder_policy=operating_folders["policy"],
                    source_watermark=store.latest_event_seq(),
                )
            )
        else:
            print(f"Initialized Standard Harness state at {db_path}")
        return 0

    if args.command == "ops-reset":
        harness_root = resolve_harness_root(args.harness_root)
        reset_result = OperatingFolderInitializer(harness_root).reset_ops()
        if args.json_output:
            print(_ok_response(**reset_result))
        else:
            print(json.dumps(reset_result, sort_keys=True))
        return 0

    if args.command == "validate":
        store = HarnessStore(resolve_harness_root(args.harness_root))
        try:
            validation = _handle_validate(store, command_args)
        except Exception as exc:  # noqa: BLE001 - CLI must convert validation errors to diagnostics.
            if args.json_output:
                print(_error_response("command_failed", str(exc), args.command))
            else:
                print(str(exc), file=sys.stderr)
            return 1
        diagnostics = validation["diagnostics"]
        status = "ok" if not diagnostics else "error"
        payload = {"status": status, "diagnostics": diagnostics}
        if validation["metadata"]:
            payload["validation"] = validation["metadata"]
        if args.json_output:
            print(json.dumps(payload, sort_keys=True))
        else:
            print(json.dumps(payload, sort_keys=True))
        return 0 if not diagnostics else 1

    if args.command == "project-completion":
        store = HarnessStore(resolve_harness_root(args.harness_root))
        try:
            completion = _handle_project_completion(store, command_args)
        except Exception as exc:  # noqa: BLE001 - CLI must convert domain errors to diagnostics.
            if args.json_output:
                print(_error_response("command_failed", str(exc), args.command))
            else:
                print(str(exc), file=sys.stderr)
            return 1
        payload = {"status": completion["status"], "completion": completion}
        if args.json_output:
            print(json.dumps(payload, sort_keys=True))
        else:
            print(json.dumps(completion, sort_keys=True))
        return 0 if completion["status"] == "complete" else 1

    if args.command == "conductor-approve":
        store = HarnessStore(resolve_harness_root(args.harness_root))
        try:
            payload = _handle_conductor_approve(store, command_args)
        except Exception as exc:  # noqa: BLE001 - CLI must convert domain errors to diagnostics.
            if args.json_output:
                print(_error_response("command_failed", str(exc), args.command))
            else:
                print(str(exc), file=sys.stderr)
            return 1
        if args.json_output:
            print(json.dumps(payload, sort_keys=True))
        else:
            print(json.dumps(payload, sort_keys=True))
        return 0 if payload["status"] == "approved" else 1

    handlers: dict[str, Callable[[HarnessStore, list[str]], dict[str, Any]]] = {
        "conductor-grant-create": _handle_conductor_grant_create,
        "packet-create": _handle_packet_create,
        "packet-approve": _handle_packet_approve,
        "packet-transition": _handle_packet_transition,
        "requirement-register": _handle_requirement_register,
        "acceptance-register": _handle_acceptance_register,
        "artifact-register": _handle_artifact_register,
        "evidence-register": _handle_evidence_register,
        "claim-record": _handle_claim_record,
        "gate-declare": _handle_gate_declare,
        "gate-activate": _handle_gate_activate,
        "readiness": _handle_readiness,
        "gate-record": _handle_gate_record,
        "closeout": _handle_closeout,
        "context": _handle_context,
        "operating-qa": _handle_operating_qa,
        "conductor-worker-e2e": _handle_conductor_worker_e2e,
        "starter-check": _handle_starter_check,
        "skill-route": _handle_skill_route,
        "handoff-prompt": _handle_handoff_prompt,
        "compound-feedback": _handle_compound_feedback,
    }

    if args.command in handlers:
        store = HarnessStore(resolve_harness_root(args.harness_root))
        try:
            payload = handlers[args.command](store, command_args)
        except Exception as exc:  # noqa: BLE001 - CLI must convert domain errors to diagnostics.
            if args.json_output:
                print(_error_response("command_failed", str(exc), args.command))
            else:
                print(str(exc), file=sys.stderr)
            return 1
        if args.json_output:
            print(_ok_response(**payload))
        else:
            print(json.dumps(payload, sort_keys=True))
        return 0

    if args.command in COMMANDS:
        diagnostic = Diagnostic(
            error_code="not_implemented",
            severity="medium",
            category="cli",
            message=f"Command is declared but not implemented yet: {args.command}",
            repair_hint="Implement the command in the matching MVP task.",
            affected_entity_type="command",
            affected_entity_id=args.command,
        )
        if args.json_output:
            print(_json_response("error", [diagnostic]))
        else:
            print(diagnostic.message, file=sys.stderr)
        return 2

    diagnostic = _unknown_command(args.command)
    if args.json_output:
        print(_json_response("error", [diagnostic]))
    else:
        print(diagnostic.message, file=sys.stderr)
    return 2


def _command_parser(command: str) -> argparse.ArgumentParser:
    return argparse.ArgumentParser(prog=f"harness_cli.py {command}")


def _csv(value: str | None) -> list[str]:
    if value is None or value == "":
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _handle_packet_create(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("packet-create")
    for name in [
        "--packet-id",
        "--title",
        "--objective",
        "--risk-class",
        "--scope-summary",
        "--out-of-scope-summary",
        "--change-zones",
        "--acceptance-criteria-ids",
        "--evidence-requirements",
        "--closeout-criteria",
        "--owner",
        "--idempotency-key",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    packet = PacketService(store).create_packet(
        packet_id=parsed.packet_id,
        title=parsed.title,
        objective=parsed.objective,
        risk_class=parsed.risk_class,
        scope_summary=parsed.scope_summary,
        out_of_scope_summary=parsed.out_of_scope_summary,
        change_zones=_csv(parsed.change_zones),
        acceptance_criteria_ids=_csv(parsed.acceptance_criteria_ids),
        evidence_requirements=_csv(parsed.evidence_requirements),
        closeout_criteria=_csv(parsed.closeout_criteria),
        owner=parsed.owner,
        idempotency_key=parsed.idempotency_key,
    )
    return {"packet": packet}


def _handle_packet_approve(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("packet-approve")
    for name in [
        "--packet-id",
        "--approver-id",
        "--approver-role",
        "--authority-basis",
        "--approved-scope",
        "--rationale",
        "--idempotency-key",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    approval = PacketService(store).approve_packet(
        packet_id=parsed.packet_id,
        approver_id=parsed.approver_id,
        approver_role=parsed.approver_role,
        authority_basis=parsed.authority_basis,
        approved_scope=parsed.approved_scope,
        rationale=parsed.rationale,
        idempotency_key=parsed.idempotency_key,
    )
    return {"approval": approval}


def _handle_packet_transition(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("packet-transition")
    for name in [
        "--packet-id",
        "--lifecycle-state",
        "--actor-id",
        "--actor-role",
        "--authority-basis",
        "--idempotency-key",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    packet = PacketService(store).transition_packet(
        packet_id=parsed.packet_id,
        lifecycle_state=parsed.lifecycle_state,
        actor_id=parsed.actor_id,
        actor_role=parsed.actor_role,
        authority_basis=parsed.authority_basis,
        idempotency_key=parsed.idempotency_key,
    )
    return {"packet": packet}


def _handle_requirement_register(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("requirement-register")
    for name in [
        "--requirement-id",
        "--version",
        "--source-doc",
        "--status",
        "--classification",
        "--risk-classification",
        "--acceptance-criteria",
        "--completion-classification",
        "--packet-id",
        "--idempotency-key",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    requirement = RequirementRegistry(store).register_requirement(
        requirement_id=parsed.requirement_id,
        version=parsed.version,
        source_doc=parsed.source_doc,
        status=parsed.status,
        classification=parsed.classification,
        risk_classification=parsed.risk_classification,
        acceptance_criteria=_csv(parsed.acceptance_criteria),
        completion_classification=parsed.completion_classification,
        packet_id=parsed.packet_id,
        idempotency_key=parsed.idempotency_key,
    )
    return {"requirement": requirement}


def _handle_acceptance_register(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("acceptance-register")
    for name in [
        "--acceptance-criterion-id",
        "--requirement-id",
        "--packet-id",
        "--description",
        "--status",
        "--idempotency-key",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    criterion = RequirementRegistry(store).register_acceptance_criterion(
        acceptance_criterion_id=parsed.acceptance_criterion_id,
        requirement_id=parsed.requirement_id,
        packet_id=parsed.packet_id,
        description=parsed.description,
        status=parsed.status,
        idempotency_key=parsed.idempotency_key,
    )
    return {"acceptance_criterion": criterion}


def _handle_artifact_register(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("artifact-register")
    for name in [
        "--artifact-id",
        "--artifact-type",
        "--path",
        "--owner",
        "--lifecycle-status",
        "--source-reference",
        "--packet-id",
        "--idempotency-key",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    artifact = ArtifactRegistry(store).register_artifact(
        artifact_id=parsed.artifact_id,
        artifact_type=parsed.artifact_type,
        path=parsed.path,
        owner=parsed.owner,
        lifecycle_status=parsed.lifecycle_status,
        source_reference=parsed.source_reference,
        packet_id=parsed.packet_id,
        idempotency_key=parsed.idempotency_key,
    )
    return {"artifact": artifact}


def _handle_evidence_register(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("evidence-register")
    parser.add_argument("--claim-id", default=None)
    for name in [
        "--evidence-id",
        "--packet-id",
        "--command-or-tool",
        "--runner",
        "--cwd-or-execution-context",
        "--environment-fingerprint",
        "--artifact-path",
        "--content",
        "--result-status",
        "--rationale",
        "--idempotency-key",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    evidence = EvidenceService(store).register_evidence(
        evidence_id=parsed.evidence_id,
        packet_id=parsed.packet_id,
        claim_id=parsed.claim_id,
        command_or_tool=parsed.command_or_tool,
        runner=parsed.runner,
        cwd_or_execution_context=parsed.cwd_or_execution_context,
        environment_fingerprint=parsed.environment_fingerprint,
        artifact_path=parsed.artifact_path,
        content=parsed.content,
        result_status=parsed.result_status,
        rationale=parsed.rationale,
        idempotency_key=parsed.idempotency_key,
    )
    return {"evidence": evidence}


def _handle_claim_record(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("claim-record")
    parser.add_argument("--gate-result-ids", default="")
    for name in [
        "--claim-id",
        "--packet-id",
        "--requirement-id",
        "--acceptance-criterion-id",
        "--evidence-ids",
        "--support-status",
        "--idempotency-key",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    claim = EvidenceService(store).record_claim(
        claim_id=parsed.claim_id,
        packet_id=parsed.packet_id,
        requirement_id=parsed.requirement_id,
        acceptance_criterion_id=parsed.acceptance_criterion_id,
        evidence_ids=_csv(parsed.evidence_ids),
        support_status=parsed.support_status,
        gate_result_ids_optional=_csv(parsed.gate_result_ids),
        idempotency_key=parsed.idempotency_key,
    )
    return {"claim": claim}


def _handle_gate_declare(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("gate-declare")
    for name in [
        "--gate-id",
        "--packet-id",
        "--gate-type",
        "--requirement-level",
        "--declared-by-source",
        "--idempotency-key",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    gate = GateService(store).declare_gate(
        gate_id=parsed.gate_id,
        packet_id=parsed.packet_id,
        gate_type=parsed.gate_type,
        requirement_level=parsed.requirement_level,
        declared_by_source=parsed.declared_by_source,
        idempotency_key=parsed.idempotency_key,
    )
    return {"gate": gate}


def _handle_gate_activate(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("gate-activate")
    for name in ["--gate-activation-id", "--gate-id", "--packet-id", "--idempotency-key"]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    activation = GateService(store).activate_gate(
        gate_activation_id=parsed.gate_activation_id,
        gate_id=parsed.gate_id,
        packet_id=parsed.packet_id,
        idempotency_key=parsed.idempotency_key,
    )
    return {"gate_activation": activation}


def _handle_readiness(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("readiness")
    parser.add_argument("--packet-id", required=True)
    parsed = parser.parse_args(argv)
    return {"readiness": ReadinessService(store).check_packet(parsed.packet_id)}


def _handle_gate_record(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("gate-record")
    for name in [
        "--gate-result-id",
        "--gate-id",
        "--packet-id",
        "--checked-claim-ids",
        "--evidence-ids",
        "--status",
        "--requirement-level",
        "--rationale",
        "--idempotency-key",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    result = GateService(store).record_gate_result(
        gate_result_id=parsed.gate_result_id,
        gate_id=parsed.gate_id,
        packet_id=parsed.packet_id,
        checked_claim_ids=_csv(parsed.checked_claim_ids),
        evidence_ids=_csv(parsed.evidence_ids),
        status=parsed.status,
        requirement_level=parsed.requirement_level,
        rationale=parsed.rationale,
        idempotency_key=parsed.idempotency_key,
    )
    return {"gate_result": result}


def _handle_closeout(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("closeout")
    for name in ["--closeout-id", "--packet-id", "--authority-basis", "--rationale", "--idempotency-key"]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    closeout = CloseoutService(store).close_packet(
        closeout_id=parsed.closeout_id,
        packet_id=parsed.packet_id,
        authority_basis=parsed.authority_basis,
        rationale=parsed.rationale,
        idempotency_key=parsed.idempotency_key,
    )
    return {"closeout": closeout}


def _handle_context(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("context")
    parser.add_argument("--packet-id", required=True)
    parsed = parser.parse_args(argv)
    projection = CurrentContextProjection(store).generate(packet_id=parsed.packet_id)
    memory_entries = OperationalMemoryService(store).preview_entries(packet_id=parsed.packet_id)
    return {"projection": projection, "memory_entries": memory_entries}


def _handle_operating_qa(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("operating-qa")
    parser.add_argument("--question", required=True)
    parser.add_argument("--max-answer-chars", type=int, default=800)
    parser.add_argument("--max-sources", type=int, default=16)
    parsed = parser.parse_args(argv)
    repo_root = store.harness_root
    sources = LongMemorySourceDiscovery(repo_root).discover()
    index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)
    answer = LongMemoryQuestionAnsweringService().answer(
        index,
        parsed.question,
        max_answer_chars=parsed.max_answer_chars,
        max_sources=parsed.max_sources,
    )
    return {"operatingQa": answer}


def _handle_conductor_worker_e2e(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("conductor-worker-e2e")
    parser.add_argument("--packet", "--packet-id", dest="packet_id", required=True)
    parser.add_argument("--mode", default="fixture")
    parser.add_argument("--real-cli-approval", action="store_true")
    parser.add_argument("--cli-available", action="store_true")
    parser.add_argument("--command-descriptor-json", default=None)
    parsed = parser.parse_args(argv)
    command_descriptor = None
    if parsed.command_descriptor_json:
        try:
            command_descriptor = json.loads(parsed.command_descriptor_json)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid --command-descriptor-json: {exc}") from exc
        if not isinstance(command_descriptor, dict):
            raise ValueError("--command-descriptor-json must decode to an object")
    result = ConductorWorkerE2ERunner(store.harness_root).run(
        packet_id=parsed.packet_id,
        mode=parsed.mode,
        real_cli_approval=parsed.real_cli_approval,
        command_descriptor=command_descriptor,
        cli_available=parsed.cli_available,
    )
    return {"conductorWorkerE2E": result}


def _handle_conductor_grant_create(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("conductor-grant-create")
    for name in [
        "--delegation-grant-id",
        "--delegating-human-owner",
        "--conductor-id",
        "--packet-id",
        "--approval-type",
        "--risk-ceiling",
        "--evidence-prerequisites",
        "--valid-from",
        "--valid-until",
        "--packet-hash",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    grant = ConductorApprovalService().create_grant(
        delegation_grant_id=parsed.delegation_grant_id,
        delegating_human_owner=parsed.delegating_human_owner,
        conductor_id=parsed.conductor_id,
        packet_id=parsed.packet_id,
        approval_type=parsed.approval_type,
        risk_ceiling=parsed.risk_ceiling,
        evidence_prerequisites=_csv(parsed.evidence_prerequisites),
        valid_from=parsed.valid_from,
        valid_until=parsed.valid_until,
        packet_hash=parsed.packet_hash,
    )
    return {"conductorGrant": write_grant_record(store, grant)}


def _handle_conductor_approve(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("conductor-approve")
    for name in [
        "--packet-id",
        "--approval-type",
        "--actor-type",
        "--approval-channel",
        "--packet-hash",
        "--risk-level",
        "--approved-scope",
        "--rationale",
        "--hard-stop-json",
    ]:
        parser.add_argument(name, required=True)
    parser.add_argument("--conductor-id", default=None)
    parser.add_argument("--grant-file", default=None)
    parsed = parser.parse_args(argv)

    authority_source = _approval_authority_source(parsed.actor_type, parsed.grant_file)
    hard_stop_status = json.loads(parsed.hard_stop_json)
    decision = ConductorApprovalService().decide(
        approval_type=parsed.approval_type,
        actor_type=parsed.actor_type,
        conductor_id=parsed.conductor_id,
        approval_channel=parsed.approval_channel,
        authority_source=authority_source,
        packet_id=parsed.packet_id,
        packet_hash=parsed.packet_hash,
        risk_level=parsed.risk_level,
        evidence_prerequisite_status=_approval_evidence_prerequisite_status(
            authority_source, hard_stop_status
        ),
        decision="approved",
        decided_at="2026-07-01T00:00:00Z",
        hard_stop_status=hard_stop_status,
    )
    if decision["status"] != "approved":
        return {
            "status": "rejected",
            "diagnostics": decision["diagnostics"],
            "conductorApproval": {"decision": decision},
        }

    persisted = persist_conductor_approval(
        store,
        decision=decision,
        approved_scope=parsed.approved_scope,
        rationale=parsed.rationale,
        idempotency_key=f"{parsed.packet_id}:{parsed.approval_type}:conductor-approve",
    )
    return {
        "status": "approved",
        "conductorApproval": {
            "decision": decision,
            "persisted": persisted,
        },
    }


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _starter_repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _handle_skill_route(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("skill-route")
    parser.add_argument("--task-type", default=None)
    parser.add_argument("--intent-text", default="")
    parser.add_argument("--role", required=True)
    parser.add_argument("--planning-boundary-closed", action="store_true")
    parser.add_argument("--verification-evidence-present", action="store_true")
    parser.add_argument("--root-cause-evidence-present", action="store_true")
    parser.add_argument("--review-disposition-present", action="store_true")
    parsed = parser.parse_args(argv)
    if not parsed.task_type and not parsed.intent_text:
        raise ValueError("skill-route requires --task-type or --intent-text")
    route = SkillRouter.from_repo(_starter_repo_root()).route(
        task_type=parsed.task_type,
        intent_text=parsed.intent_text,
        role=parsed.role,
        planning_boundary_closed=True if parsed.planning_boundary_closed else None,
        verification_evidence_present=True if parsed.verification_evidence_present else None,
        root_cause_evidence_present=True if parsed.root_cause_evidence_present else None,
        review_disposition_present=True if parsed.review_disposition_present else None,
    )
    if route["status"] == "blocked":
        raise ValueError(",".join(route["diagnostic_ids"]))
    return {"route": route}


def _handle_handoff_prompt(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("handoff-prompt")
    parser.add_argument("--task-type", required=True)
    parser.add_argument("--role", required=True)
    parser.add_argument("--packet-id", required=True)
    parsed = parser.parse_args(argv)
    repo_root = _starter_repo_root()
    route = SkillRouter.from_repo(repo_root).route(task_type=parsed.task_type, role=parsed.role)
    if route["status"] == "blocked":
        raise ValueError(",".join(route["diagnostic_ids"]))
    handoff = HandoffPromptBuilder.from_repo(repo_root).build(
        role=parsed.role,
        packet_id=parsed.packet_id,
        context_pack={
            "packetId": parsed.packet_id,
            "taskType": parsed.task_type,
            "requiredSkill": route["requiredSkill"],
        },
    )
    handoff.update(
        {
            "selectedBy": route["selectedBy"],
            "requiredSkill": route["requiredSkill"],
            "evidenceRequired": route["evidenceRequired"],
            "evidenceClassification": handoff["evidenceMode"],
            "bypassesP0Gate": route["bypassesP0Gate"],
            "p0Boundary": route["p0Boundary"],
        }
    )
    return {"handoff": handoff}


def _handle_compound_feedback(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("compound-feedback")
    parser.add_argument("--configured-surfaces", default="")
    parser.add_argument("--signals-json", default="[]")
    parsed = parser.parse_args(argv)
    configured_surfaces = _csv(parsed.configured_surfaces)
    capture_policy = FrictionCapturePolicy().validate_capture_surfaces(configured_surfaces)
    try:
        signal_inputs = json.loads(parsed.signals_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid --signals-json: {exc}") from exc
    if not isinstance(signal_inputs, list):
        raise ValueError("--signals-json must be a JSON array")
    registry = StoredFrictionSignalRegistry(store)
    signal_results = [registry.record_signal(signal) for signal in signal_inputs]
    recorded_signals = registry.list_signals()
    recurring = RecurringFrictionDetector().detect(recorded_signals)
    metrics = CompoundFeedbackMetrics().summarize(
        signals=recorded_signals,
        groups=recurring["groups"],
        proposals=[],
        candidates=[],
    )
    status = "blocked" if capture_policy["status"] == "blocked" or any(
        result.get("status") == "blocked" for result in signal_results
    ) else "ok"
    return {
        "compound_feedback": {
            "status": status,
            "capturePolicy": capture_policy,
            "signals": signal_results,
            "recurring": recurring,
            "metrics": metrics,
            "authority": "operational-evidence-only",
        }
    }


def _handle_starter_check(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("starter-check")
    parser.add_argument("--paths", default="")
    parser.add_argument("--root", default=None)
    parser.add_argument("--clean-export", action="store_true")
    parser.add_argument("--installed-runtime", action="store_true")
    parsed = parser.parse_args(argv)
    mode = _starter_validation_mode_arg(parsed)
    checker = StarterContaminationChecker()
    if parsed.root:
        diagnostics = checker.check_root(Path(parsed.root), validation_mode=mode)
    else:
        paths = _csv(parsed.paths)
        diagnostics = checker.check_paths(paths)
    return {
        "starter": {
            "status": "ok" if not diagnostics else "blocked",
            "diagnostics": diagnostics,
            "validationMode": mode,
        }
    }


def _handle_project_completion(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("project-completion")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--requirement-id", default=None)
    parser.add_argument("--completion-result-id", default=None)
    parser.add_argument("--idempotency-key", default=None)
    parsed = parser.parse_args(argv)
    if parsed.all == bool(parsed.requirement_id):
        raise ValueError("project-completion requires exactly one of --all or --requirement-id")
    completion_result_id = parsed.completion_result_id or _default_completion_result_id(
        all_requirements=parsed.all,
        requirement_id=parsed.requirement_id,
        source_watermark=store.latest_event_seq(),
    )
    idempotency_key = parsed.idempotency_key or completion_result_id
    return ProjectCompletionGateService(store).record_result(
        completion_result_id=completion_result_id,
        idempotency_key=idempotency_key,
        all_requirements=parsed.all,
        requirement_id=parsed.requirement_id,
    )


def _default_completion_result_id(
    *, all_requirements: bool, requirement_id: str | None, source_watermark: int
) -> str:
    scope = "all" if all_requirements else str(requirement_id)
    normalized = scope.replace(" ", "-").replace("/", "-").replace("\\", "-")
    return f"project-completion-{normalized}-{source_watermark}"


def _handle_validate(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("validate")
    parser.add_argument("--state", action="store_true")
    parser.add_argument("--packet", dest="packet_scope", default=None)
    parser.add_argument("--packet-id", default=None)
    parser.add_argument("--starter", action="store_true")
    parser.add_argument("--clean-export", action="store_true")
    parser.add_argument("--installed-runtime", action="store_true")
    parser.add_argument("--projection", action="store_true")
    parser.add_argument("--requirements-metadata", action="store_true")
    parser.add_argument("--v21-conformance", action="store_true")
    parser.add_argument("--release", action="store_true")
    parser.add_argument("--all", action="store_true")
    parsed = parser.parse_args(argv)
    packet_id = parsed.packet_id or parsed.packet_scope
    service = _validation_service_for_store(store)
    diagnostics: list[dict[str, Any]] = []
    metadata: dict[str, Any] = {}
    if parsed.all:
        starter_mode = _starter_validation_mode_arg(parsed, default=service.starter_validation_mode())
        diagnostics.extend(service.validate_all(packet_id=packet_id, starter_mode=starter_mode))
        metadata["starter"] = _starter_validation_metadata(starter_mode)
        return {"diagnostics": diagnostics, "metadata": metadata}
    if parsed.release:
        diagnostics.extend(service.validate_release())
    if parsed.v21_conformance:
        diagnostics.extend(service.validate_v21_conformance())
    if parsed.requirements_metadata:
        diagnostics.extend(service.validate_requirements_metadata())
    if parsed.state:
        diagnostics.extend(service.validate_state())
    if parsed.packet_scope or parsed.packet_id:
        if packet_id is None:
            raise ValueError("validate --packet requires a packet id")
        diagnostics.extend(service.validate_packet(packet_id))
    if parsed.starter:
        starter_mode = _starter_validation_mode_arg(parsed, default=service.starter_validation_mode())
        diagnostics.extend(service.validate_starter(mode=starter_mode))
        metadata["starter"] = _starter_validation_metadata(starter_mode)
    if parsed.projection:
        if packet_id is None:
            raise ValueError("validate --projection requires --packet-id")
        diagnostics.extend(service.validate_projection(packet_id))
    if not any(
        [
            parsed.state,
            parsed.packet_scope,
            parsed.packet_id,
            parsed.starter,
            parsed.projection,
            parsed.requirements_metadata,
            parsed.v21_conformance,
            parsed.release,
        ]
    ):
        diagnostics.extend(service.validate_state())
    return {"diagnostics": diagnostics, "metadata": metadata}


def _starter_validation_mode_arg(parsed: argparse.Namespace, *, default: str = CLEAN_EXPORT_MODE) -> str:
    if parsed.clean_export and parsed.installed_runtime:
        raise ValueError("Use exactly one starter validation mode flag: --clean-export or --installed-runtime")
    if parsed.clean_export:
        return CLEAN_EXPORT_MODE
    if parsed.installed_runtime:
        return INSTALLED_RUNTIME_MODE
    return default


def _starter_validation_metadata(mode: str) -> dict[str, Any]:
    return {
        "validationMode": mode,
        "cleanExportProof": mode == CLEAN_EXPORT_MODE,
        "runtimeGeneratedStateTolerated": mode == INSTALLED_RUNTIME_MODE,
    }


def _validation_service_for_store(store: HarnessStore) -> ValidationService:
    root = store.harness_root
    repository_starter = root / "starter" / "standard-harness"
    if repository_starter.exists():
        return ValidationService(store, repo_root=root, starter_root=repository_starter)
    if (root / "_harness" / "policies" / "project-operating-folders.yaml").exists():
        return ValidationService(store, repo_root=root, starter_root=root)
    return ValidationService(store)


def _approval_authority_source(
    actor_type: str, grant_file: str | None
) -> dict[str, Any] | None:
    if grant_file:
        return load_grant(grant_file)
    if actor_type == "human":
        return {"trusted_human_decision": True}
    return None


def _approval_evidence_prerequisite_status(
    authority_source: dict[str, Any] | None,
    hard_stop_status: dict[str, bool],
) -> dict[str, bool | str]:
    grant = authority_source if isinstance(authority_source, dict) else {}
    statuses: dict[str, bool | str] = {}
    for prerequisite in grant.get("evidence_prerequisites", []):
        statuses[prerequisite] = (
            "verified_by_harness" if hard_stop_status.get(prerequisite) is True else False
        )
    if (
        not statuses
        and hard_stop_status.get("evidence_prerequisites_met") is True
    ):
        statuses["evidence_prerequisites_met"] = "verified_by_harness"
    return statuses


if __name__ == "__main__":
    raise SystemExit(main())
