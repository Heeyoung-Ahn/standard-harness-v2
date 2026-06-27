export const CLOSEOUT_ENUMS = [
  {
    field: "Exit recommendation",
    expected: ["approved", "hold", "rejected", "pending"]
  },
  {
    field: "Source parity result",
    expected: ["pass", "fail", "pending", "not-needed"]
  },
  {
    field: "Validation / security / cleanup evidence",
    expected: ["pass", "fail", "pending", "not-needed"]
  }
];

const CLOSEOUT_CONTRACT_PAIRS = [
  ["Packet exit quality gate reference", "Packet exit metadata gate reference"],
  ["Exit recommendation", "Packet exit metadata exit recommendation"],
  ["Source parity result", "Packet exit metadata source parity result"],
  ["Validation / security / cleanup evidence", "Packet exit metadata validation / security / cleanup evidence"]
];

export const CLOSEOUT_REFERENCE = "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md";
export const NARRATIVE_DESTINATION = "Closeout notes or REVIEW_REPORT.md";

export const STRICT_LITERAL_ENUM_GUIDE = [
  {
    field: "Change zone",
    expected: ["core", "load-bearing", "padded", "prototype"],
    noteField: "Change-zone rationale"
  },
  {
    field: "Schema impact classification",
    expected: ["none", "not-needed", "not needed", "no", "low", "medium", "high", "conditional"],
    noteField: "Schema impact note"
  },
  ...CLOSEOUT_ENUMS.map((entry) => ({
    field: entry.field,
    expected: entry.expected,
    noteField: NARRATIVE_DESTINATION
  }))
];

export function inspectCloseoutEnums(packet) {
  const diagnostics = [];
  const closeout = packet.closeout;
  if (Object.keys(closeout).length === 0) {
    diagnostics.push(buildEnumDiagnostic({
      field: "Packet Exit Quality Gate",
      current: "missing",
      expected: ["## 15. Packet Exit Quality Gate"],
      metadataValue: null,
      message: "Packet is missing ## 15. Packet Exit Quality Gate."
    }));
    return diagnostics;
  }

  const reference = closeout["Packet exit quality gate reference"];
  if (reference && stripInlineFormatting(reference) !== CLOSEOUT_REFERENCE) {
    diagnostics.push(buildEnumDiagnostic({
      field: "Packet exit quality gate reference",
      current: reference,
      expected: [CLOSEOUT_REFERENCE],
      metadataValue: closeout["Packet exit metadata gate reference"] ?? null
    }));
  }

  for (const contract of CLOSEOUT_ENUMS) {
    const value = stripInlineFormatting(closeout[contract.field] ?? "").toLowerCase();
    if (value && !contract.expected.includes(value)) {
      diagnostics.push(buildEnumDiagnostic({
        field: contract.field,
        current: closeout[contract.field],
        expected: contract.expected,
        metadataValue: null
      }));
    }
  }

  for (const [legacyField, metadataField] of CLOSEOUT_CONTRACT_PAIRS) {
    const legacyValue = stripInlineFormatting(closeout[legacyField] ?? "");
    const metadataValue = stripInlineFormatting(closeout[metadataField] ?? "");
    if (!legacyValue || !metadataValue || legacyValue === metadataValue) {
      continue;
    }
    const expected = expectedValuesForCloseoutField(legacyField);
    diagnostics.push(buildEnumDiagnostic({
      field: legacyField,
      current: closeout[legacyField],
      expected,
      metadataValue: closeout[metadataField]
    }));
  }

  return diagnostics;
}

function buildEnumDiagnostic({ field, current, expected, metadataValue, message }) {
  const expectedText = expected.join(" | ");
  return {
    field,
    current: current || "missing",
    expected,
    metadataValue,
    narrativeDestination: NARRATIVE_DESTINATION,
    message:
      message ??
      `${field} has current value "${current || "missing"}"; expected one of ${expectedText}. Move narrative to ${NARRATIVE_DESTINATION}.`
  };
}

function expectedValuesForCloseoutField(field) {
  if (field === "Packet exit quality gate reference") {
    return [CLOSEOUT_REFERENCE];
  }
  return CLOSEOUT_ENUMS.find((contract) => contract.field === field)?.expected ?? ["exact metadata match"];
}

function stripInlineFormatting(value) {
  return String(value ?? "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^__|__$/g, "")
    .trim();
}
