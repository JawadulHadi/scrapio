import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AppShell, Card, PageHeader, StatusBadge } from "@/components/AppShell";
import { InfoPanel } from "@/lib/info-mode";
import { ERROR_LABELS, ERROR_TYPES, timeAgo, triageListQuery } from "@/lib/triage";
import { Input } from "@/components/ui/input";

const searchSchema = z.object({
  status: z.enum(["open", "resolved", "dismissed", "all"]).optional().catch(undefined),
  type: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});
type S = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_authenticated/queue")({
  validateSearch: (s: Record<string, unknown>): S => {
    const p = searchSchema.parse(s);
    const out: S = {};
    if (p.status) out.status = p.status;
    if (p.type) out.type = p.type;
    if (p.q) out.q = p.q;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Fix queue — Scrapefix" },
      { name: "description", content: "Failed scrapes waiting for a quick manual fix." },
      { property: "og:title", content: "Fix queue — Scrapefix" },
      { property: "og:description", content: "Failed scrapes waiting for a quick manual fix." },
    ],
  }),
  component: QueuePage,
});

function QueuePage() {
  const search = Route.useSearch();
  const status = search.status ?? "open";
  const type = search.type ?? "all";
  const q = search.q ?? "";
  const navigate = useNavigate({ from: "/queue" });
  const { data = [], isLoading, error } = useQuery(triageListQuery());
  const rows = data.filter(
    (r) => (status === "all" || r.status === status) && (type === "all" || r.error_type === type) && (!q || r.url.toLowerCase().includes(q.toLowerCase())),
  );
  const set = (patch: S) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const tabs = [["open", "Needs fixing"], ["resolved", "Fixed"], ["dismissed", "Dismissed"], ["all", "All"]] as const;

  return (
    <AppShell>
      <PageHeader title="Fix queue" subtitle="Scrapes that broke and need a human touch." />
      <InfoPanel title="How to fix a record">
        Click any row, look at what went wrong, type the correct title and price, then press <b>Approve</b>. The record moves to Clean data.
      </InfoPanel>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-secondary p-1">
          {tabs.map(([v, l]) => (
            <button key={v} onClick={() => set({ status: v })} className={`rounded-md px-3 py-1.5 text-sm transition-all ${status === v ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>
              {l} <span className="text-xs text-muted-foreground">{v === "all" ? data.length : data.filter((r) => r.status === v).length}</span>
            </button>
          ))}
        </div>
        <select className="h-9 rounded-md border bg-card px-2 text-sm" value={type} onChange={(e) => set({ type: e.target.value })}>
          <option value="all">All reasons</option>
          {ERROR_TYPES.map((t) => <option key={t} value={t}>{ERROR_LABELS[t]}</option>)}
        </select>
        <Input placeholder="Search web address…" value={q} onChange={(e) => set({ q: e.target.value })} className="h-9 w-full bg-card sm:ml-auto sm:w-64" />
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading && <p className="p-6 text-center text-muted-foreground">Loading…</p>}
        {error && <p className="p-6 text-center text-destructive">Couldn't load the queue.</p>}
        {!isLoading && !error && rows.length === 0 && <p className="p-10 text-center text-muted-foreground">Nothing here. All clear.</p>}
        <ul className="divide-y">
          {rows.map((r, i) => (
            <li key={r.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
              <Link to="/triage/$id" params={{ id: r.id }} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-secondary/60">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="truncate text-sm font-medium">{r.url}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{r.error_message.split("\n")[0]}</p>
                </div>
                <span className="text-xs text-muted-foreground">{ERROR_LABELS[r.error_type] ?? r.error_type}</span>
                <span className="w-20 text-xs text-muted-foreground">{timeAgo(r.logged_at)}</span>
                <StatusBadge status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
