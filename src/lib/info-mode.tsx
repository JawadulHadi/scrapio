import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Ctx = createContext<{ on: boolean; toggle: () => void }>({ on: true, toggle: () => {} });

export function InfoModeProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const v = localStorage.getItem("info-mode");
    if (v !== null) setOn(v === "1");
  }, []);
  const toggle = () =>
    setOn((p) => {
      localStorage.setItem("info-mode", p ? "0" : "1");
      return !p;
    });
  return (
    <Ctx.Provider value={{ on, toggle }}>
      <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
    </Ctx.Provider>
  );
}

export const useInfoMode = () => useContext(Ctx);

/** Small (i) icon with a tooltip. Always available. */
export function Hint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label="More info" className="inline-flex text-muted-foreground transition-colors hover:text-primary">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-foreground text-background">{text}</TooltipContent>
    </Tooltip>
  );
}

/** Explanation panel shown only when the "Guide" toggle is on. */
export function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  const { on } = useInfoMode();
  if (!on) return null;
  return (
    <div className="animate-fade-in mb-6 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <div className="mt-1 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
