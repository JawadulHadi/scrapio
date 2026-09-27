import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { ArrowRight, Sparkles } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { ERROR_LABELS, jobsQuery, triageListQuery, warehouseQuery } from "@/lib/triage";
import { Hint, InfoPanel } from "@/lib/info-mode";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Overview — Scrapefix" },
      { name: "description", content: "See how your scrapers are doing: failures, fixes and clean records at a glance." },
      { property: "og:title", content: "Overview — Scrapefix" },
      { property: "og:description", content: "See how your scrapers are doing: failures, fixes and clean records at a glance." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery(triageListQuery());
  const { data: clean = [] } = useQuery(warehouseQuery());
  const { data: jobs = [] } = useQuery(jobsQuery());
  const [busy, setBusy] = useState(false);

  const open = rows.filter((r) => r.status === "open").length;
  const fixed = rows.filter((r) => r.status === "resolved").length;
  const handled = rows.length ? Math.round(((rows.length - open) / rows.length) * 100) : 100;

  const days = [...Array(14)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toDateString();
    return {
      day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      failures: rows.filter((r) => new Date(r.logged_at).toDateString() === key).length,
      fixed: rows.filter((r) => r.resolved_at && r.status === "resolved" && new Date(r.resolved_at).toDateString() === key).length,
    };
  });
  const byType = Object.entries(ERROR_LABELS).map(([k, label]) => ({ label, count: rows.filter((r) => r.error_type === k).length }));

  async function loadSample() {
    setBusy(true);
    const { error } = await supabase.rpc("load_sample_data");
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sample data added");
    qc.invalidateQueries();
  }

  const empty = !isLoading && rows.length === 0 && jobs.length === 0 && clean.length === 0;

  return (
    <AppShell>
      <PageHeader title="Overview" subtitle="How your scrapers are doing right now." />
      <InfoPanel title="How Scrapefix works">
        Your scraper collects data from websites. When a page breaks it (layout change, CAPTCHA, bad data), the failure lands in the{" "}
        <b>Fix queue</b> instead of being lost. You correct it by hand and it moves to <b>Clean data</b>, ready to export.
      </InfoPanel>

      {empty && (
        <Card className="mb-6 flex flex-wrap items-center gap-4">
          <Sparkles className="h-6 w-6 text-primary" />
          <div className="mr-auto">
            <p className="font-semibold">Your workspace is empty</p>
            <p className="text-sm text-muted-foreground">Load example jobs and records to explore, or connect your scraper.</p>
          </div>
          <Button onClick={loadSample} disabled={busy}>Load sample data</Button>
          <Button variant="outline" asChild><Link to="/integration">Connect scraper</Link></Button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Needs fixing" value={open} tone="text-status-open" hint="Failed records waiting for you in the Fix queue." />
        <Stat label="Fixed by hand" value={fixed} tone="text-status-resolved" hint="Records you corrected and approved." />
        <Stat label="Clean records" value={clean.length} tone="text-foreground" hint="Final, trusted data ready to export." />
        <Stat label="Handled rate" value={`${handled}%`} tone="text-primary" hint="Share of all failures that are already fixed or dismissed." />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="flex items-center gap-2 font-semibold">Last 14 days <Hint text="Orange: new failures reported. Green: records you fixed that day." /></h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={days}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
                <RTooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="failures" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="fixed" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-semibold">Why scrapes fail <Hint text="The most common reasons your pages broke." /></h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={byType} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <RTooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center">
          <h2 className="mr-auto font-semibold">Latest failures</h2>
          <Link to="/queue" className="flex items-center gap-1 text-sm text-primary hover:underline">Open fix queue <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <ul className="mt-3 divide-y">
          {rows.filter((r) => r.status === "open").slice(0, 5).map((r) => (
            <li key={r.id}>
              <Link to="/triage/$id" params={{ id: r.id }} className="flex items-center gap-3 py-3 transition-colors hover:text-primary">
                <span className="h-2 w-2 shrink-0 rounded-full bg-status-open" />
                <span className="truncate text-sm">{r.url}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{ERROR_LABELS[r.error_type] ?? r.error_type}</span>
              </Link>
            </li>
          ))}
          {open === 0 && <li className="py-3 text-sm text-muted-foreground">Nothing to fix. Nice work.</li>}
        </ul>
      </Card>
    </AppShell>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: number | string; tone: string; hint: string }) {
  return (
    <Card className="hover-lift">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{label} <Hint text={hint} /></div>
      <div className={`mt-2 font-display text-3xl font-semibold ${tone}`}>{value}</div>
    </Card>
  );
}
