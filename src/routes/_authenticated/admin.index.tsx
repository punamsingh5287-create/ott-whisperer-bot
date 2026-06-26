import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview } from "@/lib/admin/store.functions";
import { Card } from "@/components/ui/card";
import { Users, ShoppingCart, DollarSign, TrendingUp, Package, Activity } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function StatCard({ icon: Icon, label, value, hint }: any) {
  return (
    <Card className="card-premium relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function Overview() {
  const fn = useServerFn(getOverview);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });

  if (isLoading || !data) return <div className="text-muted-foreground">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">Overview</h1>
        <p className="text-sm text-muted-foreground">Real-time analytics from your Telegram bot.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Total Users" value={data.totalUsers} />
        <StatCard icon={Activity} label="Active 7d" value={data.activeUsers} />
        <StatCard icon={TrendingUp} label="Subscribers" value={data.subscribers} hint={`${data.conversionRate}% conv.`} />
        <StatCard icon={ShoppingCart} label="Orders" value={data.totalOrders} />
        <StatCard icon={DollarSign} label="Revenue" value={`$${data.revenue}`} />
        <StatCard icon={Package} label="Products" value={data.products} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-premium p-5 lg:col-span-2">
          <div className="mb-3 text-sm font-semibold">Daily new users · last 14 days</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyJoins}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(295 80% 60%)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(295 80% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                <Area type="monotone" dataKey="count" stroke="oklch(0.78 0.22 295)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-premium p-5">
          <div className="mb-3 text-sm font-semibold">Top selling · last 14 days</div>
          <div className="space-y-2">
            {data.topProducts.length === 0 && (
              <div className="text-sm text-muted-foreground">No sales yet.</div>
            )}
            {data.topProducts.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-lg">{p.emoji}</span>
                  <span className="truncate text-sm font-medium">{p.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">{p.count}× · ${p.revenue}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
