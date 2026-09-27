import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

async function gw(path: string, init: RequestInit = {}): Promise<unknown> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !sheetsKey) throw new Error("Google Sheets is not connected.");
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": sheetsKey,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Sheets request failed [${res.status}]: ${body}`);
    if (res.status === 404) throw new Error("Spreadsheet not found. Check the link and that it's shared with the connected Google account.");
    if (res.status === 403) throw new Error("No permission to edit this spreadsheet. Share it with the connected Google account.");
    throw new Error(`Google Sheets error (${res.status}).`);
  }
  return res.json();
}

/** Accepts a full Google Sheets URL or a raw spreadsheet ID. */
export function parseSpreadsheetId(input: string): string | null {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const id = m ? m[1] : input.trim();
  return /^[a-zA-Z0-9-_]{10,200}$/.test(id ?? "") ? (id as string) : null;
}

export const syncToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ onlyIfAuto: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }): Promise<{ ok: boolean; rows: number; skipped?: boolean; error?: string }> => {
    const { supabase, userId } = context;
    const { data: cfg } = await supabase.from("sheet_exports").select("*").eq("owner_id", userId).maybeSingle();
    if (!cfg) return { ok: false, rows: 0, skipped: true };
    if (data.onlyIfAuto && !cfg.auto_sync) return { ok: true, rows: 0, skipped: true };

    const { data: rows, error } = await supabase
      .from("scraped_warehouse")
      .select("title,price,url,extracted_at")
      .eq("owner_id", userId)
      .order("extracted_at", { ascending: false });
    if (error) throw new Error(error.message);

    const tab = cfg.sheet_name;
    const quoted = `'${tab.replace(/'/g, "''")}'`;
    try {
      const meta = (await gw(`/spreadsheets/${cfg.spreadsheet_id}?fields=sheets.properties.title`)) as {
        sheets?: { properties?: { title?: string } }[];
      };
      if (!meta.sheets?.some((s) => s.properties?.title === tab)) {
        await gw(`/spreadsheets/${cfg.spreadsheet_id}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
        });
      }
      await gw(`/spreadsheets/${cfg.spreadsheet_id}/values/${encodeURIComponent(quoted)}!A:D:clear`, { method: "POST", body: "{}" });
      const values = [
        ["Title", "Price", "Source URL", "Saved at"],
        ...(rows ?? []).map((r) => [r.title, Number(r.price), r.url, r.extracted_at]),
      ];
      await gw(`/spreadsheets/${cfg.spreadsheet_id}/values/${encodeURIComponent(quoted)}!A1:D${values.length}?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ values }),
      });
      await supabase.from("sheet_exports").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("owner_id", userId);
      return { ok: true, rows: values.length - 1 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      await supabase.from("sheet_exports").update({ last_error: msg }).eq("owner_id", userId);
      return { ok: false, rows: 0, error: msg };
    }
  });
