import fs from "node:fs";
import path from "node:path";

import { normalizeDeliveryRouteMode } from "./agent-routing.js";
import { resolveGateProfile } from "./gate-profiles.js";
import {
  normalizePacketHeaderValue,
  parseDelimitedList,
  readPacketBulletFieldValueFromContent,
  readPacketHeaderValueFromContent
} from "./lib/packet-markdown.js";

export function readPacketGateProfile(repoRoot, sourceRef) {
  return readPacketHeaderValue(repoRoot, sourceRef, "Gate profile");
}

export function readPacketReadyForCode(repoRoot, sourceRef) {
  return normalizeReadyForCodeState(readPacketHeaderValue(repoRoot, sourceRef, "Ready For Code"));
}

export function normalizeReadyForCodeState(value) {
  const normalized = normalizePacketHeaderValue(value);
  return normalized === "approved" || normalized === "approve" ? "approved" : normalized || null;
}

export function readPacketDeliveryRouteMode(repoRoot, sourceRef) {
  return normalizeDeliveryRouteMode(readPacketHeaderValue(repoRoot, sourceRef, "Delivery route mode"));
}

export function readPacketRouteClass(repoRoot, sourceRef) {
  const value = normalizePacketHeaderValue(readPacketHeaderValue(repoRoot, sourceRef, "Route class"));
  return ["fast-path", "packet-path", "strict-path"].includes(value) ? value : null;
}

export function readPacketBulletFieldValue(repoRoot, sourceRef, label) {
  const packetPath = resolvePacketMarkdownPath(repoRoot, null, sourceRef);
  if (!packetPath) {
    return null;
  }
  const content = fs.readFileSync(packetPath, "utf8");
  return readPacketBulletFieldValueFromContent(content, label);
}

export function readPacketHeaderValue(repoRoot, sourceRef, label) {
  const packetPath = resolvePacketMarkdownPath(repoRoot, null, sourceRef);
  if (!packetPath) {
    return null;
  }
  const content = fs.readFileSync(packetPath, "utf8");
  return readPacketHeaderValueFromContent(content, label);
}

export function resolvePacketMarkdownPath(repoRoot, packetPath, sourceRef) {
  const candidate = packetPath ?? sourceRef;
  if (!candidate || !candidate.endsWith(".md")) {
    return null;
  }
  const absolute = path.isAbsolute(candidate) ? candidate : path.join(repoRoot, candidate);
  return fs.existsSync(absolute) ? absolute : null;
}

export function inferPacketArtifactId(packetPath) {
  if (!packetPath) {
    return null;
  }
  return path.basename(packetPath, path.extname(packetPath));
}

export function readPacketSecurityReviewContract(repoRoot, sourceRef) {
  return {
    status: readPacketBulletFieldValue(repoRoot, sourceRef, "Security review evidence status"),
    scope: parseDelimitedList(readPacketBulletFieldValue(repoRoot, sourceRef, "Security review evidence scope")),
    declaredPaths: parseDelimitedList(readPacketBulletFieldValue(repoRoot, sourceRef, "Declared security/release paths"))
  };
}

export function readPacketSemanticTraceContract(repoRoot, sourceRef) {
  return {
    status: readPacketBulletFieldValue(repoRoot, sourceRef, "Semantic trace evidence status")
  };
}

export function plannerOpenRequiredManifestMarkers(gateProfile, options = {}) {
  const profile = resolveGateProfile(gateProfile);
  const markers = [...(profile?.requiredEvidence ?? [])];
  const closeoutRiskTier = normalizePacketHeaderValue(
    readPacketBulletFieldValue(options.repoRoot, options.packetPath, "Closeout risk tier")
  );
  if (
    profile?.id === "contract" &&
    (closeoutRiskTier === "low-risk" || closeoutRiskTier === "low-risk-planner-closeout")
  ) {
    return markers.filter((marker) => marker !== "review closeout");
  }
  return markers;
}

export function formatTaskPacketSemanticFinding(finding) {
  const details = [
    finding.code ? `code=${finding.code}` : null,
    finding.headerItem ? `field=${finding.headerItem}` : null,
    finding.field ? `field=${finding.field}` : null
  ].filter(Boolean);
  return `Task packet semantic preflight failed: ${finding.message}${details.length > 0 ? ` (${details.join("; ")})` : ""}`;
}
