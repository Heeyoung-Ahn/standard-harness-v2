export const REDACTION_PATTERN_SCHEMA_VERSION = "standard-harness-redaction-patterns/v1";

export const REDACTION_PATTERNS = [
  { id: "private-key-pem", tier: "HIGH", type: "PRIVATE_KEY", pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g },
  { id: "aws-access-key-id", tier: "HIGH", type: "AWS_ACCESS_KEY_ID", pattern: /\bA(?:KIA|SIA)[0-9A-Z]{16}\b/g },
  { id: "aws-secret-access-key-assignment", tier: "HIGH", type: "AWS_SECRET_ACCESS_KEY", pattern: /\b(?:aws_?secret_?access_?key|secretAccessKey)\b\s*[:=]\s*["']?[A-Za-z0-9/+=]{32,}["']?/gi },
  { id: "github-token", tier: "HIGH", type: "GITHUB_TOKEN", pattern: /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{22,})\b/g },
  { id: "openai-key", tier: "HIGH", type: "OPENAI_KEY", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { id: "anthropic-key", tier: "HIGH", type: "ANTHROPIC_KEY", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { id: "stripe-secret-key", tier: "HIGH", type: "STRIPE_SECRET_KEY", pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/g },
  { id: "sendgrid-key", tier: "HIGH", type: "SENDGRID_API_KEY", pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g },
  { id: "slack-token", tier: "HIGH", type: "SLACK_TOKEN", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: "twilio-key", tier: "HIGH", type: "TWILIO_KEY", pattern: /\bSK[0-9a-f]{32}\b/gi },
  { id: "database-url-with-password", tier: "HIGH", type: "DATABASE_URL_WITH_PASSWORD", pattern: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis):\/\/[^\s:@]+:[^\s@]+@[^\s]+/gi },
  { id: "discord-webhook", tier: "HIGH", type: "DISCORD_WEBHOOK", pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+/g },
  { id: "jwt", tier: "MEDIUM", type: "JWT", pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
  { id: "google-api-key", tier: "MEDIUM", type: "GOOGLE_API_KEY", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "generic-secret-assignment", tier: "MEDIUM", type: "GENERIC_SECRET_ASSIGNMENT", pattern: /\b(?:api[_-]?key|token|secret|password|passwd|pwd)\b\s*[:=]\s*["'][^"'\n]{16,}["']/gi },
  { id: "email-address", tier: "LOW", type: "EMAIL_ADDRESS", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi }
];
