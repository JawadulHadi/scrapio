import { useEffect, useState } from "react";
import { z } from "zod";
import { ExternalLink, Globe, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const urlSchema = z
  .string()
  .trim()
  .max(2048, "That address is too long")
  .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
  .pipe(z.string().url("Enter a valid web address, like shop.com/product"))
  .refine((v) => /^https?:$/.test(new URL(v).protocol), "Only http and https addresses work");

const STORE = "scrapefix-preview-sites";
const MAX = 8;

const screenshot = (u: string) =>
  `https://api.microlink.io/?url=${encodeURIComponent(u)}&screenshot=true&meta=false&embed=screenshot.url`;
const favicon = (u: string) =>
  `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(new URL(u).hostname)}`;

export function SiteUrlPreview() {
  const [sites, setSites] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "[]");
      if (Array.isArray(saved)) {
        const ok = saved.filter((s): s is string => typeof s === "string" && urlSchema.safeParse(s).success).slice(0, MAX);
        setSites(ok);
        setActive(ok[0] ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  const save = (next: string[]) => {
    setSites(next);
    localStorage.setItem(STORE, JSON.stringify(next));
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const r = urlSchema.safeParse(value);
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Invalid address");
    if (sites.includes(r.data)) return setError("You already added that site");
    if (sites.length >= MAX) return setError(`You can preview up to ${MAX} sites`);
    save([r.data, ...sites]);
    setActive(r.data);
    setValue("");
    setError(null);
  };

  const remove = (u: string) => {
    const next = sites.filter((s) => s !== u);
    save(next);
    if (active === u) setActive(next[0] ?? null);
  };

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="site-url" className="sr-only">Website address</label>
        <Input id="site-url" value={value} onChange={(e) => { setValue(e.target.value); setError(null); }} placeholder="Paste a website address you scrape" aria-invalid={!!error} />
        <Button type="submit" size="icon" aria-label="Add site"><Plus className="h-4 w-4" /></Button>
      </form>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}

      {sites.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
          <Globe className="h-6 w-6" /> Add a site above to see a live preview of it.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <ul className="space-y-2">
            {sites.map((u) => {
              const url = new URL(u);
              return (
                <li key={u}>
                  <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${active === u ? "border-primary bg-primary/10" : "bg-background/60 hover:bg-background"}`}>
                    <button type="button" onClick={() => setActive(u)} className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                      <img src={favicon(u)} alt="" className="h-5 w-5 shrink-0 rounded" loading="lazy" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{url.hostname}</span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">{url.pathname + url.search}</span>
                      </span>
                    </button>
                    <a href={u} target="_blank" rel="noreferrer noopener" aria-label={`Open ${url.hostname}`} className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>
                    <button type="button" onClick={() => remove(u)} aria-label={`Remove ${url.hostname}`} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
          {active && (
            <div className="overflow-hidden rounded-xl border bg-background/60">
              <div className="flex items-center gap-1.5 border-b px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-destructive/70" /><span className="h-2 w-2 rounded-full bg-status-open" /><span className="h-2 w-2 rounded-full bg-status-resolved" />
                <span className="ml-2 truncate font-mono text-xs text-muted-foreground">{active}</span>
              </div>
              <img key={active} src={screenshot(active)} alt={`Preview of ${new URL(active).hostname}`} className="aspect-video w-full animate-fade-in object-cover object-top bg-muted" loading="lazy" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
