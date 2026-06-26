import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBroadcasts, sendBroadcast } from "@/lib/admin/store.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/broadcasts")({ component: BroadcastsPage });

function BroadcastsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBroadcasts);
  const sendFn = useServerFn(sendBroadcast);
  const { data = [] } = useQuery({ queryKey: ["admin-broadcasts"], queryFn: () => listFn() });

  const [form, setForm] = useState({
    title: "", message: "", premium_emoji_id: "", fallback_emoji: "📣", target: "all" as "all" | "subscribers",
  });
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error("Title and message required"); return; }
    setSending(true);
    try {
      const r: any = await sendFn({ data: {
        ...form,
        premium_emoji_id: form.premium_emoji_id || null,
        fallback_emoji: form.fallback_emoji || null,
      } });
      toast.success(`Sent to ${r.sent}, failed ${r.failed}`);
      setForm({ ...form, title: "", message: "" });
      qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    } catch (e: any) { toast.error(e?.message ?? "Send failed"); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">Broadcasts</h1>
        <p className="text-sm text-muted-foreground">Push announcements to all bot users.</p>
      </div>

      <Card className="card-premium grid gap-3 p-5 md:grid-cols-2">
        <div className="md:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Message</Label><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
        <div><Label>Premium emoji ID</Label><Input value={form.premium_emoji_id} onChange={(e) => setForm({ ...form, premium_emoji_id: e.target.value })} /></div>
        <div><Label>Fallback emoji</Label><Input value={form.fallback_emoji} onChange={(e) => setForm({ ...form, fallback_emoji: e.target.value })} /></div>
        <div><Label>Target</Label>
          <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="subscribers">Subscribers only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={send} disabled={sending} className="w-full"><Send className="mr-2 h-4 w-4" />{sending ? "Sending…" : "Send now"}</Button>
        </div>
        <div className="rounded-md border bg-muted/40 p-3 md:col-span-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Preview</div>
          <div className="mt-1 text-sm">{form.fallback_emoji} <b>{form.title || "Title"}</b><br />{form.message || "Your message…"}</div>
        </div>
      </Card>

      <Card className="card-premium p-5">
        <div className="mb-3 text-sm font-semibold">History</div>
        <div className="space-y-2">
          {(data as any[]).length === 0 && <div className="text-sm text-muted-foreground">No broadcasts yet.</div>}
          {(data as any[]).map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-md border border-border/60 p-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{b.title}</div>
                <div className="truncate text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()} · {b.target}</div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Badge variant="secondary">{b.status}</Badge>
                <span className="text-muted-foreground">✓ {b.sent_count} · ✗ {b.failed_count}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
