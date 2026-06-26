import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Users, TrendingUp, DollarSign, Film, Plus, Pencil, Trash2, LogOut, Bot, ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { bootstrapAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard" }] }),
  component: AdminPage,
});

type Content = {
  id: string; title: string; description: string | null; poster_url: string | null;
  category: string | null; content_type: string; is_active: boolean; created_at: string;
};
type Plan = {
  id: string; name: string; price: number; duration_days: number;
  features: string | null; is_active: boolean; created_at: string;
};
type BotUser = { id: string; telegram_id: number; username: string | null; is_subscribed: boolean; last_active: string; joined_at: string };
type Conversion = { id: string; amount: number; created_at: string; plan_id: string | null };

function AdminPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const bootstrap = useServerFn(bootstrapAdmin);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
    })();
  }, []);

  async function claimAdmin() {
    const res = await bootstrap();
    if (res.ok) { toast.success("You are now admin"); setIsAdmin(true); }
    else toast.error("Admin already exists. Ask an admin to grant you access.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (checking) return <div className="p-8 text-muted-foreground">Loading...</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md p-8 text-center">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-xl font-semibold mb-2">Admin access required</h2>
          <p className="text-sm text-muted-foreground mb-6">
            If you're the first user, claim admin to get started.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={claimAdmin}>Claim admin role</Button>
            <Button variant="outline" onClick={signOut}>Sign out</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">OTT Bot Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="content"><ContentTab /></TabsContent>
          <TabsContent value="pricing"><PricingTab /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}

function DashboardTab() {
  const [stats, setStats] = useState({ users: 0, active: 0, subs: 0, revenue: 0, content: 0, plans: 0 });
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [u, a, s, c, ct, p] = await Promise.all([
        supabase.from("bot_users").select("*", { count: "exact", head: true }),
        supabase.from("bot_users").select("*", { count: "exact", head: true }).gte("last_active", since),
        supabase.from("bot_users").select("*", { count: "exact", head: true }).eq("is_subscribed", true),
        supabase.from("conversions").select("amount"),
        supabase.from("ott_content").select("*", { count: "exact", head: true }),
        supabase.from("pricing_plans").select("*", { count: "exact", head: true }),
      ]);
      const revenue = (c.data || []).reduce((sum, r: any) => sum + Number(r.amount), 0);
      setStats({
        users: u.count || 0, active: a.count || 0, subs: s.count || 0,
        revenue, content: ct.count || 0, plans: p.count || 0,
      });
    })();
  }, []);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard icon={Users} label="Total Bot Users" value={String(stats.users)} />
      <StatCard icon={TrendingUp} label="Active (7d)" value={String(stats.active)} />
      <StatCard icon={Users} label="Subscribers" value={String(stats.subs)} />
      <StatCard icon={DollarSign} label="Total Revenue" value={`₹${stats.revenue.toFixed(2)}`} />
      <StatCard icon={Film} label="Content Items" value={String(stats.content)} />
      <StatCard icon={DollarSign} label="Pricing Plans" value={String(stats.plans)} />
    </div>
  );
}

