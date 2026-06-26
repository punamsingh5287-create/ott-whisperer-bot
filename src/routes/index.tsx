import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Bot, BarChart3, Film, DollarSign } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OTT Bot Admin Dashboard" },
      { name: "description", content: "Manage your OTT Telegram bot content, pricing, and analytics in one place." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold">OTT Bot</span>
          </div>
          <Link to="/auth">
            <Button>Admin Login</Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            OTT Telegram Bot — Admin Console
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Manage content, pricing, and track real-time bot analytics. Built for OTT subscription businesses.
          </p>
          <Link to="/auth">
            <Button size="lg">Open Dashboard</Button>
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
          {[
            { icon: Film, title: "Content Library", desc: "Add, edit, and organize movies & shows." },
            { icon: DollarSign, title: "Pricing Plans", desc: "Configure subscription tiers and offers." },
            { icon: BarChart3, title: "Bot Analytics", desc: "Active users, conversions, revenue." },
          ].map((f) => (
            <div key={f.title} className="p-6 border rounded-lg">
              <f.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
