import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listTopups, reviewTopup } from "@/lib/admin/topups.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/topups")({ component: TopupsPage });

function TopupsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const listFn = useServerFn(listTopups);
  const reviewFn = useServerFn(reviewTopup);
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-topups", status],
    queryFn: () => listFn({ data: { status } }),
  });

  const [acting, setActing] = useState<{ id: string; action: "approve" | "reject"; defaultAmount?: number } | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");

  const submit = async () => {
    if (!acting) return;
    try {
      await reviewFn({
        data: {
          id: acting.id,
          action: acting.action,
          amount: acting.action === "approve" ? Number(amount) : undefined,
          note: note || null,
        },
      });
      toast.success(acting.action === "approve" ? "Approved & credited" : "Rejected");
      setActing(null); setNote(""); setAmount("");
      qc.invalidateQueries({ queryKey: ["admin-topups"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Wallet Topups</h1>
          <p className="text-sm text-muted-foreground">Review deposit proofs and credit user balances.</p>
        </div>
        <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(rows as any[]).length === 0 && (
          <Card className="card-premium p-6 text-sm text-muted-foreground md:col-span-2">No topups here yet.</Card>
        )}
        {(rows as any[]).map((p) => (
          <Card key={p.id} className="card-premium p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{p.network}</Badge>
                  <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "outline"}>
                    {p.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-2 text-base font-semibold">
                  Amount claimed: ${Number(p.amount || 0).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Buyer: {p.bot_users?.first_name ?? "—"} · @{p.bot_users?.username ?? p.bot_users?.telegram_id}
                  {" · "}Balance ${Number(p.bot_users?.balance ?? 0).toFixed(2)}
                </div>
                {p.tx_hash && (
                  <div className="mt-2 break-all rounded-md border border-white/10 bg-background/40 p-2 font-mono text-[11px]">
                    {p.tx_hash}
                  </div>
                )}
                {p.admin_note && <div className="mt-2 text-xs italic text-muted-foreground">Note: {p.admin_note}</div>}
              </div>
              {p.screenshot_signed_url ? (
                <a href={p.screenshot_signed_url} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={p.screenshot_signed_url} alt="" className="h-20 w-20 rounded-md border border-white/10 object-cover" />
                </a>
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-dashed border-white/10 text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
            </div>
            {p.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => {
                  setActing({ id: p.id, action: "approve", defaultAmount: Number(p.amount) || 0 });
                  setAmount(String(Number(p.amount) || ""));
                  setNote("");
                }}>
                  <Check className="mr-1 h-4 w-4" />Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  setActing({ id: p.id, action: "reject" }); setNote(""); setAmount("");
                }}>
                  <X className="mr-1 h-4 w-4" />Reject
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={!!acting} onOpenChange={(o) => !o && setActing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{acting?.action === "approve" ? "Approve deposit" : "Reject deposit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {acting?.action === "approve" && (
              <div>
                <Label>Amount to credit (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}
            <div>
              <Label>Note (optional)</Label>
              <Textarea placeholder="Optional note for the buyer…" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActing(null)}>Cancel</Button>
            <Button onClick={submit} variant={acting?.action === "reject" ? "destructive" : "default"}>
              {acting?.action === "approve" ? "Approve & credit" : "Reject & notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
