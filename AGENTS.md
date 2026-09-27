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

- Triage dashboard reads/writes via browser Supabase client under `_authenticated/` (ssr:false) with operator-only RLS; promotion goes through the `promote_triage_record` SQL function so warehouse upsert + queue resolve stay atomic.
- Scraper failures arrive at `/api/public/triage/ingest`, guarded by the `x-ingest-key` header matching `SCRAPER_INGEST_KEY`; it's the only admin-client write path.
