import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, Sparkles, Zap, ShieldCheck, Film, Brain, Gamepad2, Wrench } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OTT & AI Store Bot — Premium Telegram Storefront" },
      { name: "description", content: "Sell OTT subscriptions, AI tools, gaming credits and utilities through a beautiful Telegram bot. Managed from a premium admin dashboard." },
      { property: "og:title", content: "OTT & AI Store Bot" },
      { property: "og:description", content: "Premium Telegram storefront with admin analytics, broadcasts and support." },
    ],
  }),
  component: Landing,
});

function Feature({ icon: Icon, title, desc }: any) {
  return (
    <Card className="card-premium p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Card>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/40 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] btn-glow">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-black tracking-tight">OTT & AI Store</span>
          </div>
          <Link to="/auth"><Button>Admin login</Button></Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Premium Telegram storefront
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">
            Sell <span className="text-gradient">OTT &amp; AI</span> apps on Telegram.
            <br />Manage everything here.
          </h1>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            A complete bot + admin console: catalog, premium emojis, orders, broadcasts, support tickets and live analytics — no code to ship a new product.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/admin"><Button size="lg" className="btn-glow">Open admin</Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">Sign in</Button></Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={Film} title="OTT Catalog" desc="Netflix, Prime, Disney+, Spotify and more, all bookable in chat." />
          <Feature icon={Brain} title="AI Apps" desc="ChatGPT, Claude, Gemini, Perplexity — instant delivery." />
          <Feature icon={Gamepad2} title="Gaming" desc="Subscriptions, credits and utilities for gamers." />
          <Feature icon={Wrench} title="Utilities" desc="Canva, Cursor, CapCut — productivity SaaS." />
          <Feature icon={Sparkles} title="Premium emojis" desc="Show animated Telegram custom emojis next to every product." />
          <Feature icon={Zap} title="Broadcasts" desc="Push offers to all users with one click, rate-limited safely." />
          <Feature icon={ShieldCheck} title="Admin gated" desc="RLS-protected dashboard with role-based access." />
          <Feature icon={Bot} title="Future proof" desc="Add any new app from the dashboard — no code changes." />
        </div>
      </main>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        Built with Lovable · Telegram + Lovable Cloud
      </footer>
    </div>
  );
}
