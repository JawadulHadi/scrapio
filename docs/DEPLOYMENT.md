# Deployment

1. Open the project in Lovable and click **Publish**.
2. Backend (database, auth, secrets) is managed by Lovable Cloud — migrations in `supabase/migrations` apply automatically.
3. Optional: connect a custom domain under Project Settings → Domains.
4. Update your scraper to post to `https://<your-domain>/api/public/triage/ingest`.

Local build: `bun run build` then `bun run preview`.
