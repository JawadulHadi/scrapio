import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { Hint, InfoPanel } from "@/lib/info-mode";
import { jobsQuery, triageListQuery } from "@/lib/triage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "Scraper jobs — Scrapefix" },
      { name: "description", content: "Manage the websites your scraper collects data from." },
      { property: "og:title", content: "Scraper jobs — Scrapefix" },
      { property: "og:description", content: "Manage the websites your scraper collects data from." },
    ],
  }),
  component: JobsPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  target_url: z.string().trim().url("Enter a full web address (https://…)").max(2048),
  schedule: z.enum(["hourly", "daily", "weekly", "manual"]),
  engine: z.enum(["static", "interactive"]),
});

function JobsPage() {
  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery(jobsQuery());
  const { data: rows = [] } = useQuery(triageListQuery());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", target_url: "", schedule: "daily", engine: "static" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(form);
    if (!p.success) { toast.error(p.error.issues[0]?.message); return; }
    const { error } = await supabase.from("scraper_jobs").insert(p.data);
    if (error) { toast.error(error.message); return; }
    toast.success("Job added");
    setOpen(false);
    setForm({ name: "", target_url: "", schedule: "daily", engine: "static" });
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }
  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("scraper_jobs").update({ active }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this job? Its past failures stay in the queue.")) return;
    const { error } = await supabase.from("scraper_jobs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }

  const sel = "h-10 w-full rounded-md border bg-card px-3 text-sm";

  return (
    <AppShell>
      <PageHeader
        title="Scraper jobs"
        subtitle="The websites you collect data from."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New job</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New scraper job</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Competitor prices" /></div>
                <div className="space-y-1.5"><Label>Website address</Label><Input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://shop.example.com/products" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">How often <Hint text="How often your scraper should visit this site." /></Label>
                    <select className={sel} value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })}>
                      <option value="hourly">Every hour</option><option value="daily">Every day</option><option value="weekly">Every week</option><option value="manual">Only when I run it</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">Page type <Hint text="Simple: plain pages. Interactive: pages that need a real browser (buttons, infinite scroll)." /></Label>
                    <select className={sel} value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })}>
                      <option value="static">Simple page</option><option value="interactive">Interactive page</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" className="w-full">Add job</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <InfoPanel title="What is a job?">
        A job tells your scraper which website to visit and how often. Failures reported for a job are counted here, so you can spot which sites break most.
      </InfoPanel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && jobs.length === 0 && <Card className="md:col-span-2 xl:col-span-3 text-center text-muted-foreground">No jobs yet. Add your first website.</Card>}
        {jobs.map((j) => {
          const fails = rows.filter((r) => r.job_id === j.id);
          const openCount = fails.filter((r) => r.status === "open").length;
          return (
            <Card key={j.id} className="hover-lift">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{j.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{j.target_url}</p>
                </div>
                <Switch checked={j.active} onCheckedChange={(v) => toggle(j.id, v)} aria-label="Active" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-secondary px-2.5 py-1">{{ hourly: "Hourly", daily: "Daily", weekly: "Weekly", manual: "Manual" }[j.schedule]}</span>
                <span className="rounded-full bg-secondary px-2.5 py-1">{j.engine === "static" ? "Simple page" : "Interactive page"}</span>
                <span className={`rounded-full px-2.5 py-1 ${j.active ? "bg-status-resolved/15 text-status-resolved" : "bg-muted text-muted-foreground"}`}>{j.active ? "Active" : "Paused"}</span>
              </div>
              <div className="mt-4 flex items-center border-t pt-3 text-sm">
                <span className="text-muted-foreground">{fails.length} failures · <span className="text-status-open">{openCount} to fix</span></span>
                <button onClick={() => remove(j.id)} className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
