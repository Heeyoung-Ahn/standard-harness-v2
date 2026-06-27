import fs from "node:fs";
import path from "node:path";

export const OWNERSHIP_MAP_PATH = "reference/artifacts/REPOSITORY_LAYOUT_OWNERSHIP.json";

export const CHANGE_ZONES = new Set(["core", "load-bearing", "padded", "prototype"]);

const ROUTE_RANK = {
  "fast-path": 1,
  "packet-path": 2,
  "strict-path": 3
};

const ROUTE_IMPLICATION_TO_CLASS = {
  "fast-path-eligible": "fast-path",
  "packet-path": "packet-path",
  "strict-path": "strict-path",
  "production-forbidden": "strict-path"
};

export function normalizeChangeZone(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return CHANGE_ZONES.has(normalized) ? normalized : null;
}

export function readOwnershipMap({ repoRoot = process.cwd(), mapPath = OWNERSHIP_MAP_PATH } = {}) {
  const absolutePath = path.resolve(repoRoot, mapPath);
  if (!fs.existsSync(absolutePath)) {
    return {
      ok: false,
      mapPath,
      rules: [],
      errors: [`Ownership map missing: ${mapPath}`]
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      mapPath,
      rules: [],
      errors: [`Ownership map is malformed JSON: ${mapPath}: ${error.message}`]
    };
  }

  const rules = Array.isArray(parsed.rules) ? parsed.rules : [];
  const errors = [];
  rules.forEach((rule, index) => {
    const label = `rules[${index}]`;
    if (!rule.pathPattern) {
      errors.push(`${label} is missing pathPattern.`);
    }
    if (!rule.ownerLayer) {
      errors.push(`${label} is missing ownerLayer.`);
    }
    if (!normalizeChangeZone(rule.defaultChangeZone)) {
      errors.push(`${label} has invalid defaultChangeZone ${rule.defaultChangeZone ?? "missing"}.`);
    }
    if (!ROUTE_IMPLICATION_TO_CLASS[rule.routeImplication]) {
      errors.push(`${label} has invalid routeImplication ${rule.routeImplication ?? "missing"}.`);
    }
    if (!rule.exceptionRationale) {
      errors.push(`${label} is missing exceptionRationale.`);
    }
  });

  return {
    ok: errors.length === 0,
    mapPath,
    schemaVersion: parsed.schemaVersion ?? null,
    precedence: parsed.precedence ?? null,
    rules,
    errors
  };
}

export function classifyOwnershipPath(relativePath, ownershipMap) {
  const normalizedPath = normalizeRelativePath(relativePath);
  const rules = ownershipMap?.rules ?? [];
  const matches = rules
    .map((rule, index) => ({
      rule,
      index,
      regex: patternToRegex(rule.pathPattern),
      specificity: patternSpecificity(rule.pathPattern)
    }))
    .filter((candidate) => candidate.regex.test(normalizedPath))
    .sort((left, right) => right.specificity - left.specificity || left.index - right.index);

  const selected = matches[0] ?? null;
  if (!selected) {
    return {
      path: normalizedPath,
      matched: false,
      matchedRule: null,
      defaultChangeZone: "load-bearing",
      routeImplication: "packet-path",
      routeClass: "packet-path",
      ownerLayer: "unclassified",
      productionEligibility: "planner-review-required",
      exceptionRationale: "Unclassified paths default to Planner review instead of padded routing."
    };
  }

  const rule = selected.rule;
  return {
    path: normalizedPath,
    matched: true,
    matchedRule: rule.pathPattern,
    defaultChangeZone: normalizeChangeZone(rule.defaultChangeZone),
    routeImplication: rule.routeImplication,
    routeClass: ROUTE_IMPLICATION_TO_CLASS[rule.routeImplication],
    ownerLayer: rule.ownerLayer,
    productionEligibility: rule.productionEligibility ?? "allowed",
    exceptionRationale: rule.exceptionRationale
  };
}

