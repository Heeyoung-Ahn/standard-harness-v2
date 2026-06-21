"""Source range helpers for SSOT extraction."""

from __future__ import annotations


def line_range_until_next_heading(lines: list[str], start_index: int) -> dict[str, int]:
    """Return 1-based source range for a requirement heading and body."""

    end_index = start_index
    for index in range(start_index + 1, len(lines)):
        if lines[index].lstrip().startswith("### "):
            break
        if lines[index].strip():
            end_index = index
    return {"start_line": start_index + 1, "end_line": end_index + 1}
