import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LayoutDashboard, Workflow, Inbox, Database, KeyRound, LogOut, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInfoMode } from "@/lib/info-mode";
import { Switch } from "@/components/ui/switch";

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "open"
      ? "bg-status-open/15 text-status-open"
      : status === "resolved"
        ? "bg-status-resolved/15 text-status-resolved"
        : "bg-status-dismissed/15 text-status-dismissed";
  const label = status === "open" ? "Needs fixing" : status === "resolved" ? "Fixed" : "Dismissed";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/jobs", label: "Scraper jobs", icon: Workflow },
  { to: "/queue", label: "Fix queue", icon: Inbox },
  { to: "/data", label: "Clean data", icon: Database },
  { to: "/integration", label: "Connect scraper", icon: KeyRound },
] as const;

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-display text-xl font-semibold">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">S</span>
      Scrapefix
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="animate-fade-in mb-6 flex flex-wrap items-end gap-4">
      <div className="mr-auto">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { on, toggle } = useInfoMode();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkCls =
    "flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-secondary hover:text-foreground";
  const activeCls = "!bg-card !text-foreground shadow-sm font-medium";

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:py-6">
          <Link to="/dashboard"><Logo /></Link>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground lg:hidden" aria-label="Sign out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={linkCls} activeProps={{ className: activeCls }} activeOptions={{ exact: "exact" in n }}>
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden px-3 lg:absolute lg:bottom-4 lg:block lg:w-60">
          <label className="mb-2 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4" /> Guide mode
            <Switch checked={on} onCheckedChange={toggle} className="ml-auto" />
          </label>
          <button onClick={signOut} className={linkCls + " w-full"}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-10 lg:py-10">
        <div className="mb-4 flex justify-end lg:hidden">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" /> Guide
            <Switch checked={on} onCheckedChange={toggle} />
          </label>
        </div>
        {children}
      </main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`animate-fade-in rounded-2xl border bg-card p-5 shadow-sm ${className}`}>{children}</div>;
}
