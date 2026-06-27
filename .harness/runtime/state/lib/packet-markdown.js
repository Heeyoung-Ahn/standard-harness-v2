export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizePacketHeaderValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, "-");
}

export function parseDelimitedList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  return String(value ?? "")
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseMarkdownTable(sectionContent) {
  if (!sectionContent) {
    return null;
  }

  const tableLines = sectionContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));
  if (tableLines.length < 2) {
    return null;
  }

  const headers = parseMarkdownTableRow(tableLines[0]);
  const separator = parseMarkdownTableRow(tableLines[1]);
  if (headers.length === 0 || !isMarkdownTableSeparator(separator)) {
    return null;
  }

  const rows = tableLines.slice(2).map((line) => {
    const cells = parseMarkdownTableRow(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  return { headers, rows };
}

export function parseMarkdownTableRow(line) {
  return parseTableCells(line);
}

export function parseTableCells(line) {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

export function readFirstMarkdownTableBodyLines(sectionContent) {
  if (typeof sectionContent !== "string" || sectionContent.trim().length === 0) {
    return [];
  }

  const lines = sectionContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headerIndex = lines.findIndex((line, index) =>
    line.startsWith("|") &&
    lines[index + 1] &&
    /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[index + 1])
  );
  if (headerIndex === -1) {
    return [];
  }

  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("|")) {
      break;
    }
    rows.push(line);
  }
  return rows;
}

export function readLabeledBulletValue(sectionContent, label) {
  if (!sectionContent) {
    return null;
  }

  const matcher = new RegExp(`^-\\s*${escapeRegExp(label)}\\s*:\\s*(.*)$`, "i");
  for (const rawLine of sectionContent.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(matcher);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

export function readPacketBulletFieldValueFromContent(content, label) {
  return readLabeledBulletValue(content, label.trim());
}

export function readPacketHeaderValueFromContent(content, label) {
  const target = label.trim().toLowerCase();
  const row = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().startsWith(`| ${target} |`) || new RegExp(`^\\|\\s*${escapeRegExp(target)}\\s*\\|`, "i").test(line));
  return row ? row.split("|")[2]?.trim() : null;
}

export function sliceSection(content, sectionHeading) {
  const start = content.indexOf(sectionHeading);
  if (start === -1) {
    return null;
  }

  const afterStart = content.slice(start + sectionHeading.length).trimStart();
  const nextHeadingMatch = afterStart.match(/\n##\s+/);
  if (!nextHeadingMatch) {
    return afterStart;
  }

  return afterStart.slice(0, nextHeadingMatch.index).trimEnd();
}

function isMarkdownTableSeparator(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}
