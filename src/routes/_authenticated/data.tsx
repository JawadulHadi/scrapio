import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Pencil, Trash2, Wand2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id: string; title: string; price: string; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const rows = data.filter((w) => !q || (w.title + w.url).toLowerCase().includes(q.toLowerCase()));

  function exportCsv() {
    downloadCsv(
      `clean-data-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((w) => ({ title: w.title, price: Number(w.price).toFixed(2), url: w.url, saved_at: w.extracted_at })),
    );
  }

  async function saveEdit() {
    if (!editing) return;
    const r = z.object({
      title: z.string().trim().min(1, "Title is required").max(300),
      price: z.coerce.number().min(0, "Price must be 0 or more").max(1e9),
      url: z.string().trim().url("Enter a full web address").max(2048),
    }).safeParse(editing);
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Check the fields"); return; }
    setSaving(true);
    const { error } = await supabase.from("scraped_warehouse").update(r.data).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Record updated");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["warehouse"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this record from your clean data?")) return;
    const { error } = await supabase.from("scraped_warehouse").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Record deleted");
    qc.invalidateQueries({ queryKey: ["warehouse"] });
  }

  return (
    <AppShell>
      <PageHeader
        title="Clean data"
        subtitle={`${data.length} verified records`}
        actions={<><Button asChild variant="outline"><Link to="/queue"><Wand2 className="h-4 w-4" /> Clean failed records</Link></Button><Button onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> Download CSV</Button></>}
      />
      <InfoPanel title="Your final data">
        Records that failed are cleaned in the <Link to="/queue" className="text-primary underline">Fix queue</Link>: open one, fill in what's missing and press approve — it then appears here.
        Already-clean records can be corrected with the pencil button or removed with the bin.
      </InfoPanel>
      <SheetExportCard />
      <Input placeholder="Search title or address…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 w-full bg-card sm:w-72" />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
            <tr><th className="px-5 py-3 font-medium">Title</th><th className="px-5 py-3 text-right font-medium">Price</th><th className="px-5 py-3 font-medium">Source</th><th className="px-5 py-3 font-medium">Saved</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No clean records yet.</td></tr>}
            {rows.map((w) => (
              <tr key={w.id} className="transition-colors hover:bg-secondary/40">
                <td className="px-5 py-3 font-medium">{w.title}</td>
                <td className="px-5 py-3 text-right font-mono">{Number(w.price).toFixed(2)}</td>
                <td className="max-w-xs truncate px-5 py-3 text-xs text-muted-foreground">
                  {w.source_triage_id ? <Link to="/triage/$id" params={{ id: w.source_triage_id }} className="hover:text-primary">{w.url}</Link> : w.url}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">{new Date(w.extracted_at).toLocaleDateString()}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${w.title}`} onClick={() => setEditing({ id: w.id, title: w.title, price: String(w.price), url: w.url })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${w.title}`} onClick={() => remove(w.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit record</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="e-title">Title</Label><Input id="e-title" value={editing.title} maxLength={300} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="e-price">Price</Label><Input id="e-price" inputMode="decimal" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="e-url">Web address</Label><Input id="e-url" value={editing.url} maxLength={2048} onChange={(e) => setEditing({ ...editing, url: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
