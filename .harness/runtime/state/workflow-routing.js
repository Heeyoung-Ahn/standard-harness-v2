import fs from "node:fs";
import path from "node:path";

import { resolveArtifactPath } from "./harness-paths.js";

export const CURRENT_STATE_NEXT_AGENT_SECTION = "## Next Recommended Agent";
const CANONICAL_TASK_LIST_PATH = ".agents/artifacts/TASK_LIST.md";
export const WORKFLOW_CONTRACT_SECTIONS = [
  "## Role",
  "## Mission",
  "## Authority",
  "## Non-Authority",
  "## Must Read SSOT",
  "## Allowed Actions",
  "## Forbidden Actions",
  "## Required Outputs",
  "## Turn Close Reporting",
  "## Handoff Rules",
  "## Stop Conditions",
  "## Escalation Rules"
];

const HANDOFF_WORKFLOW_ROUTES = [
  { canonicalRole: "orchestrator", workflow: ".agents/workflows/orchestrator.md", aliases: ["orchestrator", "orchestration", "delivery orchestrator", "delivery controller", "workflow orchestrator", "오케스트레이터", "오케스트레이션"] },
  { canonicalRole: "project_manager", workflow: ".agents/workflows/project_manager.md", aliases: ["pm", "project manager", "project management", "program manager", "프로젝트 매니저", "프로젝트 관리", "프로젝트관리"] },
  { canonicalRole: "tester", workflow: ".agents/workflows/tester.md", aliases: ["tester", "qa", "test", "테스터", "테스트"] },
  { canonicalRole: "developer", workflow: ".agents/workflows/developer.md", aliases: ["developer", "implementer", "dev", "coder", "개발자", "구현"] },
  { canonicalRole: "designer", workflow: ".agents/workflows/designer.md", aliases: ["designer", "design", "ux", "ui", "디자이너", "디자인"] },
  { canonicalRole: "reviewer", workflow: ".agents/workflows/reviewer.md", aliases: ["reviewer", "review", "리뷰어", "리뷰"] },
  { canonicalRole: "deployer", workflow: ".agents/workflows/deployer.md", aliases: ["deployer", "deploy", "release", "release operator", "operator", "배포", "릴리즈"] },
  { canonicalRole: "documenter", workflow: ".agents/workflows/documenter.md", aliases: ["documenter", "documentation", "doc", "closeout", "문서", "정리"] },
  { canonicalRole: "handoff_coordinator", workflow: ".agents/workflows/handoff_coordinator.md", aliases: ["handoff coordinator", "handoff", "router", "handover", "인계"] },
  { canonicalRole: "planner", workflow: ".agents/workflows/planner.md", aliases: ["planner", "maintainer", "planning", "기획", "유지보수"] }
];
const PLANNER_WORKFLOW = ".agents/workflows/planner.md";

