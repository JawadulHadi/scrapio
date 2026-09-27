import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { ERROR_TYPES, timeAgo, triageListQuery } from "@/lib/triage";
import { Input } from "@/components/ui/input";

const searchSchema = z.object({
  status: z.enum(["open", "resolved", "dismissed", "all"]).catch("open").default("open"),
  type: z.string().catch("all").default("all"),
  q: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Triage Queue — Triage Console" },
      { name: "description", content: "Failed scraper runs awaiting human review." },
      { property: "og:title", content: "Triage Queue — Triage Console" },
      { property: "og:description", content: "Failed scraper runs awaiting human review." },
    ],
  }),
  component: QueuePage,
});

function QueuePage() {
  const { status, type, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { data = [], isLoading, error } = useQuery(triageListQuery());

  const today = new Date().toDateString();
  const stats = {
    open: data.filter((r) => r.status === "open").length,
    resolvedToday: data.filter((r) => r.status === "resolved" && r.resolved_at && new Date(r.resolved_at).toDateString() === today).length,
    dismissed: data.filter((r) => r.status === "dismissed").length,
  };

  const rows = data.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (type === "all" || r.error_type === type) &&
      (!q || r.url.toLowerCase().includes(q.toLowerCase())),
  );

  const set = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

  return (
    <AppShell>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Open" value={stats.open} tone="text-status-open" />
        <Stat label="Resolved today" value={stats.resolvedToday} tone="text-status-resolved" />
        <Stat label="Dismissed" value={stats.dismissed} tone="text-status-dismissed" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold">Triage queue</h1>
        <Input placeholder="Search URL…" value={q} onChange={(e) => set({ q: e.target.value })} className="h-9 w-64 font-mono text-xs" />
        <select className={selectCls} value={status} onChange={(e) => set({ status: e.target.value as never })}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="all">All statuses</option>
        </select>
        <select className={selectCls} value={type} onChange={(e) => set({ type: e.target.value })}>
          <option value="all">All error types</option>
          {ERROR_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">URL</th>
              <th className="px-3 py-2">Error</th>
              <th className="px-3 py-2">Logged</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {error && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-destructive">Couldn't load the queue.</td></tr>
            )}
            {!isLoading && !error && rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Nothing here. Queue is clear.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-accent/50">
                <td className="max-w-md px-3 py-2">
                  <Link to="/triage/$id" params={{ id: r.id }} className="block truncate font-mono text-xs text-primary hover:underline">
                    {r.url}
                  </Link>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{r.error_message.split("\n")[0]}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.error_type}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{timeAgo(r.logged_at)}</td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}
