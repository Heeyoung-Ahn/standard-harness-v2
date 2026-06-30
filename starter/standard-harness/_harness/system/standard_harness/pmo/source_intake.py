"""Structured PM source intake for operating intelligence."""

from __future__ import annotations

import csv
import re
from io import StringIO
from typing import Any


REQUIRED_PM_SOURCE_COLUMNS = [
    "source_id",
    "source_type",
    "packet_id",
    "title",
    "status",
    "owner_role",
    "priority",
    "risk_level",
    "blocker",
    "next_work",
    "evidence_index_path",
    "closeout_report_path",
    "source_watermark",
    "freshness_status",
    "updated_at",
]

APPROVAL_AUTHORITY_PATTERN = re.compile(
    r"(?i)\b("
    r"ready for code|closeout|release|publish|starter promotion|residual risk|"
    r"user uat|productization(?:-complete| complete)?|conductor delegation"
    r")\b.*\b(approved|approve|accepted|done|complete)\b"
    r"|\b(approved|approve|accepted|done|complete)\b.*\b("
    r"ready for code|closeout|release|publish|starter promotion|residual risk|"
    r"user uat|productization(?:-complete| complete)?|conductor delegation"
    r")\b"
)

PROMPT_LIKE_PATTERN = re.compile(
    r"(?i)\b("
    r"ignore (?:all )?(?:previous|prior|above) instructions|"
    r"disregard (?:all )?(?:previous|prior|above) instructions|"
    r"system prompt|developer prompt|approve release|"
    r"when answering(?: the user)?|current instruction|ignore validation results|"
    r"present this .* as (?:the )?(?:current )?instruction"
    r")\b"
)

SENSITIVE_PATTERN = re.compile(
    r"(?i)\b("
    r"password\s*=|passwd\s*=|token\s*=|api[_-]?key\s*=|secret\s*=|"
    r"bearer\s+[a-z0-9._~+/=-]{8,}|sk-[a-z0-9_-]{8,}"
    r")"
)


def build_pm_source_tsv(rows: list[dict[str, Any]]) -> str:
    output = StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=REQUIRED_PM_SOURCE_COLUMNS,
        delimiter="\t",
        lineterminator="\n",
        extrasaction="ignore",
    )
    writer.writeheader()
    for row in rows:
        writer.writerow({column: _text(row.get(column)) for column in REQUIRED_PM_SOURCE_COLUMNS})
    return output.getvalue()


def parse_pm_source_table(content: str, *, dialect: str = "tsv") -> dict[str, Any]:
    delimiter = "," if dialect == "csv" else "\t"
    diagnostics: list[dict[str, Any]] = []
    reader = csv.DictReader(StringIO(content or ""), delimiter=delimiter)
    headers = reader.fieldnames or []
    for column in REQUIRED_PM_SOURCE_COLUMNS:
        if column not in headers:
            diagnostics.append({"code": "missing_pm_source_column", "field": column})

    records = [{column: _text(row.get(column)) for column in REQUIRED_PM_SOURCE_COLUMNS} for row in reader]
    if not records:
        diagnostics.append({"code": "missing_pm_source_row", "field": "rows"})

    for row_index, record in enumerate(records):
        _validate_record(record, row_index=row_index, diagnostics=diagnostics)

    return {
        "ok": not diagnostics,
        "records": records,
        "diagnostics": diagnostics,
    }


def pm_records_to_memory_sources(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    for record in records:
        source_id = _text(record.get("source_id"))
        packet_id = _text(record.get("packet_id"))
        evidence_ref = _text(record.get("evidence_index_path"))
        closeout_ref = _text(record.get("closeout_report_path"))
        summary = _summary(record)
        sources.append(
            {
                "source_id": source_id or f"pmo:{packet_id}:{_text(record.get('updated_at'))}",
                "source_type": "pmo",
                "category": _category(record),
                "path": f"product/docs/pmo/source-intake/{source_id or packet_id}.tsv",
                "authority_tier": "coordination",
                "project_provenance": "copied-project",
                "freshness_status": _freshness_status(record),
                "summary": summary,
                "evidence_refs": [ref for ref in [evidence_ref, closeout_ref] if ref],
                "classification": "SENSITIVE" if _is_sensitive(record) else "INTERNAL",
                "prompt_like": _is_prompt_like(record),
                "approval_state_mutation_allowed": False,
                "source_watermark": _text(record.get("source_watermark")),
                "packet_id": packet_id,
                "status": _text(record.get("status")),
            }
        )
    return sources


def _validate_record(record: dict[str, str], *, row_index: int, diagnostics: list[dict[str, Any]]) -> None:
    for field in (
        "source_id",
        "packet_id",
        "status",
        "evidence_index_path",
        "closeout_report_path",
        "freshness_status",
        "updated_at",
    ):
        if not _text(record.get(field)):
            diagnostics.append({"code": "missing_pm_source_field", "field": field, "rowIndex": row_index})
    if _freshness_status(record) != "fresh":
        diagnostics.append({"code": "pm_source_stale", "field": "freshness_status", "rowIndex": row_index})
    if _claims_approval_authority(record):
        diagnostics.append({"code": "pm_source_claims_approval_authority", "field": "next_work", "rowIndex": row_index})
    if _is_prompt_like(record):
        diagnostics.append({"code": "pm_source_prompt_like", "field": "next_work", "rowIndex": row_index})
    if _is_sensitive(record):
        diagnostics.append({"code": "pm_source_sensitive", "field": "next_work", "rowIndex": row_index})


def _summary(record: dict[str, Any]) -> str:
    next_work = _text(record.get("next_work"))
    blocker = _text(record.get("blocker"))
    status = _text(record.get("status"))
    packet_id = _text(record.get("packet_id"))
    if _is_sensitive(record):
        return f"{packet_id} PM coordination source recorded; sensitive PM source omitted."
    if _is_prompt_like(record):
        return f"{packet_id} PM coordination source recorded; prompt-like PM source omitted."
    if _claims_approval_authority(record):
        return f"{packet_id} PM coordination source recorded; approval overclaim omitted."
    pieces = [piece for piece in [f"{packet_id} status {status}" if packet_id or status else "", next_work, blocker] if piece]
    return "; ".join(pieces)[:240]


def _category(record: dict[str, Any]) -> str:
    if _text(record.get("blocker")):
        return "open_risk"
    return "known_friction"


def _freshness_status(record: dict[str, Any]) -> str:
    value = _text(record.get("freshness_status")).lower()
    return value if value in {"fresh", "stale", "unknown"} else "unknown"


def _claims_approval_authority(record: dict[str, Any]) -> bool:
    haystack = " ".join(
        _text(record.get(field))
        for field in ("status", "blocker", "next_work", "title")
    )
    return bool(APPROVAL_AUTHORITY_PATTERN.search(haystack))


def _is_prompt_like(record: dict[str, Any]) -> bool:
    haystack = " ".join(
        _text(record.get(field))
        for field in ("blocker", "next_work", "title")
    )
    return bool(PROMPT_LIKE_PATTERN.search(haystack))


def _is_sensitive(record: dict[str, Any]) -> bool:
    haystack = " ".join(
        _text(record.get(field))
        for field in ("blocker", "next_work", "title")
    )
    return bool(SENSITIVE_PATTERN.search(haystack))


def _text(value: Any) -> str:
    return str(value or "").strip()
