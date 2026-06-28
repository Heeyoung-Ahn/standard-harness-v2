"""PMO WBS TSV contract."""

from __future__ import annotations

import csv
from io import StringIO
from typing import Any


REQUIRED_WBS_COLUMNS = [
    "wbs_id",
    "parent_id",
    "packet_id",
    "title",
    "status",
    "owner_role",
    "priority",
    "risk_level",
    "planned_start",
    "planned_finish",
    "evidence_index_path",
    "closeout_report_path",
    "updated_at",
]


def build_wbs_tsv(rows: list[dict[str, Any]]) -> str:
    output = StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=REQUIRED_WBS_COLUMNS,
        delimiter="\t",
        lineterminator="\n",
        extrasaction="ignore",
    )
    writer.writeheader()
    for row in rows:
        writer.writerow({column: _text(row.get(column)) for column in REQUIRED_WBS_COLUMNS})
    return output.getvalue()


def validate_wbs_tsv(tsv: str) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []
    reader = csv.DictReader(StringIO(tsv or ""), delimiter="\t")
    headers = reader.fieldnames or []
    for column in REQUIRED_WBS_COLUMNS:
        if column not in headers:
            diagnostics.append({"code": "missing_wbs_tsv_column", "field": column})
    rows = list(reader)
    if not rows:
        diagnostics.append({"code": "missing_wbs_tsv_row", "field": "rows"})
    for row_index, row in enumerate(rows):
        if not _text(row.get("evidence_index_path")):
            diagnostics.append(
                {
                    "code": "missing_wbs_evidence_index_path",
                    "field": "evidence_index_path",
                    "rowIndex": row_index,
                }
            )
        if not _text(row.get("closeout_report_path")):
            diagnostics.append(
                {
                    "code": "missing_wbs_closeout_report_path",
                    "field": "closeout_report_path",
                    "rowIndex": row_index,
                }
            )
    return {"ok": not diagnostics, "diagnostics": diagnostics}


def _text(value: Any) -> str:
    return str(value or "").strip()
