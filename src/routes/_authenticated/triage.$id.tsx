import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card, StatusBadge } from "@/components/AppShell";
import { Hint, InfoPanel } from "@/lib/info-mode";
import { ERROR_LABELS } from "@/lib/triage";
import { cleanPrice, triageItemQuery } from "@/lib/triage";
import { supabase } from "@/integrations/supabase/client";
import { syncToSheet } from "@/lib/sheets.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/triage/$id")({
  head: () => ({
    meta: [
      { title: "Fix a record — Scrapefix" },
      { name: "description", content: "Inspect a failed scrape and fill in the missing data." },
      { property: "og:title", content: "Fix a record — Scrapefix" },
      { property: "og:description", content: "Inspect a failed scrape and fill in the missing data." },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: r, isLoading } = useQuery(triageItemQuery(id));
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!r) return;
    const partial = ((r.raw_payload as Record<string, unknown>)?.["partial"] ?? {}) as Record<string, unknown>;
    const t = partial["title"];
    const p = partial["price"];
    setTitle(typeof t === "string" ? t : "");
    setPrice(p != null ? String(p) : "");
    setNotes(r.notes ?? "");
  }, [r]);

  const cleaned = cleanPrice(price);

  async function done(msg: string) {
    await qc.invalidateQueries({ queryKey: ["triage"] });
    await qc.invalidateQueries({ queryKey: ["warehouse"] });
    toast.success(msg);
    navigate({ to: "/queue" });
  }

  async function promote() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (cleaned === null) { toast.error("Enter a valid price"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("promote_triage_record", {
      _id: id,
      _title: title.trim().slice(0, 500),
      _price: cleaned,
      _notes: notes.slice(0, 2000),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    syncToSheet({ data: { onlyIfAuto: true } })
      .then((res) => {
        if (res.error) toast.error(`Google Sheet not updated: ${res.error}`);
        else if (!res.skipped) toast.success("Google Sheet updated");
        qc.invalidateQueries({ queryKey: ["sheet-export"] });
      })
      .catch(() => toast.error("Google Sheet not updated"));
    done("Promoted to warehouse");
  }

  async function dismiss() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("human_triage_queue")
      .update({ status: "dismissed", notes: notes.slice(0, 2000), resolved_by: u.user?.id ?? null, resolved_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    done("Record dismissed");
  }

  async function retryLater() {
    setBusy(true);
    const { error } = await supabase
      .from("human_triage_queue")
      .update({ status: "open", notes: notes.slice(0, 2000), resolved_by: null, resolved_at: null })
      .eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    done("Kept in queue");
  }

  if (isLoading) return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;
  if (!r)
    return (
      <AppShell>
        <p>Record not found. <Link to="/queue" className="text-primary underline">Back to queue</Link></p>
      </AppShell>
    );

  return (
    <AppShell>
      <Link to="/queue" className="text-sm text-muted-foreground hover:text-foreground">← Back to fix queue</Link>
      <div className="animate-fade-in mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold">Fix this record</h1>
        <StatusBadge status={r.status} />
      </div>
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 mb-6 block break-all text-sm text-primary hover:underline">{r.url} ↗</a>
      <InfoPanel title="What to do here">
        On the left you see what went wrong. Open the page link, find the correct values, fill them in on the right, then press Approve.
      </InfoPanel>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <h2 className="flex items-center gap-2 text-sm font-semibold">What went wrong <Hint text="The technical message your scraper reported." /></h2>
            <p className="mt-1 text-sm text-muted-foreground">{ERROR_LABELS[r.error_type] ?? r.error_type} · {new Date(r.logged_at).toLocaleString()}</p>
            <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary p-3 font-mono text-xs text-destructive">{r.error_message || "(no message)"}</pre>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 text-sm font-semibold">What the scraper captured <Hint text="Any partial data collected before the failure." /></h2>
            <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-secondary p-3 font-mono text-xs text-muted-foreground">{JSON.stringify(r.raw_payload, null, 2)}</pre>
          </Card>
        </div>
        <Card>
          <h2 className="text-sm font-semibold">Correct values</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} maxLength={500} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price" className="flex items-center gap-1">Price <Hint text="Type it as you see it. Symbols like $ and commas are removed automatically." /></Label>
              <Input id="price" value={price} maxLength={50} onChange={(e) => setPrice(e.target.value)} className="font-mono" placeholder="$1,249.00" />
              <p className="text-xs text-muted-foreground">Will be saved as: {cleaned === null ? <span className="text-destructive">not a valid price</span> : <b className="font-mono">{cleaned.toFixed(2)}</b>}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. site moved the price box" />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={promote} disabled={busy}>Approve & save</Button>
              <Button variant="outline" onClick={retryLater} disabled={busy}>Later</Button>
              <Button variant="ghost" onClick={dismiss} disabled={busy} className="text-muted-foreground">Dismiss</Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
