# BAWAR STAR PLASTIC INDUSTRY Cash Book

Full-stack accounting software for cash in/out, account ledgers, AFN/USD
conversion, reports, receipts, backups, and professional A4 landscape printing.

## Technology

- Frontend: React 18, Vite 6, React Router
- Backend: FastAPI, SQLAlchemy, Pydantic
- Local database: SQLite
- Production database: PostgreSQL
- Hosting: Vercel
- Managed production database: Neon PostgreSQL through Vercel Marketplace

## Project Structure

```text
frontend/       React and Vite application
backend/        FastAPI application
api/index.py    Vercel FastAPI entry point
vercel.json     Vercel frontend, API, and SPA routing configuration
```

Local databases, environment files, logs, caches, dependencies, and build
artifacts are excluded from Git.

## Local Setup

### Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`. SQLite is created automatically at
`backend/cashbook.db`.

### Frontend

```powershell
cd frontend
npm ci
npm run dev
```

The app runs at `http://localhost:5173`.

To use a different API, create `frontend/.env`:

```dotenv
VITE_API_URL=https://your-api.example.com
```

Never commit `.env` files or credentials.

## Test And Build

```powershell
cd frontend
npm test
npm run build
```

```powershell
cd backend
python -m compileall app
```

## Production Deployment

1. Import this GitHub repository into Vercel.
2. Keep the repository root as the project root. The committed `vercel.json`
   runs `npm --prefix frontend ci`, then `npm --prefix frontend run build`,
   and publishes `frontend/dist`. Do not configure Vercel to run from the
   `frontend` subdirectory or replace these commands with `cd frontend`.
3. Add the Neon Marketplace integration to the Vercel project. Neon supplies
   `DATABASE_URL` securely to the API.
4. Deploy. The frontend uses the same-origin `/api` routes automatically, and
   pushes to `main` deploy automatically.

## Data Migration

The private local SQLite database is intentionally not uploaded. Export a JSON
backup from the local app, then import it into the deployed app after creating
the production owner account.

For a full administrator-managed migration, set `DATABASE_URL` only in the
current shell and run:

```powershell
cd backend
$env:DATABASE_URL="<postgres-connection-string>"
python scripts/migrate_sqlite_to_postgres.py
```

The migration preserves accounts, transactions, settings, users, audit logs,
and backups. Existing browser sessions are intentionally excluded.

## Security And Backups

- Accounting, ledger, report, settings, and export APIs require login.
- Backup export, restore, snapshots, and clear-all require an Administrator.
- Disabling a user or resetting a password revokes active sessions.
- The final active Administrator cannot be disabled, demoted, or deleted.
- A protected Vercel cron creates daily cloud snapshots with 30-day retention.
- Manual backup creates a cloud snapshot and downloads a local JSON copy.
- Production errors receive request IDs and are written to Vercel runtime logs.

## Main Features

- Cash in/out forms and running balances
- Account registry and ledgers
- Search, date, category, and transaction filters
- Jalali and Gregorian dual-date display
- Daily, monthly, expense, and date-range reports
- A4 landscape print and PDF layouts
- Receipt printing and JSON backup/restore
- User authentication and role-based account management
