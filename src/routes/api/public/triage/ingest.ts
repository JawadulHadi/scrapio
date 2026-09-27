import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

const bodySchema = z.object({
  url: z.string().trim().url().max(2048),
  error_type: z.enum(["layout_shift", "captcha", "network", "validation", "other"]).default("other"),
  error_message: z.string().max(8000).default(""),
  raw_payload: z.record(z.string(), z.unknown()).default({}),
});

export const Route = createFileRoute("/api/public/triage/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["SCRAPER_INGEST_KEY"];
        if (!expected) return new Response("Ingest not configured", { status: 503 });
        const provided = request.headers.get("x-ingest-key") ?? "";
        const a = Buffer.from(provided);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("human_triage_queue")
          .insert({ ...parsed.data, raw_payload: parsed.data.raw_payload as never })
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
