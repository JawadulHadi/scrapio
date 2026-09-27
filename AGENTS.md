<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Multi-tenant: every table has `owner_id` with owner-only RLS; pages under `_authenticated/` use the browser client. Promotion uses `promote_triage_record` (invoker) so warehouse upsert + queue resolve stay atomic.
- Scraper failures arrive at `/api/public/triage/ingest`, guarded by `x-ingest-key` looked up in per-user `ingest_keys`; it's the only admin-client write path.
- Google Sheets export uses the workspace Sheets connector via server fn `syncToSheet` (src/lib/sheets.functions.ts) with full-tab overwrite; per-user target stored in `sheet_exports`. Why: simple idempotent 'keep updated' without row diffing.