const SKILL_ROUTES = [
  { skill: ".agents/skills/day_wrap_up/SKILL.md", canonicalSkill: "day_wrap_up", aliases: ["day wrap up", "day-wrap-up", "day_wrap_up", "wrap up", "wrap-up", "day close", "day closing", "오늘 일과", "일과 마무리", "마무리"] },
  { skill: ".agents/skills/day_start/SKILL.md", canonicalSkill: "day_start", aliases: ["day start", "day-start", "day_start", "start day", "session start", "하루 시작", "업무 시작"] },
  { skill: ".agents/skills/writing-plans/SKILL.md", canonicalSkill: "writing-plans", aliases: ["writing plans", "write plan", "planning skill", "implementation plan", "packet plan", "refactoring plan", "remaining implementation plan", "계획 수립", "패킷 계획", "구현 계획"] },
  { skill: ".agents/skills/executing-plans/SKILL.md", canonicalSkill: "executing-plans", aliases: ["executing plans", "execute plan", "implement packet", "approved packet", "work packet implementation", "진행하세요", "구현하세요", "패킷 구현"] },
  { skill: ".agents/skills/verification-before-completion/SKILL.md", canonicalSkill: "verification-before-completion", aliases: ["verification before completion", "verify before completion", "completion verification", "closeout verification", "완료 검증", "검증 후 완료"] },
  { skill: ".agents/skills/requesting-code-review/SKILL.md", canonicalSkill: "requesting-code-review", aliases: ["request code review", "requesting code review", "subagent review", "review with subagent", "검토하세요", "서브 에이전트로 검토"] },
  { skill: ".agents/skills/receiving-code-review/SKILL.md", canonicalSkill: "receiving-code-review", aliases: ["receiving code review", "address review", "review feedback", "review findings", "검토의견", "리뷰 의견"] },
  { skill: ".agents/skills/security-review/SKILL.md", canonicalSkill: "security-review", aliases: ["security review", "security-sensitive", "guarded review", "prompt control review", "보안 검토", "보안"] },
  { skill: ".agents/skills/destructive-command-guard/SKILL.md", canonicalSkill: "destructive-command-guard", aliases: ["destructive command", "delete files", "remove files", "recursive delete", "git reset", "cleanup command", "삭제", "정리 명령"] },
  { skill: ".agents/skills/operator-support/SKILL.md", canonicalSkill: "operator-support", aliases: ["operator support", "status summary", "next packet", "next safe action", "what remains", "남은 패킷", "다음 패킷", "상태 알려"] },
  { skill: ".agents/skills/subagent-driven-development/SKILL.md", canonicalSkill: "subagent-driven-development", aliases: ["subagent-driven development", "parallel agents", "subagents", "spawn agents", "서브 에이전트", "병렬 에이전트"] },
  { skill: ".agents/skills/compound-learning/SKILL.md", canonicalSkill: "compound-learning", aliases: ["compound learning", "preventive memory", "capture learning", "reusable lesson", "학습 기록", "예방 메모리"] },
  { skill: ".agents/skills/memory-search/SKILL.md", canonicalSkill: "memory-search", aliases: ["memory search", "prior learning", "search memory", "happened before", "이전 학습", "메모리 검색"] },
  { skill: ".agents/skills/requirements_deep_interview/SKILL.md", canonicalSkill: "requirements_deep_interview", aliases: ["requirements deep interview", "requirements interview", "deep interview", "요구사항 인터뷰"] },
  { skill: ".agents/skills/architecture_design/SKILL.md", canonicalSkill: "architecture_design", aliases: ["architecture design", "architecture", "architecture guide", "아키텍처"] },
  { skill: ".agents/skills/adversarial_review/SKILL.md", canonicalSkill: "adversarial_review", aliases: ["adversarial review", "challenge review", "packet challenge"] },
  { skill: ".agents/skills/code_review_checklist/SKILL.md", canonicalSkill: "code_review_checklist", aliases: ["code review checklist", "review checklist"] },
  { skill: ".agents/skills/epic_story_decompose/SKILL.md", canonicalSkill: "epic_story_decompose", aliases: ["epic story decompose", "story decompose", "decompose epic", "packet decomposition", "작업 분해", "에픽 분해"] },
  { skill: ".agents/skills/forensic_investigation/SKILL.md", canonicalSkill: "forensic_investigation", aliases: ["forensic investigation", "root cause investigation", "investigate evidence", "원인 조사", "증거 조사"] },
  { skill: ".agents/skills/retrospective/SKILL.md", canonicalSkill: "retrospective", aliases: ["retrospective", "retro", "lessons learned", "회고"] },
  { skill: ".agents/skills/conflict_resolver/SKILL.md", canonicalSkill: "conflict_resolver", aliases: ["conflict resolver", "resolve conflict", "agent conflict", "충돌 해결", "충돌"] },
  { skill: ".agents/skills/version_closeout/SKILL.md", canonicalSkill: "version_closeout", aliases: ["version closeout", "release closeout", "version wrap", "버전 종료", "릴리즈 정리"] },
  { skill: ".agents/skills/korean-artifact-utf8-guard/SKILL.md", canonicalSkill: "korean-artifact-utf8-guard", aliases: ["korean utf8", "utf8 guard", "korean artifact", "한국어 인코딩", "utf-8"] },
  { skill: ".agents/skills/dependency_audit/SKILL.md", canonicalSkill: "dependency_audit", aliases: ["dependency audit", "dependency review", "supply chain"] },
  { skill: ".agents/skills/frontend_design/SKILL.md", canonicalSkill: "frontend_design", aliases: ["frontend design", "ui design", "ux design"] },
  { skill: ".agents/skills/github_deploy/SKILL.md", canonicalSkill: "github_deploy", aliases: ["github deploy", "github deployment", "github actions"] },
  { skill: ".agents/skills/general_publish/SKILL.md", canonicalSkill: "general_publish", aliases: ["general publish", "publish", "release readiness"] },
  { skill: ".agents/skills/feature-artifact-sync/SKILL.md", canonicalSkill: "feature-artifact-sync", aliases: ["feature artifact sync", "artifact sync", "sync feature artifact"] },
  { skill: ".agents/skills/operating-common-rollout/SKILL.md", canonicalSkill: "operating-common-rollout", aliases: ["operating rollout", "common rollout", "rollout"] }
];

