import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { warehouseQuery } from "@/lib/triage";

export const Route = createFileRoute("/_authenticated/warehouse")({
  head: () => ({
    meta: [
      { title: "Clean Warehouse — Triage Console" },
      { name: "description", content: "Records fixed by operators and promoted to the clean table." },
      { property: "og:title", content: "Clean Warehouse — Triage Console" },
      { property: "og:description", content: "Records fixed by operators and promoted to the clean table." },
    ],
  }),
  component: WarehousePage,
});

function WarehousePage() {
  const { data = [], isLoading } = useQuery(warehouseQuery());
  return (
    <AppShell>
      <h1 className="text-lg font-semibold">Clean warehouse</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.length} promoted records</p>
      <div className="mt-4 overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">URL</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2">Promoted</th>
              <th className="px-3 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No promoted records yet.</td></tr>
            )}
            {data.map((w) => (
              <tr key={w.id} className="border-t">
                <td className="px-3 py-2">{w.title}</td>
                <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-muted-foreground">{w.url}</td>
                <td className="px-3 py-2 text-right font-mono">{Number(w.price).toFixed(2)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(w.extracted_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">
                  {w.source_triage_id ? (
                    <Link to="/triage/$id" params={{ id: w.source_triage_id }} className="text-primary hover:underline">view</Link>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
