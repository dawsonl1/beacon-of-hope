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

| Role  | Email                      | Notes |
|-------|----------------------------|-------|
| Admin | `admin@beaconofhope.org`   | Full access to all safehouses, user management, delete operations |
| Staff | `staff@beaconofhope.org`   | Assigned to safehouses 1 & 2 |
| Donor | `donor@beaconofhope.org`   | Donor portal only — no admin access |

### Staff Social Worker Accounts

Each staff account is assigned to 1-2 safehouses and has to-do tasks and calendar events seeded.

**Best for demo: `sw07@beaconofhope.org`** (8 tasks, 5+ events on Feb 16)

| Account | Name | Safehouses |
|---------|------|------------|
| `sw01@beaconofhope.org` | Maria Santos | SH01, SH02 |
| `sw02@beaconofhope.org` | Elena Cruz | SH01 |
| `sw03@beaconofhope.org` | Rosa Garcia | SH02 |
| `sw04@beaconofhope.org` | Ana Reyes | SH03 |
| `sw05@beaconofhope.org` | Carmen Bautista | SH03, SH04 |
| `sw06@beaconofhope.org` | Linda Perez | SH04 |
| `sw07@beaconofhope.org` | Grace Flores | SH05, SH06 |
| `sw08@beaconofhope.org` | Joy Rivera | SH01 |
| `sw09@beaconofhope.org` | Faith Torres | SH05 |
| `sw10@beaconofhope.org` | Hope Ramos | SH06 |
| `sw11@beaconofhope.org` | Liza Mendoza | SH07 |
| `sw13@beaconofhope.org` | Diana Castro | SH07, SH08 |
| `sw14@beaconofhope.org` | Sarah Aquino | SH08 |
| `sw15@beaconofhope.org` | Ruth Villanueva | SH09 |
| `sw16@beaconofhope.org` | Esther Soriano | SH02, SH07 |
| `sw17@beaconofhope.org` | Mercy Dela Cruz | SH07, SH08 |
| `sw19@beaconofhope.org` | Alma Pascual | SH09 |
| `sw20@beaconofhope.org` | Nina Cortez | SH01, SH03 |

> Note: SW-12 and SW-18 do not exist (not referenced in resident data).

### Important: App Date

The app treats **February 16, 2026** as "today" (`DATA_CUTOFF`). All seeded data, calendar events, and dashboard metrics are anchored to this date. The calendar opens to Feb 16 by default.

## Deployment

- **Frontend** — Auto-deploys to Vercel from the `main` branch
- **Backend** — Deployed to Microsoft Azure
- **Database** — Azure Database for PostgreSQL Flexible Server

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
