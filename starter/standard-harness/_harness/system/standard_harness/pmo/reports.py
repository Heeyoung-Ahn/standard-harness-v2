"""PM daily report contract."""

from __future__ import annotations

from typing import Any


REPORT_LINE_LIMIT = 60


class PmoDailyReportService:
    def build_day_start_report(
        self, sources: dict[str, Any], *, report_date: str
    ) -> dict[str, Any]:
        packet_id = _text(sources.get("packet_id")) or "unknown-packet"
        markdown = _render_report(
            title=f"Day Start {report_date}",
            sections=[
                ("Last State", [_packet_label(sources)]),
                ("Next Work", [_text(sources.get("next_work"))]),
                ("Blockers", _list(sources.get("blockers"))),
                ("Risks", _list(sources.get("risks"))),
                ("Decisions Needed", _list(sources.get("decisions_needed"))),
                ("Sources", _source_lines(sources)),
            ],
        )
        return _report(
            report_type="day-start",
            persistence="generated-view",
            report_path_prefix="_ops/views/pmo",
            report_date=report_date,
            packet_id=packet_id,
            source_watermark=sources.get("source_watermark"),
            evidence_index_path=sources.get("evidence_index_path"),
            markdown=markdown,
        )

    def build_day_wrap_up_report(
        self, sources: dict[str, Any], *, report_date: str
    ) -> dict[str, Any]:
        packet_id = _text(sources.get("packet_id")) or "unknown-packet"
        markdown = _render_report(
            title=f"Day Wrap-Up {report_date}",
            sections=[
                ("Completed Work", _list(sources.get("completed_work"))),
                ("Incomplete Work", _list(sources.get("incomplete_work"))),
                ("New Risks", _list(sources.get("risks"))),
                ("WBS Changes", _list(sources.get("wbs_changes"))),
                ("Next Work", [_text(sources.get("next_work"))]),
                ("Blockers", _list(sources.get("blockers"))),
                ("Questions", _list(sources.get("questions"))),
                ("Sources", _source_lines(sources)),
            ],
        )
        return _report(
            report_type="day-wrap-up",
            persistence="durable-markdown",
            report_path_prefix="product/docs/pmo",
            report_date=report_date,
            packet_id=packet_id,
            source_watermark=sources.get("source_watermark"),
            evidence_index_path=sources.get("evidence_index_path"),
            markdown=markdown,
        )


def _report(
    *,
    report_type: str,
    persistence: str,
    report_path_prefix: str,
    report_date: str,
    packet_id: str,
    source_watermark: Any,
    evidence_index_path: Any,
    markdown: str,
) -> dict[str, Any]:
    return {
        "report_type": report_type,
        "persistence": persistence,
        "report_path": f"{report_path_prefix}/{report_type}/{report_date}.md",
        "packet_id": packet_id,
        "authority": "coordination-only",
        "source_watermark": int(source_watermark or 0),
        "evidence_index_path": _text(evidence_index_path),
        "markdown": markdown,
    }


def _render_report(*, title: str, sections: list[tuple[str, list[str]]]) -> str:
    lines = [f"# {title}", "", "Authority: coordination-only", ""]
    for heading, values in sections:
        lines.append(f"## {heading}")
        clean_values = [value for value in values if _text(value)]
        if clean_values:
            lines.extend(f"- {value}" for value in clean_values)
        else:
            lines.append("- None")
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def _source_lines(sources: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    evidence_index_path = _text(sources.get("evidence_index_path"))
    closeout_report_path = _text(sources.get("closeout_report_path"))
    source_watermark = _text(sources.get("source_watermark"))
    if evidence_index_path:
        lines.append(f"Evidence index: {evidence_index_path}")
    if closeout_report_path:
        lines.append(f"Closeout report: {closeout_report_path}")
    if source_watermark:
        lines.append(f"Source watermark: {source_watermark}")
    return lines


def _packet_label(sources: dict[str, Any]) -> str:
    packet_id = _text(sources.get("packet_id")) or "unknown-packet"
    packet_title = _text(sources.get("packet_title"))
    return f"{packet_id}: {packet_title}" if packet_title else packet_id


def _list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [_text(item) for item in value if _text(item)]
    text = _text(value)
    return [text] if text else []


def _text(value: Any) -> str:
    return str(value or "").strip()
