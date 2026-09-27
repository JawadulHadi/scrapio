import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bug, FileSpreadsheet, Inbox, KeyRound, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { Logo } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { SiteUrlPreview } from "@/components/SiteUrlPreview";

const TITLE = "Scrapefix — Never lose scraped data to a broken website again";
const DESC = "When a website changes and your scraper breaks, Scrapefix catches the failed page, lets a person fix it in seconds, and sends clean data to your spreadsheet.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: Bug, title: "Scraper hits a wall", text: "A website changes its layout. Instead of crashing, your scraper sends the page here." },
  { icon: Inbox, title: "It lands in your queue", text: "Every broken page waits in one tidy list, with the reason it failed." },
  { icon: Wand2, title: "You fix it in seconds", text: "See what was found, fill in what's missing, press approve." },
  { icon: FileSpreadsheet, title: "Clean data goes out", text: "Approved records go straight to your Google Sheet or a CSV download." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/30 blur-[120px]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <a href="#how" className="hidden px-3 text-sm text-muted-foreground hover:text-foreground sm:inline">How it works</a>
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
          <Button asChild size="sm"><Link to="/auth">Start free</Link></Button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24">
        <section className="animate-fade-in pt-12 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-glow" /> A safety net for web scrapers
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2.25rem,6vw+1rem,4.5rem)] font-extrabold leading-[1.05] tracking-tight">
            Websites break scrapers.<br /><span className="text-gradient">We catch what falls.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            When a site changes and your scraper fails, the page isn't lost. It comes to Scrapefix, a person fixes it in seconds,
            and clean data flows to your spreadsheet.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-[0_0_30px_-6px_var(--glow)]">
              <Link to="/auth">Create free workspace <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline"><a href="#how">See how it works</a></Button>
          </div>
        </section>

        {/* Bento */}
        <section className="mt-20 grid auto-rows-[minmax(180px,auto)] gap-4 md:grid-cols-6">
          <div className="animate-fade-in glow-card hover-lift relative overflow-hidden rounded-2xl bg-card p-6 md:col-span-4 md:row-span-2" style={{ animationDelay: "80ms" }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-glow">Try it</p>
            <h3 className="mt-2 font-display text-2xl font-bold">Preview the sites you scrape</h3>
            <SiteUrlPreview />
          </div>

          <div className="animate-fade-in glow-card hover-lift rounded-2xl bg-gradient-to-br from-primary to-secondary p-6 md:col-span-2" style={{ animationDelay: "160ms" }}>
            <p className="font-display text-5xl font-extrabold">0</p>
            <p className="mt-1 text-sm text-primary-foreground/80">records silently lost. Every failed page is kept until someone handles it.</p>
          </div>

          <div className="animate-fade-in glow-card hover-lift rounded-2xl bg-card p-6 md:col-span-2" style={{ animationDelay: "240ms" }}>
            <FileSpreadsheet className="animate-float h-8 w-8 text-status-resolved" />
            <h3 className="mt-3 font-display text-lg font-bold">Google Sheets, always current</h3>
            <p className="mt-1 text-sm text-muted-foreground">Approve a record and your sheet updates by itself.</p>
          </div>

          <div className="animate-fade-in glow-card hover-lift rounded-2xl bg-card p-6 md:col-span-3" style={{ animationDelay: "320ms" }}>
            <KeyRound className="h-7 w-7 text-glow" />
            <h3 className="mt-3 font-display text-lg font-bold">Plug in any scraper</h3>
            <p className="mt-1 text-sm text-muted-foreground">Copy one short snippet into your Python scraper. We give you the key and the code.</p>
          </div>

          <div className="animate-fade-in glow-card hover-lift rounded-2xl bg-card p-6 md:col-span-3" style={{ animationDelay: "400ms" }}>
            <ShieldCheck className="h-7 w-7 text-glow" />
            <h3 className="mt-3 font-display text-lg font-bold">Private by default</h3>
            <p className="mt-1 text-sm text-muted-foreground">Each workspace is sealed off. Only you see your jobs, failures and data.</p>
          </div>
        </section>

        <section id="how" className="mt-28 scroll-mt-10">
          <h2 className="text-center font-display text-3xl font-extrabold sm:text-4xl">How it works</h2>
          <p className="mt-3 text-center text-muted-foreground">Four steps, no guesswork.</p>
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="animate-fade-in glow-card hover-lift relative rounded-2xl bg-card p-6" style={{ animationDelay: `${i * 100}ms` }}>
                <span className="absolute right-5 top-4 font-display text-4xl font-extrabold text-secondary">{i + 1}</span>
                <s.icon className="h-7 w-7 text-glow" />
                <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="glow-card relative mt-28 overflow-hidden rounded-3xl bg-card p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-glow/10" />
          <h2 className="relative font-display text-3xl font-extrabold sm:text-5xl">Stop losing data to broken pages.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">Free to start. Sign in with Google or an email link. No password needed.</p>
          <Button asChild size="lg" className="relative mt-8 shadow-[0_0_30px_-6px_var(--glow)]">
            <Link to="/auth">Get started <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </section>
      </main>

      <footer className="relative z-10 border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Scrapefix · A safety net for web scrapers
      </footer>
    </div>
  );
}
