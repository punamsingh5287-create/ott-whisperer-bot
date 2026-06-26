import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listEmojis, upsertEmoji, deleteEmoji } from "@/lib/admin/payments.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/emojis")({ component: EmojisPage });

const empty = { key: "", name: "", premium_emoji_id: "", fallback_emoji: "✨", scope: "button" as const };

function EmojisPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listEmojis);
  const upFn = useServerFn(upsertEmoji);
  const delFn = useServerFn(deleteEmoji);
  const { data: rows = [] } = useQuery({ queryKey: ["admin-emojis"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const save = async () => {
    try {
      await upFn({ data: {
        ...form,
        key: form.key.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        premium_emoji_id: form.premium_emoji_id || null,
      } });
      toast.success("Saved"); setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-emojis"] });
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  };

  const grouped = (rows as any[]).reduce<Record<string, any[]>>((acc, r) => {
    (acc[r.scope] ||= []).push(r); return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Premium Emoji Manager</h1>
          <p className="text-sm text-muted-foreground">Manage Telegram Premium custom emojis used across bot menus and messages.</p>
          <p className="mt-1 text-xs text-amber-400/80">
            ⚠️ Premium emojis on <b>buttons</b> (Bot API 9.4 <code>icon_custom_emoji_id</code>) only render when the bot owner has an active Telegram Premium subscription. The fallback emoji is shown otherwise.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(empty)}><Plus className="mr-1 h-4 w-4" />New emoji</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} emoji preset</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Key (slug)</Label>
                <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="menu_home" /></div>
              <div><Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Home button" /></div>
              <div><Label>Premium emoji ID</Label>
                <Input value={form.premium_emoji_id} onChange={(e) => setForm({ ...form, premium_emoji_id: e.target.value })} placeholder="5879770924629905517" />
                <p className="mt-1 text-xs text-muted-foreground">Forward an animated emoji to @idstickerbot to find its ID.</p></div>
              <div><Label>Fallback emoji</Label>
                <Input value={form.fallback_emoji} onChange={(e) => setForm({ ...form, fallback_emoji: e.target.value })} placeholder="✨" /></div>
              <div><Label>Scope</Label>
                <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="button">Button</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select></div>
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                Preview: <span className="text-xl">{form.fallback_emoji || "✨"}</span> {form.name || "—"}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {Object.entries(grouped).map(([scope, items]) => (
        <Card key={scope} className="card-premium p-5">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="secondary" className="uppercase">{scope}</Badge>
            <span className="text-xs text-muted-foreground">{items.length} preset{items.length === 1 ? "" : "s"}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-background/40 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-card text-lg">{r.fallback_emoji}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{r.key}</div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setForm({ ...r, premium_emoji_id: r.premium_emoji_id ?? "" }); setOpen(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (!confirm("Delete emoji preset?")) return;
                    await delFn({ data: { id: r.id } });
                    toast.success("Deleted");
                    qc.invalidateQueries({ queryKey: ["admin-emojis"] });
                  }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