export function prioritizeOpenWorkItems(workItems = [], { repoRoot = null } = {}) {
  const lifecycleHints = repoRoot ? readCanonicalTaskLifecycleHints({ repoRoot }) : null;
  return workItems
    .filter((workItem) => !isClosedStatus(workItem.status))
    .filter((workItem) => !isCanonicallyClosedWorkItem(workItem, lifecycleHints))
    .sort(compareActiveWorkItems);
}

export function selectActiveWorkItem(workItems = [], options = {}) {
  return prioritizeOpenWorkItems(workItems, options)[0] ?? null;
}

export function readCanonicalTaskLifecycleHints({ repoRoot = process.cwd() } = {}) {
  const taskListPath = path.resolve(repoRoot, CANONICAL_TASK_LIST_PATH);
  if (!fs.existsSync(taskListPath)) {
    return null;
  }

  const content = fs.readFileSync(taskListPath, "utf8");
  return {
    active: new Set(readTaskIdsFromTable(content, "## Active Tasks")),
    completed: new Set(readTaskIdsFromTable(content, "## Completed Tasks"))
  };
}

export function isCanonicallyClosedWorkItem(workItem, lifecycleHints) {
  if (!lifecycleHints?.completed?.size || !workItem?.workItemId) {
    return false;
  }
  if (lifecycleHints.active.has(workItem.workItemId)) {
    return false;
  }
  return lifecycleHints.completed.has(workItem.workItemId);
}

export function workflowForOwner(owner) {
  const matchingRoutes = matchingWorkflowRoutesForOwner(owner);
  if (matchingRoutes.length !== 1) {
    return "manual_selection_required";
  }

  return matchingRoutes[0].workflow;
}

