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

## Project Structure

The repository follows a strict top-level layout. Do not create new top-level directories or move existing ones without explicit approval.

```
intex2/
├── backend/          # .NET 10 C# Web API (ASP.NET, EF Core, Identity)
├── backend.Tests/    # xUnit tests for backend (mirrors backend/ structure)
├── frontend/         # React 19 + TypeScript + Vite
│   └── src/
│       ├── __tests__/    # Vitest tests
│       ├── components/   # Reusable UI components
│       ├── contexts/     # React contexts (auth, cookies, etc.)
│       ├── hooks/        # Custom hooks
│       ├── layouts/      # Page layouts
│       ├── pages/        # Route-level page components
│       ├── utils/        # Utility functions
│       ├── api.ts        # API client
│       ├── constants.ts  # App constants
│       ├── domain.ts     # Domain types
│       └── types.ts      # Shared TypeScript types
├── ml/               # Python ML code, organized by model use-case
│   ├── <model_name>/ # Each model gets its own subdirectory
│   ├── config.py     # Shared ML configuration
│   ├── utils_db.py   # DB utilities for ML scripts
│   └── requirements.txt
├── models/           # Trained model artifacts (.sav files) — planned move to ml/models/
├── data/             # CSV seed/import data — planned move to supabase/data/
├── scripts/          # Utility shell scripts (setup-env.sh, etc.)
├── supabase/         # Database migrations and seed SQL
├── INTEX/            # Project documentation, rubric, audit notes
├── .github/          # CI/CD workflows (GitHub Actions)
└── CLAUDE.md         # This file — agent instructions and rules
```

### Structure rules

- **Never commit build artifacts.** `frontend/dist/`, `node_modules/`, `bin/`, `obj/` must stay gitignored.
- **ML code goes in `ml/`.** Each model/prediction task gets its own subdirectory under `ml/`. Do not create separate top-level directories for ML scripts or notebooks.
- **Tests live next to what they test.** Backend tests in `backend.Tests/`, frontend tests in `frontend/src/__tests__/`.
- **New frontend files** go in the appropriate `src/` subdirectory (`components/`, `pages/`, `hooks/`, etc.). Do not add new subdirectories under `src/` without good reason.
- **Configuration and environment files** follow existing patterns (`.env.example` templates committed, actual `.env` files gitignored).

---

## Learned Rules

<!-- New rules are appended below this line. Do not edit above this section. -->

1. [PROCESS] Always rephrase user-provided rules into precise, unambiguous language optimized for LLM instruction-following before appending them — because the user's phrasing may be conversational, and rules are most effective when written as clear, direct imperatives with explicit scope and rationale.

2. [PROCESS] Commit and push to remote frequently (after each meaningful change or logical unit of work). Never push directly to main — always push to appropriately named branches and open PRs for review. Each commit should not be a separate PR. Create the PR when Dawson asks for one.

3. [UX] Prioritize user experience above all else. Every UI decision must favor clean, intuitive design that serves real functionality and utility — never add visual clutter, unnecessary complexity, or decorative elements that don't help the user accomplish their goals.

4. [PROCESS] Always follow test-driven development (TDD). Before implementing any new feature or change, plan and write the tests first that define expected behavior. Then implement the minimum code to make all tests pass. Backend tests go in `backend.Tests/` (xUnit), frontend tests go in `frontend/src/__tests__/` (Vitest). Run `cd backend.Tests && dotnet test` and `cd frontend && npm test` to verify all tests pass before considering work complete.

5. [PROCESS] Before modifying any existing code, check what tests cover that code. Update or add tests to reflect the new behavior before making the code change. After the change, run the full test suite to ensure nothing is broken.

6. [DATA] The database is Azure Database for PostgreSQL Flexible Server (`intex-db.postgres.database.azure.com`), managed entirely by EF Core. `MigrateAsync()` runs at startup in Program.cs. To add/change tables: edit C# models → `dotnet ef migrations add <Name>` → the backend applies it on next startup. Only manage your own tables (AspNet*, domain tables) in the DbContext.

7. [DATA] For Npgsql connection strings, use camelCase key names without spaces: `SslMode` (not `SSL Mode`), `TrustServerCertificate` (not `Trust Server Certificate`), `Username` (not `User Id`). Npgsql 10.x is strict about this.
