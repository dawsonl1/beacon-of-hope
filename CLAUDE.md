# Agent Instructions

Read this entire file before starting any task. Configuration for AI-assisted development with [Claude Code](https://claude.ai/claude-code).

## Rules Engine

When the user corrects an approach or states a preference, append a new rule to the Learned Rules section below. Format: `N. [CATEGORY] Instruction — rationale.` Categories: `[STYLE]`, `[CODE]`, `[ARCH]`, `[TOOL]`, `[PROCESS]`, `[DATA]`, `[UX]`. Higher-numbered rules supersede older ones if they conflict.

---

## Project Structure

```
beacon-of-hope/
├── backend/              .NET 10 Web API (ASP.NET, EF Core, Identity)
├── backend.Tests/        xUnit test suite
├── frontend/             React 19 + TypeScript + Vite
│   └── src/
│       ├── pages/        Route-level page components
│       ├── components/   Reusable UI components
│       ├── contexts/     React contexts (auth, cookies, etc.)
│       ├── hooks/        Custom hooks
│       └── api.ts        Centralized API client
├── ai_harness/           FastAPI + GPT content engine
├── vanna_service/        FastAPI NL-to-SQL chatbot
├── ml/                   Machine learning pipeline (8 models)
│   ├── notebooks/        Jupyter exploration notebooks
│   └── docs/             Pipeline documentation
├── models/               Trained model artifacts (.sav)
├── docs/                 Architecture, schemas, security docs
├── .github/workflows/    CI/CD (deploy, ML pipeline)
└── CLAUDE.md             This file
```

### Structure Rules

- **Never commit build artifacts.** `dist/`, `node_modules/`, `bin/`, `obj/` stay gitignored.
- **ML code goes in `ml/`.** Each model gets its own subdirectory.
- **Tests live next to what they test.** Backend: `backend.Tests/` (xUnit). Frontend: `frontend/src/__tests__/` (Vitest).
- **Seed data** lives in `backend/seed/` as CSVs, imported by `DataSeeder.cs` on first startup.
- **Environment files** follow `.env.example` pattern — templates committed, actual `.env` files gitignored.

---

## Learned Rules

1. [UX] Prioritize user experience above all else. Every UI decision must favor clean, intuitive design — never add visual clutter or decorative elements that don't help the user accomplish their goals.

2. [PROCESS] Follow test-driven development. Write tests before implementation. Backend: `cd backend.Tests && dotnet test`. Frontend: `cd frontend && npm test`. Run both before considering work complete.

3. [PROCESS] Before modifying existing code, check what tests cover it. Update tests to reflect new behavior before making the code change.

4. [DATA] The database is PostgreSQL 17, managed entirely by EF Core. `MigrateAsync()` runs at startup. To change schema: edit C# models, run `dotnet ef migrations add <Name>`, deploy — the backend applies it on next startup.

5. [DATA] For Npgsql connection strings, use camelCase key names without spaces: `SslMode` (not `SSL Mode`), `TrustServerCertificate` (not `Trust Server Certificate`), `Username` (not `User Id`). Npgsql 10.x is strict about this.

6. [DATA] The app is frozen to February 16, 2026. All timestamps and "today" references MUST use `AppConstants.DataCutoff` (DateOnly) or `AppConstants.DataCutoffUtc` (DateTime) in backend C#, and `APP_TODAY` / `APP_TODAY_STR` in frontend TypeScript. Never use `DateTime.UtcNow`, `DateTime.Now`, `new Date()`, or `Date.now()` for data-facing logic.

7. [PROCESS] Push directly to main — this is a solo repo. Commit and push after each meaningful change.