export function evaluateChangeZoneClassification({
  repoRoot = process.cwd(),
  declaredChangeZone,
  changedFiles = [],
  requestedRouteClass = null
} = {}) {
  const declaredZone = normalizeChangeZone(declaredChangeZone);
  const files = uniquePaths(changedFiles);
  const diagnostics = [];
  const routeImplications = [];
  const errors = [];

  if (files.length === 0) {
    return {
      ok: true,
      declaredChangeZone: declaredZone,
      effectiveRouteClass: requestedRouteClass ?? "packet-path",
      diagnostics,
      routeImplications,
      errors,
      ownershipMap: null
    };
  }

  const ownershipMap = readOwnershipMap({ repoRoot });
  if (!ownershipMap.ok) {
    return {
      ok: false,
      declaredChangeZone: declaredZone,
      effectiveRouteClass: maxRouteClass([requestedRouteClass, "packet-path"]),
      diagnostics,
      routeImplications,
      errors: ownershipMap.errors,
      ownershipMap
    };
  }

  for (const filePath of files) {
    const classification = classifyOwnershipPath(filePath, ownershipMap);
    const expectedZone = classification.defaultChangeZone;
    const routeClass = classification.routeClass;
    const mismatch = declaredZone && declaredZone !== expectedZone;
    const unsafePadded =
      classification.matched &&
      declaredZone === "padded" &&
      (expectedZone === "core" || expectedZone === "load-bearing");
    const prototypeProductionBlocked =
      declaredZone === "prototype" && classification.routeImplication !== "production-forbidden";
    const status = unsafePadded || prototypeProductionBlocked
      ? "block"
      : mismatch || !classification.matched
        ? "promote"
        : "pass";

    routeImplications.push(routeClass);
    diagnostics.push({
      field: "Change zone",
      status,
      path: classification.path,
      current: declaredZone ?? "missing",
      expected: expectedZone,
      matchedRule: classification.matchedRule ?? "unclassified",
      routeImplication: classification.routeImplication,
      routeClass,
      ownerLayer: classification.ownerLayer,
      reason: changeZoneReason({ declaredZone, classification, unsafePadded, prototypeProductionBlocked }),
      nextAction: changeZoneNextAction({ status, routeClass })
    });
  }

  for (const diagnostic of diagnostics) {
    if (diagnostic.status === "block") {
      errors.push(
        `${diagnostic.path} declares Change zone ${diagnostic.current}, but ownership map expects ${diagnostic.expected} ` +
        `via ${diagnostic.matchedRule}; next action: ${diagnostic.nextAction}`
      );
    }
  }

  return {
    ok: errors.length === 0,
    declaredChangeZone: declaredZone,
    effectiveRouteClass: maxRouteClass([requestedRouteClass, ...routeImplications]),
    diagnostics,
    routeImplications,
    errors,
    ownershipMap
  };
}

export function parseChangedFilesOption(value) {
  if (!value || value === true) {
    return [];
  }
  return String(value)
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractFastPathChangedFiles(content = "") {
  const note = sliceMarkdownSection(content, "## Fast Path Note") ?? sliceMarkdownSection(content, "## Fast-Path Note");
  if (!note) {
    return [];
  }
  const match = note.match(/^\s*-\s*files changed\s*:\s*(.+)$/im);
  return parseChangedFilesOption(match?.[1] ?? "");
}

function changeZoneReason({ declaredZone, classification, unsafePadded, prototypeProductionBlocked }) {
  if (unsafePadded) {
    return "padded work cannot touch core or load-bearing ownership-map paths without Planner-approved reclassification.";
  }
  if (prototypeProductionBlocked) {
    return "prototype work is production-forbidden unless it stays inside prototype-owned paths or is promoted by a later modeling gate.";
  }
  if (!classification.matched) {
    return "path is unclassified and defaults to Planner-reviewed packet-path routing.";
  }
  if (declaredZone && declaredZone !== classification.defaultChangeZone) {
    return "declared change zone differs from the ownership-map default.";
  }
  return "declared change zone matches ownership-map default.";
}

function changeZoneNextAction({ status, routeClass }) {
  if (status === "block") {
    return "Reclassify the packet or move the change behind a Planner-approved boundary before implementation proceeds.";
  }
  if (status === "promote") {
    return `Use ${routeClass} routing or ask Planner to approve an exception.`;
  }
  return "Continue with the declared route.";
}

function maxRouteClass(values) {
  return values
    .filter(Boolean)
    .reduce((current, next) => {
      const normalizedNext = ROUTE_RANK[next] ? next : "packet-path";
      return ROUTE_RANK[normalizedNext] > ROUTE_RANK[current] ? normalizedNext : current;
    }, "fast-path");
}

function patternToRegex(pattern) {
  const normalized = normalizeRelativePath(pattern);
  let output = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "*" && next === "*") {
      output += ".*";
      index += 1;
      continue;
    }
    if (char === "*") {
      output += "[^/]*";
      continue;
    }
    output += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${output}$`);
}

function patternSpecificity(pattern) {
  return normalizeRelativePath(pattern).replaceAll("*", "").length;
}

function normalizeRelativePath(value) {
  return String(value ?? "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}

function uniquePaths(values) {
  return [...new Set((values ?? []).flatMap(parseChangedFilesOption).map(normalizeRelativePath).filter(Boolean))];
}

function sliceMarkdownSection(content, heading) {
  const start = String(content ?? "").indexOf(heading);
  if (start === -1) {
    return null;
  }
  const after = content.slice(start + heading.length);
  const next = after.match(/\n##\s+/);
  return content.slice(start, next ? start + heading.length + next.index : content.length);
}
