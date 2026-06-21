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
from standard_harness.memory.operational import OperationalMemoryService
from standard_harness.projection.current_context import CurrentContextProjection
from standard_harness.starter.contamination import StarterContaminationChecker
from standard_harness.state.store import HarnessStore, resolve_harness_root
from standard_harness.validation.aggregator import ValidationService
from standard_harness.validation.readiness import ReadinessService


COMMANDS = (
    "init",
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
        if args.json_output:
            print(
                _ok_response(
                    harness_root=str(Path(harness_root)),
                    state_db=str(db_path),
                    source_watermark=store.latest_event_seq(),
                )
            )
        else:
            print(f"Initialized Standard Harness state at {db_path}")
        return 0

    if args.command == "validate":
        store = HarnessStore(resolve_harness_root(args.harness_root))
        try:
            diagnostics = _handle_validate(store, command_args)
        except Exception as exc:  # noqa: BLE001 - CLI must convert validation errors to diagnostics.
            if args.json_output:
                print(_error_response("command_failed", str(exc), args.command))
            else:
                print(str(exc), file=sys.stderr)
            return 1
        status = "ok" if not diagnostics else "error"
        if args.json_output:
            print(json.dumps({"status": status, "diagnostics": diagnostics}, sort_keys=True))
        else:
            print(json.dumps({"diagnostics": diagnostics}, sort_keys=True))
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

    handlers: dict[str, Callable[[HarnessStore, list[str]], dict[str, Any]]] = {
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
        "starter-check": _handle_starter_check,
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


def _handle_starter_check(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("starter-check")
    parser.add_argument("--paths", default="")
    parser.add_argument("--root", default=None)
    parsed = parser.parse_args(argv)
    checker = StarterContaminationChecker()
    if parsed.root:
        diagnostics = checker.check_root(Path(parsed.root))
    else:
        paths = _csv(parsed.paths)
        diagnostics = checker.check_paths(paths)
    return {"starter": {"status": "ok" if not diagnostics else "blocked", "diagnostics": diagnostics}}


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


def _handle_validate(store: HarnessStore, argv: list[str]) -> list[dict[str, Any]]:
    parser = _command_parser("validate")
    parser.add_argument("--state", action="store_true")
    parser.add_argument("--packet", dest="packet_scope", default=None)
    parser.add_argument("--packet-id", default=None)
    parser.add_argument("--starter", action="store_true")
    parser.add_argument("--projection", action="store_true")
    parser.add_argument("--requirements-metadata", action="store_true")
    parser.add_argument("--all", action="store_true")
    parsed = parser.parse_args(argv)
    packet_id = parsed.packet_id or parsed.packet_scope
    service = ValidationService(store)
    diagnostics: list[dict[str, Any]] = []
    if parsed.all:
        return service.validate_all(packet_id=packet_id)
    if parsed.requirements_metadata:
        diagnostics.extend(service.validate_requirements_metadata())
    if parsed.state:
        diagnostics.extend(service.validate_state())
    if parsed.packet_scope or parsed.packet_id:
        if packet_id is None:
            raise ValueError("validate --packet requires a packet id")
        diagnostics.extend(service.validate_packet(packet_id))
    if parsed.starter:
        diagnostics.extend(service.validate_starter())
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
        ]
    ):
        diagnostics.extend(service.validate_state())
    return diagnostics


if __name__ == "__main__":
    raise SystemExit(main())
