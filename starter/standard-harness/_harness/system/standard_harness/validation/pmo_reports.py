"""PMO daily report validation."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from standard_harness.self_improvement.friction import RuntimeFrictionCapture


REQUIRED_PMO_FOLDERS = [
    "day-wrap-up",
    "wbs",
]
PMO_STRUCTURED_STATE_RECORDS = [
    "source-intake",
    "daily-reports",
    "status",
    "risks",
    "blockers",
]
GENERATED_PMO_VIEW_FOLDERS = ["day-start"]
FORBIDDEN_PMO_FOLDERS = ["daily-wrap-up"]
PMO_SURFACE_CONTRACT = {
    "human_markdown_folders": ["day-wrap-up"],
    "structured_folders": ["wbs"],
    "generated_views": GENERATED_PMO_VIEW_FOLDERS,
    "structured_state_records": PMO_STRUCTURED_STATE_RECORDS,
    "forbidden_folders": FORBIDDEN_PMO_FOLDERS,
}
REPORT_LINE_LIMIT = 60
APPROVAL_AUTHORITY_TERMS = [
    "pm approves implementation",
    "pm approves testing",
    "pm approves review",
    "pm approves release",
    "pm approves closeout",
    "pm approves residual risk",
    "pmo approves implementation",
    "pmo approves testing",
    "pmo approves review",
    "pmo approves release",
    "pmo approves closeout",
    "pmo approves residual risk",
]


def validate_pmo_report(
    report: dict[str, Any],
    *,
    canonical_source_watermark: int | None = None,
    friction_capture: RuntimeFrictionCapture | None = None,
) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []
    markdown = _text(report.get("markdown"))
    evidence_index_path = _text(report.get("evidence_index_path"))

    if report.get("authority") != "coordination-only":
        diagnostics.append({"code": "pmo_report_invalid_authority", "field": "authority"})
    if _body_line_count(markdown) > REPORT_LINE_LIMIT:
        diagnostics.append({"code": "pmo_report_too_long", "field": "markdown"})
    if evidence_index_path == "" or evidence_index_path not in markdown:
        diagnostics.append(
            {"code": "pmo_report_missing_evidence_index_link", "field": "evidence_index_path"}
        )
    if canonical_source_watermark is not None and int(report.get("source_watermark") or 0) < int(
        canonical_source_watermark
    ):
        diagnostics.append({"code": "pmo_report_stale", "field": "source_watermark"})

    lower_markdown = markdown.lower()
    if any(term in lower_markdown for term in APPROVAL_AUTHORITY_TERMS):
        diagnostics.append({"code": "pmo_report_claims_approval_authority", "field": "markdown"})

    if diagnostics and friction_capture is not None:
        code = str(diagnostics[0].get("code", "pmo_report_diagnostic"))
        friction_capture.pm_report_status_friction(
            source_ref="validation/pmo_reports.py::validate_pmo_report",
            evidence_ref=f"_ops/evidence/runtime-friction/pmo-report-{_text(report.get('packet_id')) or 'unknown'}.json",
            recurrence_key=f"pm-report-validation:{code}",
            idempotency_scope=f"validate_pmo_report:{_text(report.get('report_path')) or code}",
        )

    return {"ok": not diagnostics, "diagnostics": diagnostics}


def validate_pmo_placement(root: str | Path) -> dict[str, Any]:
    root_path = Path(root)
    diagnostics: list[dict[str, Any]] = []
    for folder in REQUIRED_PMO_FOLDERS:
        path = root_path / "product" / "docs" / "pmo" / folder
        if not path.is_dir():
            diagnostics.append({"code": "missing_pmo_folder", "path": str(path)})
    for folder in FORBIDDEN_PMO_FOLDERS:
        path = root_path / "product" / "docs" / "pmo" / folder
        if path.is_dir():
            diagnostics.append({"code": "legacy_pmo_folder", "path": str(path)})
    for folder in PMO_STRUCTURED_STATE_RECORDS:
        path = root_path / "product" / "docs" / "pmo" / folder
        if path.is_dir():
            diagnostics.append({"code": "structured_pmo_state_as_markdown_folder", "path": str(path)})
    for folder in GENERATED_PMO_VIEW_FOLDERS:
        path = root_path / "product" / "docs" / "pmo" / folder
        if path.is_dir():
            diagnostics.append(
                {"code": "generated_pmo_view_as_required_markdown_folder", "path": str(path)}
            )
    return {"ok": not diagnostics, "diagnostics": diagnostics}


def _body_line_count(markdown: str) -> int:
    return len([line for line in markdown.splitlines() if line.strip()])


def _text(value: Any) -> str:
    return str(value or "").strip()
