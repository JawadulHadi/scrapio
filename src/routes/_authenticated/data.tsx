import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { InfoPanel } from "@/lib/info-mode";
import { downloadCsv, warehouseQuery } from "@/lib/triage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetExportCard } from "@/components/SheetExportCard";

export const Route = createFileRoute("/_authenticated/data")({
  head: () => ({
    meta: [
      { title: "Clean data — Scrapefix" },
      { name: "description", content: "Your verified, clean scraped records, ready to download." },
      { property: "og:title", content: "Clean data — Scrapefix" },
      { property: "og:description", content: "Your verified, clean scraped records, ready to download." },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const { data = [], isLoading } = useQuery(warehouseQuery());
  const [q, setQ] = useState("");
  const rows = data.filter((w) => !q || (w.title + w.url).toLowerCase().includes(q.toLowerCase()));

  function exportCsv() {
    downloadCsv(
      `clean-data-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((w) => ({ title: w.title, price: Number(w.price).toFixed(2), url: w.url, saved_at: w.extracted_at })),
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Clean data"
        subtitle={`${data.length} verified records`}
        actions={<Button onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> Download CSV</Button>}
      />
      <InfoPanel title="Your final data">
        Everything here has been checked. The CSV file opens directly in Excel or Google Sheets.
      </InfoPanel>
      <SheetExportCard />
      <Input placeholder="Search title or address…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 w-full bg-card sm:w-72" />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
            <tr><th className="px-5 py-3 font-medium">Title</th><th className="px-5 py-3 text-right font-medium">Price</th><th className="px-5 py-3 font-medium">Source</th><th className="px-5 py-3 font-medium">Saved</th></tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No clean records yet.</td></tr>}
            {rows.map((w) => (
              <tr key={w.id} className="transition-colors hover:bg-secondary/40">
                <td className="px-5 py-3 font-medium">{w.title}</td>
                <td className="px-5 py-3 text-right font-mono">{Number(w.price).toFixed(2)}</td>
                <td className="max-w-xs truncate px-5 py-3 text-xs text-muted-foreground">
                  {w.source_triage_id ? <Link to="/triage/$id" params={{ id: w.source_triage_id }} className="hover:text-primary">{w.url}</Link> : w.url}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">{new Date(w.extracted_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
