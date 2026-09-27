import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/AppShell";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Scrapefix — Fix broken scrapes in minutes" },
      { name: "description", content: "Catch every failed scrape, fix it by hand in seconds, and export clean data." },
      { property: "og:title", content: "Scrapefix — Fix broken scrapes in minutes" },
      { property: "og:description", content: "Catch every failed scrape, fix it by hand in seconds, and export clean data." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(128),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [magic, setMagic] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error(result.error.message ?? "Google sign-in failed"); setBusy(false); return; }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (magic) {
      const ok = z.string().trim().email().max(255).safeParse(email);
      if (!ok.success) { toast.error("Enter a valid email"); return; }
      setBusy(true);
      const { error } = await supabase.auth.signInWithOtp({ email: ok.data, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) toast.error(error.message);
      else toast.success("Check your inbox — we sent you a sign-in link.");
      return;
    }
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        navigate({ to: "/", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/", replace: true });
        else toast.success("Check your email to confirm your account.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 lg:flex">
        <Logo />
        <div className="animate-fade-in">
          <h2 className="font-display text-5xl font-semibold leading-tight">Websites change.<br /><span className="text-primary">Your data shouldn't break.</span></h2>
          <ul className="mt-8 space-y-3 text-muted-foreground">
            {["Every failed scrape lands in one tidy queue", "Fix records by hand in seconds", "Export clean, verified data to Excel"].map((t) => (
              <li key={t} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-status-resolved" />{t}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Human-in-the-loop data quality for scrapers.</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
      <div className="animate-fade-in w-full max-w-sm">
        <div className="mb-8 lg:hidden"><Logo /></div>
        <h1 className="font-display text-3xl font-semibold">{mode === "signin" ? "Welcome back" : "Create your workspace"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mode === "signin" ? "Sign in to your workspace." : "Free to start. Your data stays private to you."}</p>
        <Button type="button" variant="outline" className="mt-6 w-full" disabled={busy} onClick={google}>
          Continue with Google
        </Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />or with email<div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          {!magic && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : magic ? "Email me a sign-in link" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button type="button" onClick={() => setMagic(!magic)} className="mt-3 w-full text-center text-sm font-medium text-primary hover:underline">
          {magic ? "Use a password instead" : "Use a magic link instead (no password)"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
      </div>
      </div>
    </div>
  );
}
