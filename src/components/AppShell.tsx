import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isOperatorQuery } from "@/lib/triage";
import { Button } from "@/components/ui/button";

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "open"
      ? "bg-status-open/15 text-status-open border-status-open/30"
      : status === "resolved"
        ? "bg-status-resolved/15 text-status-resolved border-status-resolved/30"
        : "bg-status-dismissed/15 text-status-dismissed border-status-dismissed/30";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isOperator, isLoading } = useQuery(isOperatorQuery());

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkCls = "rounded px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent";
  const activeCls = "!text-foreground bg-accent";

  return (
    <div className="min-h-screen">
      <header className="border-b bg-sidebar">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-mono text-sm font-bold">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
            TRIAGE://CONSOLE
          </Link>
          <nav className="flex gap-1">
            <Link to="/" className={linkCls} activeProps={{ className: activeCls }} activeOptions={{ exact: true }}>
              Queue
            </Link>
            <Link to="/warehouse" className={linkCls} activeProps={{ className: activeCls }}>
              Warehouse
            </Link>
            <Link to="/integration" className={linkCls} activeProps={{ className: activeCls }}>
              Scraper setup
            </Link>
          </nav>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {!isLoading && isOperator === false ? (
          <div className="rounded-md border bg-card p-6 text-sm">
            <p className="font-semibold">You don't have operator access yet.</p>
            <p className="mt-1 text-muted-foreground">Ask an existing operator to grant your account access.</p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
