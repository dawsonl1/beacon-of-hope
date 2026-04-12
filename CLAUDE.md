# Agent Instructions

Configuration for AI-assisted development with [Claude Code](https://claude.ai/claude-code).

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

## Conventions

- **Build artifacts** (`dist/`, `node_modules/`, `bin/`, `obj/`) are gitignored.
- **Tests** live next to what they test: `backend.Tests/` (xUnit), `frontend/src/__tests__/` (Vitest).
- **Environment files** follow the `.env.example` pattern — templates committed, actual `.env` files gitignored.
- **Seed data** lives in `backend/seed/` as CSVs, imported by `DataSeeder.cs` on first startup.
- **Database** is PostgreSQL 17, managed by EF Core. Migrations auto-apply on startup via `MigrateAsync()`.
- **Npgsql** connection strings use camelCase keys: `SslMode`, `TrustServerCertificate`, `Username`.

## Key Constraints

- **Frozen date:** The app treats February 16, 2026 as "today". Use `AppConstants.DataCutoff` (C#) or `APP_TODAY` (TypeScript) for all data-facing logic. Never use `DateTime.UtcNow` or `new Date()`.
- **UX first:** Every UI decision should favor clean, intuitive design. No visual clutter.
- **Push to main:** This is a solo repo — commit and push directly to main.