export function resolveOperatorRequestRouting(request, options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const normalized = normalizeOwnerText(request);
  const roleMatches = matchingWorkflowRoutesForOwner(request);
  const skillMatches = matchingSkillRoutesForRequest(request, { repoRoot });
  const explicitSubagentRequest = hasExplicitSubagentRequest(normalized);
  const preExecutionReview = assessOperatorRequestPreExecution({
    request,
    activeTask: options.activeTask ?? null,
    approvalBoundary: options.approvalBoundary ?? null,
    doNotCross: options.doNotCross ?? []
  });
  const roleStatus = roleMatches.length === 1 ? "resolved" : roleMatches.length > 1 ? "ambiguous" : "not_requested";
  const compatibleSkillMatches = compatibleSkillSet(skillMatches, { explicitSubagentRequest });
  const skillStatus =
    skillMatches.length === 0
      ? "not_requested"
      : skillMatches.length === 1
        ? "resolved"
        : compatibleSkillMatches
          ? "resolved_multiple"
          : "ambiguous";
  const primarySkillMatch =
    skillStatus === "resolved"
      ? skillMatches[0]
      : skillStatus === "resolved_multiple"
        ? choosePrimarySkill(compatibleSkillMatches)
        : null;
  const compatibleSkills =
    skillStatus === "resolved_multiple"
      ? compatibleSkillMatches.map((match) => ({
          canonicalSkill: match.canonicalSkill,
          skill: match.skill
        }))
      : skillStatus === "resolved"
        ? [{ canonicalSkill: skillMatches[0].canonicalSkill, skill: skillMatches[0].skill }]
        : [];

  return {
    roleStatus,
    canonicalRole: roleStatus === "resolved" ? roleMatches[0].canonicalRole : null,
    workflow: roleStatus === "resolved" ? roleMatches[0].workflow : roleStatus === "ambiguous" ? "manual_selection_required" : null,
    skillStatus,
    canonicalSkill: primarySkillMatch?.canonicalSkill ?? null,
    skill: primarySkillMatch?.skill ?? (skillStatus === "ambiguous" ? "manual_selection_required" : null),
    compatibleSkills,
    skillAudit: buildSkillRoutingAudit({ skillStatus, primarySkillMatch, compatibleSkills, skillMatches }),
    preExecutionReview,
    explicitSubagentRequest,
    spawnSubagents: explicitSubagentRequest,
    boundary:
      roleStatus === "resolved" && (skillStatus === "resolved" || skillStatus === "resolved_multiple")
        ? "Use the resolved role contract and matching skill together; the stricter approval, packet, security, and role authority boundary applies."
        : skillStatus === "resolved_multiple"
          ? "Use the compatible matching skills together; the stricter approval, packet, security, and role authority boundary applies."
        : "Use only resolved contracts; ambiguous role or skill aliases require clarification before action."
  };
}

function compatibleSkillSet(skillMatches, { explicitSubagentRequest = false } = {}) {
  if (skillMatches.length <= 1) {
    return skillMatches.length === 1 ? skillMatches : null;
  }

  const names = new Set(skillMatches.map((match) => match.canonicalSkill));
  if (
    explicitSubagentRequest &&
    names.has("subagent-driven-development") &&
    [...names].every((name) =>
      [
        "subagent-driven-development",
        "requesting-code-review",
        "receiving-code-review",
        "adversarial_review",
        "code_review_checklist"
      ].includes(name)
    )
  ) {
    return skillMatches;
  }

  const compatibleCrossCuttingSkills = new Set([
    "executing-plans",
    "verification-before-completion",
    "requesting-code-review",
    "receiving-code-review",
    "security-review",
    "feature-artifact-sync",
    "dependency_audit",
    "destructive-command-guard",
    "memory-search",
    "operator-support"
  ]);
  if ([...names].every((name) => compatibleCrossCuttingSkills.has(name))) {
    return skillMatches;
  }

  return null;
}

function choosePrimarySkill(skillMatches) {
  const priority = [
    "destructive-command-guard",
    "security-review",
    "executing-plans",
    "verification-before-completion",
    "requesting-code-review",
    "feature-artifact-sync",
    "operator-support",
    "subagent-driven-development"
  ];
  return (
    priority.map((name) => skillMatches.find((match) => match.canonicalSkill === name)).find(Boolean) ??
    skillMatches.find((match) => match.canonicalSkill !== "subagent-driven-development") ??
    skillMatches[0] ??
    null
  );
}

function buildSkillRoutingAudit({ skillStatus, primarySkillMatch, compatibleSkills, skillMatches }) {
  const used =
    skillStatus === "resolved_multiple"
      ? compatibleSkills.map((skill) => skill.canonicalSkill)
      : primarySkillMatch
        ? [primarySkillMatch.canonicalSkill]
        : [];
  const consideredButSkipped = skillMatches
    .map((match) => match.canonicalSkill)
    .filter((name) => !used.includes(name));
  const statusText = used.length
    ? `Using skills: ${used.join(", ")}.`
    : skillMatches.length
      ? "Skill routing needs clarification before substantive work."
      : "No matching skill needed for this request.";
  return {
    used,
    consideredButSkipped,
    notNeeded: used.length || consideredButSkipped.length ? [] : ["no matching active skill trigger"],
    announcement: statusText,
    closeoutAudit: `skills: used=${used.join(",") || "none"}; considered_but_skipped=${consideredButSkipped.join(",") || "none"}; not_needed=${used.length || consideredButSkipped.length ? "none" : "no matching active skill trigger"}`
  };
}

