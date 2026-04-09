# Beacon of Hope

A web application for **Beacon of Hope**, a nonprofit organization supporting survivors of abuse and trafficking. Built for BYU IS 401/413/414/455 INTEX.

## Tech Stack

| Layer    | Technology              | Hosting  |
|----------|-------------------------|----------|
| Frontend | React + TypeScript (Vite) | Vercel |
| Backend  | .NET 10 / C# Web API   | Azure    |
| Database | PostgreSQL              | Azure    |

## Local Development

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
### First-time setup

Create a `.env` file in `backend/` with your connection string (see `.env.example`).

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

## Login Credentials

All accounts use password: **`Test1234!@#$`**

### Core Accounts

| Role  | Email                      | Password       | Notes |
|-------|----------------------------|----------------|-------|
| Admin | `admin@beaconofhope.org`   | `Test1234!@#$` | Full access to all safehouses, user management, delete operations |
| Staff | `staff@beaconofhope.org`   | `Test1234!@#$` | Assigned to safehouses 1 & 2 |
| Donor | `donor@beaconofhope.org`   | `Test1234!@#$` | Donor portal only — no admin access |

### Staff Social Worker Accounts

Each staff account is assigned to 1-2 safehouses and has to-do tasks and calendar events seeded.

**Best for demo: `sw07@beaconofhope.org`** (8 tasks, 5+ events on Feb 16)

| Account | Password | Name | Safehouses |
|---------|----------|------|------------|
| `sw01@beaconofhope.org` | `Test1234!@#$` | Maria Santos | SH01, SH02 |
| `sw02@beaconofhope.org` | `Test1234!@#$` | Elena Cruz | SH01 |
| `sw03@beaconofhope.org` | `Test1234!@#$` | Rosa Garcia | SH02 |
| `sw04@beaconofhope.org` | `Test1234!@#$` | Ana Reyes | SH03 |
| `sw05@beaconofhope.org` | `Test1234!@#$` | Carmen Bautista | SH03, SH04 |
| `sw06@beaconofhope.org` | `Test1234!@#$` | Linda Perez | SH04 |
| `sw07@beaconofhope.org` | `Test1234!@#$` | Grace Flores | SH05, SH06 |
| `sw08@beaconofhope.org` | `Test1234!@#$` | Joy Rivera | SH01 |
| `sw09@beaconofhope.org` | `Test1234!@#$` | Faith Torres | SH05 |
| `sw10@beaconofhope.org` | `Test1234!@#$` | Hope Ramos | SH06 |
| `sw11@beaconofhope.org` | `Test1234!@#$` | Liza Mendoza | SH07 |
| `sw13@beaconofhope.org` | `Test1234!@#$` | Diana Castro | SH07, SH08 |
| `sw14@beaconofhope.org` | `Test1234!@#$` | Sarah Aquino | SH08 |
| `sw15@beaconofhope.org` | `Test1234!@#$` | Ruth Villanueva | SH09 |
| `sw16@beaconofhope.org` | `Test1234!@#$` | Esther Soriano | SH02, SH07 |
| `sw17@beaconofhope.org` | `Test1234!@#$` | Mercy Dela Cruz | SH07, SH08 |
| `sw19@beaconofhope.org` | `Test1234!@#$` | Alma Pascual | SH09 |
| `sw20@beaconofhope.org` | `Test1234!@#$` | Nina Cortez | SH01, SH03 |


### Important: App Date

The app treats **February 16, 2026** as "today" (`DATA_CUTOFF`). All seeded data, calendar events, and dashboard metrics are anchored to this date. The calendar opens to Feb 16 by default.

## Deployment

- **Frontend** — Vercel (auto-deploy currently disabled via `vercel.json`)
- **Backend** — Auto-deploys to Azure via GitHub Actions on push to `main` (changes in `backend/`)
- **Database** — Azure Database for PostgreSQL Flexible Server

### Manual Frontend Deploy

Auto-deploy is disabled. To deploy the frontend manually:

```bash
cd frontend && npx vercel --prod
```

Or from the Vercel dashboard: **Deployments** → **...** menu → **Redeploy**.

To re-enable auto-deploy, remove the `"git"` block from `frontend/vercel.json`.

## Team Workflow

- Never push directly to `main` — use feature branches and open PRs
- Keep commits small and frequent
- Secrets go in `.env` files (never committed to the repo)

## Database Migrations

The production database is Azure Database for PostgreSQL Flexible Server (`intex-db.postgres.database.azure.com`). Migrations run automatically at app startup via `MigrateAsync()`.

### Workflow

1. **Create a migration:**
   ```bash
   dotnet ef migrations add YourMigrationName --project backend
   ```

2. **The backend applies it on next startup** — no manual step needed.

3. **Commit and push** the migration files.


## ML Artifacts

- Persist ML model bundles in `models/` using the `.sav` extension.
- Do not commit `.pkl` model files; they are ignored by repo policy.
