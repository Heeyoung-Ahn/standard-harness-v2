export function parseArgs(args = []) {
  const options = {};
  const positionals = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = args[i + 1];
    if (next == null || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    i += 1;
  }
  return { options, positionals };
}

export function parseList(value) {
  if (Array.isArray(value)) return value;
  return String(value ?? "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
}