export function assessOperatorRequestPreExecution({
  request,
  activeTask = null,
  approvalBoundary = null,
  doNotCross = []
} = {}) {
  const actionClass = classifyPlannerFallbackAction(request);
  const reviewRequired = ["mutation", "approval_or_closeout"].includes(actionClass);
  const findings = [];
  const normalized = normalizeOwnerText(request);
  const boundaryText = normalizeOwnerText([approvalBoundary, ...doNotCross].filter(Boolean).join(" "));
  const activeText = normalizeOwnerText([activeTask?.workItemId, activeTask?.title].filter(Boolean).join(" "));
  const productRequested = /\b(sample[- ]?analytics|dashboard|product)\b|대시보드/.test(normalized);
  const harnessActive = /ops-harness|harness|starter|skill routing|starter boundary/.test(activeText);
  const productForbidden = /no sample product implementation|harness improvement|approved only for ops-harness/.test(boundaryText);

  if (!reviewRequired) {
    return {
      decision: "proceed",
      reviewRequired: false,
      actionClass,
      findings,
      nextAction: "Proceed directly; request is low-risk read/status/test class."
    };
  }

  if (productRequested && (harnessActive || productForbidden)) {
    findings.push({
      code: "outside_active_packet_scope",
      severity: "hold",
      message:
        "The request appears to ask for sample product work while the active approved packet is a harness improvement."
    });
  }

  if (/generated state|active_context|current_state|task_list/.test(normalized) && /\b(edit|modify|rewrite|manual|수정)\b/.test(normalized)) {
    findings.push({
      code: "generated_state_manual_edit_risk",
      severity: "hold",
      message: "Generated summaries must be regenerated through harness commands instead of manually edited."
    });
  }

  return {
    decision: findings.length ? "correct" : "proceed",
    reviewRequired: true,
    actionClass,
    findings,
    nextAction: findings.length
      ? "Propose a corrected interpretation inside the approved harness packet or ask for explicit Planner/user confirmation."
      : "Proceed after applying the active packet, workflow, terminology, approval, and security boundaries."
  };
}

export function resolveHandoffExecution({
  repoRoot = process.cwd(),
  workItems = [],
  latestHandoff = null,
  includeWorkflowDetails = false
} = {}) {
  const currentStateNextAgent = resolveCurrentStateNextAgent({ repoRoot });
  const activeWorkItem = selectActiveWorkItem(workItems, { repoRoot });
  const resolvedBy = activeWorkItem?.owner
    ? "active_task_owner"
    : latestHandoff?.toRole
      ? "latest_handoff"
      : "default_planner";
  const owner = activeWorkItem?.owner ?? latestHandoff?.toRole ?? "planner";
  const nextAction = activeWorkItem?.nextAction ?? latestHandoff?.payload?.nextFirstAction ?? null;
  const workflow = workflowForOwner(owner);
  const workflowDetailsForStatus = readWorkflowDetails({ repoRoot, workflow });
  const workflowDetails = includeWorkflowDetails ? workflowDetailsForStatus : null;
  const plannerFallback = assessPlannerFallback({ resolvedBy, workflow, nextAction });
  const routeStatus = workflow === "manual_selection_required"
    ? "manual_selection_required"
    : plannerFallback.blocked
      ? "planner_fallback_blocked"
    : workflowDetailsForStatus && !workflowDetailsForStatus.exists
      ? "workflow_missing"
      : workflowDetailsForStatus?.missingSections?.length
        ? "workflow_contract_incomplete"
      : "ready";

  return {
    routeStatus,
    resolvedBy,
    owner,
    workflow,
    currentStateNextAgent,
    nextAction,
    plannerFallback,
    task: activeWorkItem
      ? {
          workItemId: activeWorkItem.workItemId,
          title: activeWorkItem.title,
          owner: activeWorkItem.owner ?? "unassigned",
          status: activeWorkItem.status,
          nextAction: activeWorkItem.nextAction ?? "not recorded"
        }
      : null,
    handoff: latestHandoff
      ? {
          createdAt: latestHandoff.createdAt,
          fromRole: latestHandoff.fromRole ?? "unknown",
          toRole: latestHandoff.toRole ?? "unknown",
          summary: latestHandoff.handoffSummary
        }
      : null,
    workflowDetails,
    commandHints: {
      npm: "npm run harness:handoff",
      portable: "HARNESS.cmd handoff"
    }
  };
}

