import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { cleanPrice, triageItemQuery } from "@/lib/triage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/triage/$id")({
  head: () => ({
    meta: [
      { title: "Review record — Triage Console" },
      { name: "description", content: "Inspect a failed scrape and fill in the missing data." },
      { property: "og:title", content: "Review record — Triage Console" },
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
    navigate({ to: "/" });
  }

  async function promote() {
    if (!title.trim()) return toast.error("Title is required");
    if (cleaned === null) return toast.error("Enter a valid price");
    setBusy(true);
    const { error } = await supabase.rpc("promote_triage_record", {
      _id: id,
      _title: title.trim().slice(0, 500),
      _price: cleaned,
      _notes: notes.slice(0, 2000),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    done("Promoted to warehouse");
  }

  async function dismiss() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("human_triage_queue")
      .update({ status: "dismissed", notes: notes.slice(0, 2000), resolved_by: u.user?.id, resolved_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    done("Record dismissed");
  }

  async function retryLater() {
    setBusy(true);
    const { error } = await supabase
      .from("human_triage_queue")
      .update({ status: "open", notes: notes.slice(0, 2000), resolved_by: null, resolved_at: null })
      .eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    done("Kept in queue");
  }

  if (isLoading) return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;
  if (!r)
    return (
      <AppShell>
        <p>Record not found. <Link to="/" className="text-primary underline">Back to queue</Link></p>
      </AppShell>
    );

  return (
    <AppShell>
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to queue</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Review failed run</h1>
        <StatusBadge status={r.status} />
        <span className="font-mono text-xs text-muted-foreground">{r.error_type}</span>
      </div>
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all font-mono text-xs text-primary hover:underline">
        {r.url} ↗
      </a>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div>
            <h2 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Error trace</h2>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-sidebar p-3 font-mono text-xs text-destructive">
              {r.error_message || "(no message)"}
            </pre>
          </div>
          <div>
            <h2 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Raw payload</h2>
            <pre className="max-h-72 overflow-auto rounded-md border bg-sidebar p-3 font-mono text-xs text-muted-foreground">
              {JSON.stringify(r.raw_payload, null, 2)}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">Logged {new Date(r.logged_at).toLocaleString()}</p>
        </section>

        <section className="rounded-md border bg-card p-4">
          <h2 className="text-sm font-semibold">Manual override</h2>
          <p className="mt-1 text-xs text-muted-foreground">Fill in the fields the scraper couldn't extract, then promote.</p>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} maxLength={500} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price</Label>
              <Input id="price" value={price} maxLength={50} onChange={(e) => setPrice(e.target.value)} className="font-mono" placeholder="$1,249.00" />
              <p className="font-mono text-xs text-muted-foreground">
                Saved as: {cleaned === null ? <span className="text-destructive">invalid</span> : cleaned.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. selector changed to .pdp-title" />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={promote} disabled={busy}>Approve & promote</Button>
              <Button variant="outline" onClick={retryLater} disabled={busy}>Retry later</Button>
              <Button variant="ghost" onClick={dismiss} disabled={busy} className="text-muted-foreground">Dismiss</Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
