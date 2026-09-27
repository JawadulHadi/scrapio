import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, FileSpreadsheet, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseSpreadsheetId, syncToSheet } from "@/lib/sheets.functions";
import { Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { timeAgo } from "@/lib/triage";

export function SheetExportCard() {
  const qc = useQueryClient();
  const sync = useServerFn(syncToSheet);
  const { data: cfg } = useQuery({
    queryKey: ["sheet-export"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sheet_exports").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [link, setLink] = useState("");
  const [tab, setTab] = useState("Scrapefix");
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cfg) return;
    setLink(`https://docs.google.com/spreadsheets/d/${cfg.spreadsheet_id}/edit`);
    setTab(cfg.sheet_name);
    setAuto(cfg.auto_sync);
  }, [cfg]);

  async function save() {
    const id = parseSpreadsheetId(link);
    if (!id) { toast.error("That doesn't look like a Google Sheets link. Copy it from your browser's address bar while the sheet is open."); return; }
    const name = tab.trim().slice(0, 100) || "Scrapefix";
    setBusy(true);
    const { error } = await supabase.from("sheet_exports").upsert({ spreadsheet_id: id, sheet_name: name, auto_sync: auto, updated_at: new Date().toISOString() });
    if (error) { setBusy(false); toast.error(error.message); return; }
    await runSync();
  }

  async function runSync() {
    setBusy(true);
    try {
      const res = await sync({ data: {} });
      if (res.error) toast.error(res.error);
      else toast.success(`Sent ${res.rows} records to Google Sheets`);
    } catch (e) {
      toast.error(e instanceof Error ? `Sync failed: ${e.message}` : "Sync failed");
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["sheet-export"] });
    }
  }

  async function disconnect() {
    await supabase.from("sheet_exports").delete().not("owner_id", "is", null);
    setLink("");
    qc.invalidateQueries({ queryKey: ["sheet-export"] });
    toast.success("Spreadsheet removed");
  }

  return (
    <Card className="mb-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-status-resolved/10 p-2 text-status-resolved"><FileSpreadsheet className="h-5 w-5" /></div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold">Google Sheets export</h2>
          <p className="text-sm text-muted-foreground">
            Paste a spreadsheet link. We'll write all your clean records into one tab and refresh it every time you approve a record.
          </p>
        </div>
      </div>
      <ol className="mt-4 list-decimal space-y-1 rounded-xl border bg-background/50 py-3 pl-8 pr-4 text-sm text-muted-foreground">
        <li>Open or create a spreadsheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-primary underline">sheets.new</a>.</li>
        <li>Click <b>Share</b> and give <b>jawadulhadicc@gmail.com</b> <b>Editor</b> access (skip this if the sheet is already in that Google account).</li>
        <li>Copy the sheet's link from the address bar and paste it below.</li>
        <li>Press <b>Connect spreadsheet</b>. A tab named below is created and filled with your clean records.</li>
      </ol>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="sheet-link">Spreadsheet link</Label>
          <Input id="sheet-link" placeholder="https://docs.google.com/spreadsheets/d/…" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sheet-tab">Tab name</Label>
          <Input id="sheet-tab" value={tab} onChange={(e) => setTab(e.target.value)} maxLength={100} />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <Switch checked={auto} onCheckedChange={setAuto} /> Update automatically after each approval
      </label>
      <p className="mt-2 text-xs text-muted-foreground">Everything in that tab is replaced on each update, so use a tab just for this.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={busy}>{cfg ? "Save & sync" : "Connect spreadsheet"}</Button>
        {cfg && <Button variant="outline" onClick={runSync} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Sync now</Button>}
        {cfg && (
          <a href={`https://docs.google.com/spreadsheets/d/${cfg.spreadsheet_id}/edit`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Open sheet <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {cfg && <Button variant="ghost" size="sm" onClick={disconnect} className="ml-auto text-muted-foreground">Remove</Button>}
      </div>
      {cfg && (
        <p className={`mt-3 text-xs ${cfg.last_error ? "text-destructive" : "text-muted-foreground"}`}>
          {cfg.last_error ? `Last sync failed: ${cfg.last_error}` : cfg.last_synced_at ? `Last updated ${timeAgo(cfg.last_synced_at)}` : "Not synced yet"}
        </p>
      )}
    </Card>
  );
}