function assessPlannerFallback({ resolvedBy, workflow, nextAction }) {
  const applies = workflow === PLANNER_WORKFLOW && resolvedBy !== "active_task_owner";
  const actionClass = classifyPlannerFallbackAction(nextAction);
  const allowed = !applies || actionClass === "planning" || !normalizeOwnerText(nextAction);
  return {
    applies,
    allowed,
    actionClass,
    blocked: applies && !allowed,
    reason:
      applies && !allowed
        ? "Planner fallback is limited to non-mutating planning work. Resolve an explicit workflow before implementation, testing, review closeout, or approval-state work."
        : null
  };
}

function classifyPlannerFallbackAction(nextAction) {
  const normalized = normalizeOwnerText(nextAction);
  if (!normalized) {
    return "unknown";
  }

  if (
    /\b(plan|planning|requirements?|decompose|decomposition|organize|organise|clarify|triage|review meaning|review scope|review architecture|open the next planning lane|choose the next approved lane)\b/.test(
      normalized
    )
  ) {
    return "planning";
  }
  if (/\b(test|tester|verify|verification|validate|validation|qa)\b/.test(normalized)) {
    return "verification";
  }
  if (/\b(closeout|reviewer|review readiness|packet exit|approve|approval|sign off|signoff)\b/.test(normalized)) {
    return "approval_or_closeout";
  }
  if (
    /\b(implement|implementation|modify|change|edit|update|write|create|add|remove|delete|rename|refactor|patch|fix|migrate|sync|regenerate|apply)\b/.test(
      normalized
    ) ||
    /(구현|수정|변경|작성|생성|추가|삭제|패치|적용|동기화|재생성)/.test(normalized)
  ) {
    return "mutation";
  }
  return "unknown";
}

function matchingWorkflowRoutesForOwner(owner) {
  const normalized = normalizeOwnerText(owner);
  if (!normalized) {
    return [];
  }

  return HANDOFF_WORKFLOW_ROUTES.filter((candidate) =>
    candidate.aliases.some((alias) => aliasMatchesOwner(normalized, alias))
  );
}

function matchingSkillRoutesForRequest(request, { repoRoot = process.cwd() } = {}) {
  const normalized = normalizeOwnerText(request);
  if (!normalized) {
    return [];
  }

  return activeSkillRoutes({ repoRoot }).filter((candidate) =>
    candidate.aliases.some((alias) => aliasMatchesOwner(normalized, alias))
  );
}

function activeSkillRoutes({ repoRoot = process.cwd() } = {}) {
  const routes = [...SKILL_ROUTES];
  const seen = new Set(routes.map((route) => route.canonicalSkill));
  const skillsRoot = path.resolve(repoRoot, ".agents", "skills");
  if (!fs.existsSync(skillsRoot)) {
    return routes;
  }

  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const canonicalSkill = entry.name;
    if (seen.has(canonicalSkill)) continue;
    const relativeSkillPath = `.agents/skills/${canonicalSkill}/SKILL.md`;
    const absoluteSkillPath = path.join(skillsRoot, canonicalSkill, "SKILL.md");
    if (!fs.existsSync(absoluteSkillPath)) continue;
    const content = fs.readFileSync(absoluteSkillPath, "utf8");
    const aliases = discoverSkillAliases({ canonicalSkill, content });
    routes.push({ skill: relativeSkillPath, canonicalSkill, aliases });
    seen.add(canonicalSkill);
  }
  return routes;
}

