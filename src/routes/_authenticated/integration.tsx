import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { Hint, InfoPanel } from "@/lib/info-mode";
import { ingestKeyQuery, jobsQuery } from "@/lib/triage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/integration")({
  head: () => ({
    meta: [
      { title: "Connect scraper — Scrapefix" },
      { name: "description", content: "Send your scraper's failures to Scrapefix with your personal key." },
      { property: "og:title", content: "Connect scraper — Scrapefix" },
      { property: "og:description", content: "Send your scraper's failures to Scrapefix with your personal key." },
    ],
  }),
  component: IntegrationPage,
});

function IntegrationPage() {
  const hydrated = useHydrated();
  const origin = hydrated ? window.location.origin : "https://your-app-url";
  const { data: key } = useQuery(ingestKeyQuery());
  const { data: jobs = [] } = useQuery(jobsQuery());
  const [show, setShow] = useState(false);
  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"));

  const code = `import os, httpx

SCRAPEFIX_URL = "${origin}/api/public/triage/ingest"
SCRAPEFIX_KEY = os.environ["SCRAPEFIX_KEY"]   # your personal key

async def log_failure(url, error_message, error_type="layout_shift",
                      payload=None, job_id=None):
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(SCRAPEFIX_URL,
            headers={"x-ingest-key": SCRAPEFIX_KEY},
            json={"url": url, "error_type": error_type,
                  "error_message": error_message[:8000],
                  "raw_payload": payload or {}, "job_id": job_id})
        r.raise_for_status()`;

  return (
    <AppShell>
      <PageHeader title="Connect your scraper" subtitle="Three steps and failures start arriving automatically." />
      <InfoPanel title="Why connect?">
        Instead of crashing or saving bad data, your scraper sends each failure here. You'll see it in the Fix queue within seconds.
      </InfoPanel>
      <div className="space-y-6">
        <Card>
          <h2 className="flex items-center gap-2 font-semibold">1. Your personal key <Hint text="Keep this private. It lets your scraper add records to your workspace only." /></h2>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-secondary px-3 py-2 font-mono text-sm">{key ? (show ? key : "•".repeat(32)) : "Loading…"}</code>
            <Button variant="outline" size="icon" onClick={() => setShow(!show)} aria-label="Show key">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
            <Button variant="outline" size="icon" onClick={() => key && copy(key)} aria-label="Copy key"><Copy className="h-4 w-4" /></Button>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">2. Add this to your Python scraper</h2>
          <div className="relative mt-3">
            <pre className="overflow-auto rounded-lg bg-foreground p-4 font-mono text-xs leading-relaxed text-background">{code}</pre>
            <Button size="sm" variant="secondary" className="absolute right-2 top-2" onClick={() => copy(code)}><Copy className="h-3.5 w-3.5" /> Copy</Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Error types: layout_shift, captcha, network, validation, other.</p>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-semibold">3. Link failures to a job (optional) <Hint text="Pass the job ID so the Jobs page can count failures per website." /></h2>
          <ul className="mt-3 divide-y text-sm">
            {jobs.map((j) => (
              <li key={j.id} className="flex items-center gap-3 py-2">
                <span className="mr-auto">{j.name}</span>
                <code className="hidden truncate font-mono text-xs text-muted-foreground sm:block">{j.id}</code>
                <Button variant="ghost" size="icon" onClick={() => copy(j.id)} aria-label="Copy ID"><Copy className="h-4 w-4" /></Button>
              </li>
            ))}
            {jobs.length === 0 && <li className="py-2 text-muted-foreground">No jobs yet.</li>}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
