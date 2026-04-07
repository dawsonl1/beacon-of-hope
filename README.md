# Beacon of Hope

A web application for **Beacon of Hope**, a nonprofit organization supporting survivors of abuse and trafficking. Built for BYU IS 401/413/414/455 INTEX.

## Tech Stack

| Layer    | Technology              | Hosting  |
|----------|-------------------------|----------|
| Frontend | React + TypeScript (Vite) | Vercel |
| Backend  | .NET 10 / C# Web API   | Azure    |
| Database | PostgreSQL              | Supabase |

## Local Development

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (required by Supabase)

### First-time setup

```bash
npx supabase start          # Start local Supabase (requires Docker)
./scripts/setup-env.sh      # Generate .env files from your local Supabase
```

### Backend

```bash
cd backend
dotnet restore
dotnet run
```

Runs on `http://localhost:5000` by default.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` by default.

## Default Login Credentials (Development)

The database seeder creates three test accounts for local development:

| Role  | Email                      | Password       |
|-------|----------------------------|----------------|
| Admin | `admin@beaconofhope.org`   | `Test1234!@#$` |
| Staff | `staff@beaconofhope.org`   | `Test1234!@#$` |
| Donor | `donor@beaconofhope.org`   | `Test1234!@#$` |

These accounts are created automatically when the backend seeds the database on first run.

## Deployment

- **Frontend** — Auto-deploys to Vercel from the `main` branch
- **Backend** — Deployed to Microsoft Azure
- **Database** — Hosted on Supabase (PostgreSQL)

## Team Workflow

- Never push directly to `main` — use feature branches and open PRs
- Keep commits small and frequent
- Secrets go in `.env` files (never committed to the repo)

## ML Artifacts

- Persist ML model bundles in `models/` using the `.sav` extension.
- Do not commit `.pkl` model files; they are ignored by repo policy.