function discoverSkillAliases({ canonicalSkill, content }) {
  const aliases = new Set([
    canonicalSkill,
    canonicalSkill.replaceAll("-", " "),
    canonicalSkill.replaceAll("_", " ")
  ]);
  const descriptionMatch = content.match(/^description:\s*(.+)$/m);
  if (descriptionMatch) {
    for (const alias of triggerAliasesFromText(descriptionMatch[1])) aliases.add(alias);
  }
  const useWhen = sliceSection(content, "## Use When");
  for (const line of extractList(useWhen).slice(0, 6)) {
    for (const alias of triggerAliasesFromText(line)) aliases.add(alias);
  }
  return [...aliases].filter(Boolean);
}

function triggerAliasesFromText(text) {
  const cleaned = normalizeOwnerText(text)
    .replace(/^use (this skill )?when\s+/, "")
    .replace(/^사용\s+시점[:：]?\s*/, "")
    .replace(/[.,;:()[\]`"'“”]/g, " ");
  const words = cleaned.split(/\s+/).filter((word) => word.length > 2 && !["the", "and", "for", "with", "when", "this", "that", "need", "needs"].includes(word));
  const aliases = [];
  for (let size = Math.min(4, words.length); size >= 2; size -= 1) {
    aliases.push(words.slice(0, size).join(" "));
  }
  if (words[0]) aliases.push(words[0]);
  return aliases;
}

function hasExplicitSubagentRequest(normalizedText) {
  if (!normalizedText) {
    return false;
  }
  return /\bsubagents?\b|\bparallel agents?\b|\bspawn agents?\b|서브\s*에이전트|병렬\s*에이전트/.test(normalizedText);
}

export function resolveCurrentStateNextAgent({ repoRoot = process.cwd() } = {}) {
  const currentStatePath = resolveArtifactPath(repoRoot, "active");
  if (!fs.existsSync(currentStatePath)) {
    return null;
  }

  const sectionContent = sliceSection(
    fs.readFileSync(currentStatePath, "utf8"),
    CURRENT_STATE_NEXT_AGENT_SECTION
  );
  return extractFirstValue(sectionContent);
}

function readWorkflowDetails({ repoRoot, workflow }) {
  if (!workflow || workflow === "manual_selection_required") {
    return null;
  }

  const workflowPath = path.resolve(path.resolve(repoRoot), workflow);
  if (!fs.existsSync(workflowPath)) {
    return {
      path: workflow,
      exists: false,
      role: null,
      mission: [],
      authority: [],
      nonAuthority: [],
      mustReadSsot: [],
      allowedActions: [],
      forbiddenActions: [],
      requiredOutputs: [],
      turnCloseReporting: [],
      handoffRules: [],
      stopConditions: [],
      escalationRules: [],
      missingSections: [...WORKFLOW_CONTRACT_SECTIONS],
      purpose: [],
      readFirst: [],
      doSteps: [],
      stopWhen: []
    };
  }

  const content = fs.readFileSync(workflowPath, "utf8");
  const mission = extractList(sliceSection(content, "## Mission"));
  const mustReadSsot = extractList(sliceSection(content, "## Must Read SSOT"));
  const allowedActions = extractList(sliceSection(content, "## Allowed Actions"));
  const stopConditions = extractList(sliceSection(content, "## Stop Conditions"));
  const purpose = extractList(sliceSection(content, "## Purpose"));
  const readFirst = extractList(sliceSection(content, "## Read First"));
  const doSteps = extractList(sliceSection(content, "## Do"));
  const stopWhen = extractList(sliceSection(content, "## Stop When"));

  return {
    path: workflow,
    exists: true,
    role: normalizeRoleValue(extractFirstValue(sliceSection(content, "## Role"))),
    mission,
    authority: extractList(sliceSection(content, "## Authority")),
    nonAuthority: extractList(sliceSection(content, "## Non-Authority")),
    mustReadSsot,
    allowedActions,
    forbiddenActions: extractList(sliceSection(content, "## Forbidden Actions")),
    requiredOutputs: extractList(sliceSection(content, "## Required Outputs")),
    turnCloseReporting: extractList(sliceSection(content, "## Turn Close Reporting")),
    handoffRules: extractList(sliceSection(content, "## Handoff Rules")),
    stopConditions,
    escalationRules: extractList(sliceSection(content, "## Escalation Rules")),
    missingSections: findMissingWorkflowContractSections(content),
    purpose: purpose.length ? purpose : mission,
    readFirst: readFirst.length ? readFirst : mustReadSsot,
    doSteps: doSteps.length ? doSteps : allowedActions,
    stopWhen: stopWhen.length ? stopWhen : stopConditions
  };
}

export function findMissingWorkflowContractSections(content) {
  return WORKFLOW_CONTRACT_SECTIONS.filter((sectionHeading) => {
    const sectionContent = sliceSection(content, sectionHeading);
    return !hasContractSectionContent(sectionContent);
  });
}

function sliceSection(content, heading) {
  if (!content) {
    return null;
  }

  const start = content.indexOf(heading);
  if (start === -1) {
    return null;
  }

  const afterStart = content.slice(start + heading.length).trimStart();
  const nextHeadingMatch = afterStart.match(/\n##\s+/);
  if (!nextHeadingMatch) {
    return afterStart.trimEnd();
  }

  return afterStart.slice(0, nextHeadingMatch.index).trimEnd();
}

function extractList(sectionContent) {
  if (!sectionContent) {
    return [];
  }

  return sectionContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function extractFirstValue(sectionContent) {
  if (!sectionContent) {
    return null;
  }

  for (const rawLine of sectionContent.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("## ")) {
      continue;
    }
    if (line.startsWith("- ")) {
      return line.slice(2).trim();
    }
    return line;
  }

  return null;
}

function hasContractSectionContent(sectionContent) {
  if (!sectionContent) {
    return false;
  }

  return sectionContent
    .split("\n")
    .some((rawLine) => {
      const line = rawLine.trim();
      return line && !line.startsWith("## ");
    });
}

function normalizeRoleValue(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const inlineCodeMatch = trimmed.match(/^`([^`]+)`$/);
  return inlineCodeMatch ? inlineCodeMatch[1] : trimmed;
}

export function isClosedStatus(status) {
  return ["closed", "done", "complete", "completed"].includes(String(status ?? "").toLowerCase());
}

function compareActiveWorkItems(left, right) {
  const leftPriority = statusPriority(left.status);
  const rightPriority = statusPriority(right.status);
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  return String(left.workItemId).localeCompare(String(right.workItemId));
}

function statusPriority(status) {
  const normalized = String(status ?? "").toLowerCase();
  if (["in_progress", "active", "implementing"].includes(normalized)) {
    return 0;
  }
  if (["todo", "pending", "planned", "draft"].includes(normalized)) {
    return 1;
  }
  return 2;
}

function normalizeOwnerText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .trim();
}

function aliasMatchesOwner(normalizedOwner, alias) {
  const normalizedAlias = normalizeOwnerText(alias);
  if (!normalizedAlias) {
    return false;
  }

  if (/^[a-z0-9]+$/.test(normalizedAlias)) {
    const escapedAlias = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escapedAlias}(?=$|[^a-z0-9])`, "u").test(normalizedOwner);
  }

  return normalizedOwner.includes(normalizedAlias);
}

function readTaskIdsFromTable(content, heading) {
  const section = sliceSection(content, heading);
  if (!section) {
    return [];
  }

  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  if (lines.length < 3) {
    return [];
  }

  return lines
    .slice(2)
    .map(parseTableCells)
    .map((cells) => cells[0] ?? null)
    .filter((taskId) => taskId && taskId !== "-");
}

function parseTableCells(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}
