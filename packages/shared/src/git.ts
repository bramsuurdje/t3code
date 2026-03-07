const MAX_COMMIT_SUBJECT_LENGTH = 72;
const CONVENTIONAL_COMMIT_TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
] as const;
const CONVENTIONAL_COMMIT_TYPE_PATTERN = CONVENTIONAL_COMMIT_TYPES.join("|");
const CONVENTIONAL_COMMIT_SUBJECT_RE = new RegExp(
  `^(?:${CONVENTIONAL_COMMIT_TYPE_PATTERN})(?:\\([^)\\r\\n]+\\))?!?: .+$`,
);
const CONVENTIONAL_COMMIT_PREFIX_RE = new RegExp(
  `^((?:${CONVENTIONAL_COMMIT_TYPE_PATTERN})(?:\\([^)\\r\\n]+\\))?!?:)\\s+(.+)$`,
);

/**
 * Sanitize an arbitrary string into a valid, lowercase git branch fragment.
 * Strips quotes, collapses separators, limits to 64 chars.
 */
export function sanitizeBranchFragment(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/^[./\s_-]+|[./\s_-]+$/g, "");

  const branchFragment = normalized
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-")
    .replace(/^[./_-]+|[./_-]+$/g, "")
    .slice(0, 64)
    .replace(/[./_-]+$/g, "");

  return branchFragment.length > 0 ? branchFragment : "update";
}

/**
 * Sanitize a string into a `feature/…` branch name.
 * Preserves an existing `feature/` prefix or slash-separated namespace.
 */
export function sanitizeFeatureBranchName(raw: string): string {
  const sanitized = sanitizeBranchFragment(raw);
  if (sanitized.includes("/")) {
    return sanitized.startsWith("feature/") ? sanitized : `feature/${sanitized}`;
  }
  return `feature/${sanitized}`;
}

const AUTO_FEATURE_BRANCH_FALLBACK = "feature/update";

/**
 * Resolve a unique `feature/…` branch name that doesn't collide with
 * any existing branch. Appends a numeric suffix when needed.
 */
export function resolveAutoFeatureBranchName(
  existingBranchNames: readonly string[],
  preferredBranch?: string,
): string {
  const preferred = preferredBranch?.trim();
  const resolvedBase = sanitizeFeatureBranchName(
    preferred && preferred.length > 0 ? preferred : AUTO_FEATURE_BRANCH_FALLBACK,
  );
  const existingNames = new Set(existingBranchNames.map((branch) => branch.toLowerCase()));

  if (!existingNames.has(resolvedBase)) {
    return resolvedBase;
  }

  let suffix = 2;
  while (existingNames.has(`${resolvedBase}-${suffix}`)) {
    suffix += 1;
  }

  return `${resolvedBase}-${suffix}`;
}

/**
 * Normalize a commit subject into a single trimmed line with no trailing period.
 */
export function sanitizeCommitSubject(raw: string): string {
  const singleLine = raw.trim().split(/\r?\n/g)[0]?.trim() ?? "";
  const withoutTrailingPeriod = singleLine.replace(/[.]+$/g, "").trim();
  if (withoutTrailingPeriod.length === 0) {
    return "update project files";
  }

  if (withoutTrailingPeriod.length <= MAX_COMMIT_SUBJECT_LENGTH) {
    return withoutTrailingPeriod;
  }
  return withoutTrailingPeriod.slice(0, MAX_COMMIT_SUBJECT_LENGTH).trimEnd();
}

/**
 * Check whether a subject follows the conventional commit format.
 */
export function isConventionalCommitSubject(raw: string): boolean {
  return CONVENTIONAL_COMMIT_SUBJECT_RE.test(raw.trim());
}

/**
 * Ensure a commit subject follows the conventional commit format.
 * Falls back to a `chore:` prefix when the input is missing one.
 */
export function ensureConventionalCommitSubject(
  raw: string,
  fallbackType: (typeof CONVENTIONAL_COMMIT_TYPES)[number] = "chore",
): string {
  const subject = sanitizeCommitSubject(raw);
  if (isConventionalCommitSubject(subject)) {
    return subject;
  }

  const prefix = `${fallbackType}: `;
  const descriptionBudget = Math.max(0, MAX_COMMIT_SUBJECT_LENGTH - prefix.length);
  const description = `${subject.charAt(0).toLowerCase()}${subject.slice(1)}`
    .slice(0, descriptionBudget)
    .trimEnd();

  return `${prefix}${description.length > 0 ? description : "update project files"}`;
}

/**
 * Remove the conventional commit prefix so the remaining description can be
 * repurposed, for example when deriving a branch name from a commit subject.
 */
export function stripConventionalCommitPrefix(raw: string): string {
  const normalized = raw.trim();
  const match = normalized.match(CONVENTIONAL_COMMIT_PREFIX_RE);
  return match?.[2]?.trim() ?? normalized;
}
