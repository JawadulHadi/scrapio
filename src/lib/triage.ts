import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TriageRow = Database["public"]["Tables"]["human_triage_queue"]["Row"];
export type TriageStatus = Database["public"]["Enums"]["triage_status"];
export type WarehouseRow = Database["public"]["Tables"]["scraped_warehouse"]["Row"];

export const ERROR_TYPES = ["layout_shift", "captcha", "network", "validation", "other"] as const;

export const triageListQuery = () =>
  queryOptions({
    queryKey: ["triage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("human_triage_queue")
        .select("*")
        .order("logged_at", { ascending: false })
        .limit(500);
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
      const { data, error } = await supabase
        .from("scraped_warehouse")
        .select("*")
        .order("extracted_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

export const isOperatorQuery = () =>
  queryOptions({
    queryKey: ["is-operator"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "operator");
      return (data?.length ?? 0) > 0;
    },
  });

/** Mirrors the Python validator: strips "$", "," etc. and coerces to a number. */
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
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
