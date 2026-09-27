# Architecture

```text
 Python scraper ──POST /api/public/triage/ingest (x-ingest-key)──┐
                                                                 v
                                                    human_triage_queue (pending)
                                                                 │ operator reviews
                                                                 v
                                        promote_triage_record() (atomic)
                                                                 │
                                          scraped_warehouse ──> Google Sheets (syncToSheet)
```

## Tables

| Table | Purpose |
| --- | --- |
| `human_triage_queue` | Failed scrapes awaiting review |
| `scraped_warehouse` | Approved clean records, unique per `(owner_id, url)` |
| `scraper_jobs` | Sites being scraped, schedule and engine |
| `ingest_keys` | One personal ingest key per user |
| `sheet_exports` | Per-user Google Sheet target and sync status |

All tables carry `owner_id` (default `auth.uid()`) with owner-only RLS.

## Key decisions

- **Promotion is one function call** so the warehouse upsert and queue resolution never drift.
- **Ingest uses the admin client** only after validating the key, and tags rows with the key owner.
- **Sheet sync overwrites the whole tab** — idempotent, no row diffing.
- **Authenticated pages render client-side** with the browser client so RLS applies as the user.
