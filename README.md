<p align="center">
  <img src="public/logo-wordmark.svg" alt="Scrapefix" width="260" />
</p>

<p align="center"><b>Websites break scrapers. We catch what falls.</b></p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-4f46e5.svg"></a>
  <img alt="TanStack Start" src="https://img.shields.io/badge/TanStack-Start-7c74ff.svg">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-1e1e5a.svg">
</p>

---

Scrapefix is a **human-in-the-loop triage dashboard** for web scrapers. When your scraper hits a
layout change or a missing field, it sends the failing URL and error trace to Scrapefix instead of
silently dropping the record. An operator reviews it, fills in the missing fields, and approves it —
the clean record lands in your warehouse and (optionally) a Google Sheet.

## Features

- **Fix queue** — every failed scrape, with filters, tabs, and full error traces
- **Record review** — side-by-side error trace and manual override form
- **Clean data** — searchable warehouse of approved records with CSV export
- **Google Sheets export** — keep a spreadsheet tab always up to date
- **Scraper jobs** — track the sites you scrape and their failure counts
- **Personal ingest key** — plug in any scraper (Python example included)
- **Private by default** — every account is its own isolated workspace
- **Sign-in** — Google, magic link, or email + password
- **Guide mode** — plain-language hints on every page

## Tech stack

| Layer | Tech |
| --- | --- |
| Framework | TanStack Start v1 (React 19, Vite 7) |
| Styling | Tailwind CSS v4, shadcn/ui, Recharts |
| Backend | Lovable Cloud (Postgres + Auth + RLS) |
| Server logic | `createServerFn` + server routes |
| Runtime | Edge (Cloudflare Workers) |

## Quick start

```bash
bun install
bun run dev      # http://localhost:8080
bun run build    # production build
bun run lint
```

Environment variables (`.env`, auto-provided by Lovable Cloud):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

## Connect your scraper

```python
import requests

requests.post(
    "https://<your-app>/api/public/triage/ingest",
    headers={"x-ingest-key": "<your personal key>"},
    json={
        "url": "https://example.com/product/42",
        "error_type": "missing_field",
        "error_trace": "KeyError: 'price'",
        "raw_payload": {"title": "Blue mug"},
    },
    timeout=10,
)
```

Find your key on the **Connect scraper** page.

## Project structure

```text
src/
  routes/
    index.tsx               Public landing page
    auth.tsx                Sign-in (Google, magic link, password)
    _authenticated/         Dashboard, jobs, queue, triage, data, integration
    api/public/triage/      Ingest endpoint for scrapers
  components/               AppShell, SheetExportCard, ui/*
  lib/                      triage helpers, sheets server fn, guide mode
supabase/migrations/        Database schema + RLS
docs/                       Architecture, API, deployment, wiki
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Ingest API](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Wiki](docs/wiki/Home.md)
- [Contributing](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE) © 2026 Jawad Ul Hadi
