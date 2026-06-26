import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listPayments, reviewPayment } from "@/lib/admin/payments.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const listFn = useServerFn(listPayments);
  const reviewFn = useServerFn(reviewPayment);
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-payments", status],
    queryFn: () => listFn({ data: { status } }),
  });

  const [acting, setActing] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!acting) return;
    try {
      await reviewFn({ data: { id: acting.id, action: acting.action, note: note || null } });
      toast.success(acting.action === "approve" ? "Approved" : "Rejected");
      setActing(null); setNote("");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Payments</h1>
          <p className="text-sm text-muted-foreground">Verify customer crypto payments and update order status.</p>
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
        {(rows as any[]).length === 0 && <Card className="card-premium p-6 text-sm text-muted-foreground md:col-span-2">Nothing here yet.</Card>}
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
                  {p.orders?.products?.fallback_emoji} {p.orders?.products?.name ?? "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Amount <b>${p.amount}</b> · Order <code>{String(p.order_id).slice(0, 8)}</code>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Buyer: {p.bot_users?.first_name ?? "—"} · @{p.bot_users?.username ?? p.bot_users?.telegram_id}
                </div>
                {p.tx_hash && (
                  <div className="mt-2 break-all rounded-md border border-white/10 bg-background/40 p-2 font-mono text-[11px]">
                    {p.tx_hash}
                  </div>
                )}
                {p.admin_note && <div className="mt-2 text-xs italic text-muted-foreground">Note: {p.admin_note}</div>}
              </div>
              {p.screenshot_signed_url && (
                <a href={p.screenshot_signed_url} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={p.screenshot_signed_url} alt="" className="h-20 w-20 rounded-md border border-white/10 object-cover" />
                </a>
              )}
              {!p.screenshot_signed_url && (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-dashed border-white/10 text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
            </div>
            {p.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => { setActing({ id: p.id, action: "approve" }); setNote(""); }}>
                  <Check className="mr-1 h-4 w-4" />Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { setActing({ id: p.id, action: "reject" }); setNote(""); }}>
                  <X className="mr-1 h-4 w-4" />Reject
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={!!acting} onOpenChange={(o) => !o && setActing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{acting?.action === "approve" ? "Approve" : "Reject"} payment</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Textarea placeholder="Optional note for the buyer…" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActing(null)}>Cancel</Button>
            <Button onClick={submit} variant={acting?.action === "reject" ? "destructive" : "default"}>
              {acting?.action === "approve" ? "Approve & notify" : "Reject & notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
