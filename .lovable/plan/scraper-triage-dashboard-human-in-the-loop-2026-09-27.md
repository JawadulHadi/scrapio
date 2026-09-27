# Scraper Triage Dashboard (Human-in-the-Loop)

A web dashboard where operators review failed scrape runs, fill in missing data, and promote fixed records to the clean table.

## What you'll get

1. **Sign-in page** – email/password login so only your team can use the dashboard.
2. **Triage queue (home)** – list of failed runs: URL, error type (layout shift, CAPTCHA, network, validation), time logged, status. Filters by status and error type, plus search by URL.
3. **Record review page** – read-only error trace and a link to the broken page. Includes an edit form for title, price and notes, with price cleanup that strips "$" and ",".
4. **Actions** – "Approve & promote" moves the record into the clean table and marks it resolved. "Dismiss" marks it ignored. "Retry later" leaves it in the queue.
5. **Clean warehouse view** – table of promoted records showing who fixed each one and when.
6. **Stats strip** – open, resolved today, and dismissed counts.
7. **Scraper intake endpoint** – a secured URL your Python scraper can POST failures to, protected by a secret key. I'll include a Python snippet that replaces your `log_failure`.

Sample failed records are included so the queue isn't empty on first load.

## Design
Dark, dense operations-console style with a monospace font for URLs and traces. Status colors: amber = open, green = resolved, grey = dismissed.

## Technical details
- Turn on Lovable Cloud. Tables:
  - `human_triage_queue`: id, url, error_type, error_message, raw_payload jsonb, status enum (open, resolved, dismissed), logged_at, resolved_by, resolved_at
  - `scraped_warehouse`: url unique, title, price numeric, extracted_at, source_triage_id, approved_by
  - `user_roles` with an `operator` role, checked by `has_role`
- Grants and RLS: only operators can read and write. A seed migration adds the demo rows.
- A `promote_triage_record` SQL function validates the fields, upserts into the warehouse and resolves the queue row in a single transaction.
- Server functions use `requireSupabaseAuth`. Pages go under `_authenticated/`: `/` for the queue, `/triage/$id`, and `/warehouse`. `/auth` is public.
- `POST /api/public/triage/ingest` checks the `SCRAPER_INGEST_KEY` header and validates input with zod.
- The first user to sign up becomes an operator automatically; add others later.
