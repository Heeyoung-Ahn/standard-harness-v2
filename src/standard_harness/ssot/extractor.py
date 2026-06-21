"""Markdown SSOT extraction for explicit requirement identifiers."""

from __future__ import annotations

import re
from typing import Any

from standard_harness.ssot.source_ranges import line_range_until_next_heading


REQUIREMENT_HEADING = re.compile(r"^###\s+(?P<requirement_id>[A-Za-z0-9_-]+)\s+\[(?P<classification>[^\]]+)\]\s*$")


class SsotExtractor:
    """Extract reviewable requirement entries from Markdown."""

    def extract_markdown(
        self, *, source_doc: str, content: str, source_snapshot: str
    ) -> dict[str, Any]:
        lines = content.splitlines()
        entries = []
        for index, line in enumerate(lines):
            match = REQUIREMENT_HEADING.match(line.strip())
            if not match:
                continue
            source_range = line_range_until_next_heading(lines, index)
            entries.append(
                {
                    "requirement_id": match.group("requirement_id"),
                    "classification": match.group("classification"),
                    "source_doc": source_doc,
                    "source_snapshot": source_snapshot,
                    "source_range": source_range,
                    "parser_confidence": "high",
                    "summary": _body_summary(lines, index + 1),
                }
            )
        return {
            "status": "review_required" if entries else "empty",
            "source_doc": source_doc,
            "source_snapshot": source_snapshot,
            "entries": entries,
            "promoted": False,
        }


def _body_summary(lines: list[str], start_index: int) -> str:
    body_lines = []
    for index in range(start_index, len(lines)):
        line = lines[index]
        if line.lstrip().startswith("### "):
            break
        if line.strip():
            body_lines.append(line.strip())
    return " ".join(body_lines)
