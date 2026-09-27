import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  url: z.string().trim().url().max(2048),
  error_type: z.enum(["layout_shift", "captcha", "network", "validation", "other"]).default("other"),
  error_message: z.string().max(8000).default(""),
  raw_payload: z.record(z.string(), z.unknown()).default({}),
  job_id: z.string().uuid().nullish(),
});

export const Route = createFileRoute("/api/public/triage/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = (request.headers.get("x-ingest-key") ?? "").trim();
        if (!/^[a-f0-9]{48}$/.test(provided)) return new Response("Unauthorized", { status: 401 });

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: k } = await supabaseAdmin.from("ingest_keys").select("owner_id").eq("key", provided).maybeSingle();
        if (!k) return new Response("Unauthorized", { status: 401 });

        let jobId: string | null = null;
        if (parsed.data.job_id) {
          const { data: j } = await supabaseAdmin.from("scraper_jobs").select("id").eq("id", parsed.data.job_id).eq("owner_id", k.owner_id).maybeSingle();
          jobId = j?.id ?? null;
        }

        const { data, error } = await supabaseAdmin
          .from("human_triage_queue")
          .insert({
            owner_id: k.owner_id,
            job_id: jobId,
            url: parsed.data.url,
            error_type: parsed.data.error_type,
            error_message: parsed.data.error_message,
            raw_payload: parsed.data.raw_payload as never,
          })
          .select("id")
          .single();
        if (error) {
          console.error("ingest insert failed", error);
          return Response.json({ error: "Insert failed" }, { status: 500 });
        }
        return Response.json({ ok: true, id: data.id }, { status: 201 });
      },
    },
  },
});