function ContentTab() {
  const [items, setItems] = useState<Content[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);

  async function load() {
    const { data } = await supabase.from("ott_content").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("ott_content").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Content Library</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <ContentDialog editing={editing} onDone={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead><TableHead>Type</TableHead>
              <TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No content yet</TableCell></TableRow>
            )}
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell>{c.content_type}</TableCell>
                <TableCell>{c.category || "—"}</TableCell>
                <TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function ContentDialog({ editing, onDone }: { editing: Content | null; onDone: () => void }) {
  const [form, setForm] = useState({
    title: editing?.title || "", description: editing?.description || "",
    poster_url: editing?.poster_url || "", category: editing?.category || "",
    content_type: editing?.content_type || "movie", is_active: editing?.is_active ?? true,
  });
  useEffect(() => {
    setForm({
      title: editing?.title || "", description: editing?.description || "",
      poster_url: editing?.poster_url || "", category: editing?.category || "",
      content_type: editing?.content_type || "movie", is_active: editing?.is_active ?? true,
    });
  }, [editing]);

  async function save() {
    if (!form.title.trim()) return toast.error("Title required");
    const payload = { ...form };
    const { error } = editing
      ? await supabase.from("ott_content").update(payload).eq("id", editing.id)
      : await supabase.from("ott_content").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); onDone(); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Content</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Category</Label><Input placeholder="Action, Drama..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div><Label>Type</Label><Input placeholder="movie/show" value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })} /></div>
        </div>
        <div><Label>Poster URL</Label><Input value={form.poster_url} onChange={(e) => setForm({ ...form, poster_url: e.target.value })} /></div>
        <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
      </div>
      <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
    </DialogContent>
  );
}

function PricingTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  async function load() {
    const { data } = await supabase.from("pricing_plans").select("*").order("price");
    setPlans(data || []);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("pricing_plans").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Pricing Plans</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" /> Add Plan</Button>
          </DialogTrigger>
          <PlanDialog editing={editing} onDone={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Price</TableHead>
              <TableHead>Duration</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No plans yet</TableCell></TableRow>
            )}
            {plans.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>₹{Number(p.price).toFixed(2)}</TableCell>
                <TableCell>{p.duration_days} days</TableCell>
                <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function PlanDialog({ editing, onDone }: { editing: Plan | null; onDone: () => void }) {
  const [form, setForm] = useState({
    name: editing?.name || "", price: editing?.price?.toString() || "",
    duration_days: editing?.duration_days?.toString() || "30",
    features: editing?.features || "", is_active: editing?.is_active ?? true,
  });
  useEffect(() => {
    setForm({
      name: editing?.name || "", price: editing?.price?.toString() || "",
      duration_days: editing?.duration_days?.toString() || "30",
      features: editing?.features || "", is_active: editing?.is_active ?? true,
    });
  }, [editing]);

  async function save() {
    if (!form.name.trim() || !form.price) return toast.error("Name and price required");
    const payload = {
      name: form.name, price: Number(form.price),
      duration_days: Number(form.duration_days), features: form.features, is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("pricing_plans").update(payload).eq("id", editing.id)
      : await supabase.from("pricing_plans").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); onDone(); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Plan</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Price (₹)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div><Label>Duration (days)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></div>
        </div>
        <div><Label>Features (one per line)</Label><Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></div>
        <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
      </div>
      <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
    </DialogContent>
  );
}

function AnalyticsTab() {
  const [users, setUsers] = useState<BotUser[]>([]);
  const [convs, setConvs] = useState<Conversion[]>([]);
  useEffect(() => {
    (async () => {
      const [u, c] = await Promise.all([
        supabase.from("bot_users").select("*").order("last_active", { ascending: false }).limit(20),
        supabase.from("conversions").select("*").order("created_at", { ascending: false }),
      ]);
      setUsers(u.data || []);
      setConvs(c.data || []);
    })();
  }, []);

  // Build 14-day chart of conversions
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
  const chartData = days.map((day) => {
    const dayConvs = convs.filter((c) => c.created_at.slice(0, 10) === day);
    return {
      date: day.slice(5),
      conversions: dayConvs.length,
      revenue: dayConvs.reduce((s, c) => s + Number(c.amount), 0),
    };
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="font-semibold mb-4">Conversions (last 14 days)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="conversions" stroke="hsl(var(--primary))" fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold mb-4">Recent Bot Users</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Telegram ID</TableHead><TableHead>Username</TableHead>
              <TableHead>Subscribed</TableHead><TableHead>Last Active</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No bot users yet</TableCell></TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.telegram_id}</TableCell>
                  <TableCell>{u.username || "—"}</TableCell>
                  <TableCell>{u.is_subscribed ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(u.last_active).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
