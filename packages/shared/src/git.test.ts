import { describe, expect, it } from "vitest";

import {
  ensureConventionalCommitSubject,
  isConventionalCommitSubject,
  sanitizeCommitSubject,
  sanitizeFeatureBranchName,
  stripConventionalCommitPrefix,
} from "./git";

describe("sanitizeCommitSubject", () => {
  it("keeps the first line and removes trailing punctuation", () => {
    expect(sanitizeCommitSubject("  fix: preserve selection.\nextra detail")).toBe(
      "fix: preserve selection",
    );
  });

  it("falls back when the subject is empty", () => {
    expect(sanitizeCommitSubject("   ")).toBe("update project files");
  });
});

describe("isConventionalCommitSubject", () => {
  it("accepts conventional commit subjects with optional scopes", () => {
    expect(isConventionalCommitSubject("feat(git): enforce commit conventions")).toBe(true);
    expect(isConventionalCommitSubject("fix: preserve selection")).toBe(true);
  });

  it("rejects free-form subjects", () => {
    expect(isConventionalCommitSubject("Improve commit dialog")).toBe(false);
  });
});

describe("ensureConventionalCommitSubject", () => {
  it("preserves valid conventional commit subjects", () => {
    expect(ensureConventionalCommitSubject("fix(ui): preserve selection")).toBe(
      "fix(ui): preserve selection",
    );
  });

  it("adds a fallback conventional prefix to free-form subjects", () => {
    expect(ensureConventionalCommitSubject("Improve commit dialog")).toBe(
      "chore: improve commit dialog",
    );
  });
});

describe("stripConventionalCommitPrefix", () => {
  it("removes the type and scope prefix", () => {
    expect(stripConventionalCommitPrefix("feat(git): enforce commit conventions")).toBe(
      "enforce commit conventions",
    );
  });

  it("keeps non-conventional subjects untouched", () => {
    expect(stripConventionalCommitPrefix("Improve commit dialog")).toBe("Improve commit dialog");
  });
});

describe("sanitizeFeatureBranchName", () => {
  it("derives branch names cleanly from stripped conventional subjects", () => {
    expect(
      sanitizeFeatureBranchName(
        stripConventionalCommitPrefix("feat(git): enforce commit conventions"),
      ),
    ).toBe("feature/enforce-commit-conventions");
  });
});
