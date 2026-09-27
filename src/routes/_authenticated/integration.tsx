import { createFileRoute } from "@tanstack/react-router";
import { useHydrated } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/integration")({
  head: () => ({
    meta: [
      { title: "Scraper Setup — Triage Console" },
      { name: "description", content: "Connect your Python scraper so failures land in the triage queue." },
      { property: "og:title", content: "Scraper Setup — Triage Console" },
      { property: "og:description", content: "Connect your Python scraper so failures land in the triage queue." },
    ],
  }),
  component: IntegrationPage,
});

function IntegrationPage() {
  const hydrated = useHydrated();
  const origin = hydrated ? window.location.origin : "https://your-app-url";
  const code = `import os, httpx

TRIAGE_URL = "${origin}/api/public/triage/ingest"
TRIAGE_KEY = os.environ["SCRAPER_INGEST_KEY"]

async def log_failure(self, url: str, error_message: str,
                      error_type: str = "layout_shift", payload: dict | None = None):
    """Drop-in replacement for AbstractDatabaseRepository.log_failure."""
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            TRIAGE_URL,
            headers={"x-ingest-key": TRIAGE_KEY},
            json={"url": url, "error_type": error_type,
                  "error_message": error_message[:8000],
                  "raw_payload": payload or {}},
        )
        r.raise_for_status()`;

  return (
    <AppShell>
      <h1 className="text-lg font-semibold">Connect your scraper</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        When your scraper catches an error, send it here instead of writing to a local table. It will show up in the
        queue straight away. Error types: layout_shift, captcha, network, validation, other.
      </p>
      <pre className="mt-4 overflow-auto rounded-md border bg-sidebar p-4 font-mono text-xs">{code}</pre>
      <p className="mt-3 text-xs text-muted-foreground">
        Set <code className="font-mono">SCRAPER_INGEST_KEY</code> in your scraper's environment to the same secret key stored in this app.
      </p>
    </AppShell>
  );
}
