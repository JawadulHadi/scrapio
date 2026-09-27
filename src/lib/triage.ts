import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TriageRow = Database["public"]["Tables"]["human_triage_queue"]["Row"];
export type TriageStatus = Database["public"]["Enums"]["triage_status"];
export type WarehouseRow = Database["public"]["Tables"]["scraped_warehouse"]["Row"];
export type JobRow = Database["public"]["Tables"]["scraper_jobs"]["Row"];

export const ERROR_TYPES = ["layout_shift", "captcha", "network", "validation", "other"] as const;
export const ERROR_LABELS: Record<string, string> = {
  layout_shift: "Page layout changed",
  captcha: "Blocked by CAPTCHA",
  network: "Network / timeout",
  validation: "Bad or missing data",
  other: "Other",
};

export const triageListQuery = () =>
  queryOptions({
    queryKey: ["triage"],
    queryFn: async () => {
      const { data, error } = await supabase.from("human_triage_queue").select("*").order("logged_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });

export const triageItemQuery = (id: string) =>
  queryOptions({
    queryKey: ["triage", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("human_triage_queue").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const warehouseQuery = () =>
  queryOptions({
    queryKey: ["warehouse"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scraped_warehouse").select("*").order("extracted_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });

export const jobsQuery = () =>
  queryOptions({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scraper_jobs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const ingestKeyQuery = () =>
  queryOptions({
    queryKey: ["ingest-key"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("ingest_keys").select("key").eq("owner_id", u.user.id).maybeSingle();
      if (data) return data.key;
      const { data: created, error } = await supabase.from("ingest_keys").insert({ owner_id: u.user.id }).select("key").single();
      if (error) throw error;
      return created.key;
    },
  });

/** Strips "$", "," etc. and coerces to a number. */
export function cleanPrice(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
