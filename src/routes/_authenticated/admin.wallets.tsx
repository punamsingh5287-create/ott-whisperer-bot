import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listWallets, upsertWallet, deleteWallet } from "@/lib/admin/payments.functions";
import { uploadSigned } from "@/lib/admin/storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/wallets")({ component: WalletsPage });

const empty = {
  network: "USDT_TRC20" as "USDT_TRC20" | "USDT_BEP20" | "SOL",
  address: "", label: "", qr_url: "", is_active: true,
};

function WalletsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listWallets);
  const upFn = useServerFn(upsertWallet);
  const delFn = useServerFn(deleteWallet);
  const { data: rows = [] } = useQuery({ queryKey: ["admin-wallets"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    try {
      await upFn({ data: {
        ...form,
        label: form.label || null,
        qr_url: form.qr_url || null,
      } });
      toast.success("Saved"); setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Wallets</h1>
          <p className="text-sm text-muted-foreground">Crypto receive addresses shown to buyers in the bot.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(empty)}><Plus className="mr-1 h-4 w-4" />New wallet</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} wallet</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Network</Label>
                <Select value={form.network} onValueChange={(v) => setForm({ ...form, network: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT_TRC20">USDT (TRC20)</SelectItem>
                    <SelectItem value="USDT_BEP20">USDT (BEP20)</SelectItem>
                    <SelectItem value="SOL">Solana (SOL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Wallet address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="T... / 0x... / ..." /></div>
              <div><Label>Label (optional)</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Main wallet" /></div>
              <div>
                <Label>QR image</Label>
                <div className="flex items-center gap-3">
                  {form.qr_url && <img src={form.qr_url} alt="" className="h-14 w-14 rounded-md object-cover" />}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/30">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading…" : "Upload QR"}
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setUploading(true);
                      try {
                        const url = await uploadSigned("wallet-qrs", f);
                        setForm((s: any) => ({ ...s, qr_url: url }));
                        toast.success("QR uploaded");
                      } catch (err: any) { toast.error(err?.message ?? "Upload failed"); }
                      finally { setUploading(false); }
                    }} />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(rows as any[]).length === 0 && <Card className="card-premium p-6 text-sm text-muted-foreground md:col-span-2 lg:col-span-3">No wallets yet — add one to enable crypto checkout.</Card>}
        {(rows as any[]).map((w) => (
          <Card key={w.id} className="card-premium p-5">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="secondary">{w.network}</Badge>
                <div className="mt-2 text-sm font-semibold">{w.label || "Wallet"}</div>
              </div>
              <Badge variant={w.is_active ? "default" : "outline"}>{w.is_active ? "Active" : "Disabled"}</Badge>
            </div>
            <div className="mt-3 break-all rounded-md border border-white/10 bg-background/40 p-2 font-mono text-xs">
              {w.address}
            </div>
            {w.qr_url && <img src={w.qr_url} alt="" className="mt-3 h-32 w-32 rounded-lg border border-white/10 object-contain" />}
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(w.address); toast.success("Copied"); }}>
                <Copy className="mr-1 h-3 w-3" />Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setForm({ ...w, label: w.label ?? "", qr_url: w.qr_url ?? "" }); setOpen(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={async () => {
                if (!confirm("Delete wallet?")) return;
                await delFn({ data: { id: w.id } });
                toast.success("Deleted");
                qc.invalidateQueries({ queryKey: ["admin-wallets"] });
              }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
