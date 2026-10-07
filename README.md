# Fieldnote — Freelance Lead CRM

Personal web CRM for discovering, qualifying, and following up with freelance website/app development leads.

**Repository:** https://github.com/adhithyakumaran/crm

**Stack:** Next.js 15, PostgreSQL, Prisma, Tailwind, shadcn/ui.

## Features (MVP)

- Dashboard KPIs, pipeline, and quick filters
- Lead list with search, filters, bulk actions, export
- Lead detail with opportunity intelligence, contact actions, notes, timeline
- Follow-up scheduling and contact logging (CRM state preserved on re-import)
- CSV/XLSX import with column mapping, duplicate preview, intelligent upsert
- CSV/XLSX export (all, filtered, or selected)
- Auth + API ingest key for future scraper integration

## Local setup

1. **PostgreSQL** — set `DATABASE_URL` in `.env` (see `.env` example values).
2. **Migrate & seed:**

```bash
npm install
npx prisma migrate dev
npm run db:seed
```

3. **Run:**

```bash
npm run dev
```

Open `http://localhost:43123` — **no login** (single-owner CRM; first API call creates the default user).

### Chennai lead pack (import-ready)

- **Excel:** `exports/chennai-qualified-leads.xlsx` — column headers match **Import** (`businessName`, `phone`, `leadScore`, etc.). Upload in **Import → Validate & import** (auto-maps camelCase columns).
- **Refresh from research:** `npx tsx scripts/ingest-chennai-research.ts`
- **Re-export after DB changes:** `npx tsx scripts/export-import-xlsx.ts`
- **CLI import (same upsert as UI):** `npx tsx scripts/import-xlsx-to-crm.ts`

### Deploy on Vercel

1. Create a **Postgres** database (Vercel Postgres, Neon, or Supabase).
2. Set environment variable **`DATABASE_URL`** (with `?sslmode=require` for most hosts).
3. Optional: `DEFAULT_USER_EMAIL`, `DEFAULT_USER_NAME`, `API_INGEST_KEY`.
4. Deploy from `main` — build runs `prisma generate`, `prisma migrate deploy`, then `next build`.
5. After first deploy, run `npm run db:seed` locally against production DB **or** import your CSV from the app.

## API (authenticated)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/leads` | List/search leads |
| POST | `/api/leads` | Create manual lead |
| GET/PATCH/DELETE | `/api/leads/:id` | Lead CRUD |
| POST | `/api/leads/:id/activity` | Log contact |
| POST | `/api/leads/:id/follow-up` | Schedule follow-up |
| POST | `/api/leads/import` | CSV/XLSX multipart or JSON ingest |
| GET | `/api/exports` | Export CSV/XLSX |

**Scraper ingest:** `POST /api/leads/import` with header `x-api-key: <API_INGEST_KEY>` and JSON body `{ "leads": [ ... ] }`.

## Import / upsert rules

Matching priority: domain → phone → email → name+location → fuzzy name+contact.

User-edited and CRM fields (status, follow-ups, last contact) are **not** overwritten by CSV/scraper imports.
