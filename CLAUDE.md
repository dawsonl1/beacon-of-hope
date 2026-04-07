# Agent Instructions

Read this entire file before starting any task.

## Self-Correcting Rules Engine

This file contains a growing ruleset that improves over time. **At session start, read the entire "Learned Rules" section before doing anything.**

### How it works

1. When the user corrects you or you make a mistake, **immediately append a new rule** to the "Learned Rules" section at the bottom of this file.
2. Rules are numbered sequentially and written as clear, imperative instructions.
3. Format: `N. [CATEGORY] Never/Always do X — because Y.`
4. Categories: `[STYLE]`, `[CODE]`, `[ARCH]`, `[TOOL]`, `[PROCESS]`, `[DATA]`, `[UX]`, `[OTHER]`
5. Before starting any task, scan all rules below for relevant constraints.
6. If two rules conflict, the higher-numbered (newer) rule wins.
7. Never delete rules. If a rule becomes obsolete, append a new rule that supersedes it.

### When to add a rule

- User explicitly corrects your output ("no, do it this way")
- User rejects a file, approach, or pattern
- You hit a bug caused by a wrong assumption about this codebase
- User states a preference ("always use X", "never do Y")

### Rule format example

```
15. [STYLE] Never add emojis to commit messages — project convention.

```

---

## Learned Rules

<!-- New rules are appended below this line. Do not edit above this section. -->

1. [PROCESS] Always rephrase user-provided rules into precise, unambiguous language optimized for LLM instruction-following before appending them — because the user's phrasing may be conversational, and rules are most effective when written as clear, direct imperatives with explicit scope and rationale.

2. [PROCESS] Commit and push to remote frequently (after each meaningful change or logical unit of work). Never push directly to main — always push to appropriately named branches and open PRs for review. Each commit should not be a separate PR. Create the PR when Dawson asks for one.

3. [UX] Prioritize user experience above all else. Every UI decision must favor clean, intuitive design that serves real functionality and utility — never add visual clutter, unnecessary complexity, or decorative elements that don't help the user accomplish their goals.

4. [PROCESS] Always follow test-driven development (TDD). Before implementing any new feature or change, plan and write the tests first that define expected behavior. Then implement the minimum code to make all tests pass. Backend tests go in `backend.Tests/` (xUnit), frontend tests go in `frontend/src/__tests__/` (Vitest). Run `cd backend.Tests && dotnet test` and `cd frontend && npm test` to verify all tests pass before considering work complete.

5. [PROCESS] Before modifying any existing code, check what tests cover that code. Update or add tests to reflect the new behavior before making the code change. After the change, run the full test suite to ensure nothing is broken.