import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOrders, setOrderStatus } from "@/lib/admin/store.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: OrdersPage });

const STATUS = ["awaiting_payment", "pending_review", "pending", "confirmed", "delivered", "cancelled"] as const;

function OrdersPage() {
  const qc = useQueryClient();
  const fn = useServerFn(listOrders);
  const setFn = useServerFn(setOrderStatus);
  const { data = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: () => fn() });
  const [filter, setFilter] = useState("");

  const rows = (data as any[]).filter((o) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      o.products?.name?.toLowerCase().includes(q) ||
      o.bot_users?.username?.toLowerCase().includes(q) ||
      String(o.bot_users?.telegram_id ?? "").includes(q) ||
      o.status.includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Orders</h1>
          <p className="text-sm text-muted-foreground">Last 200 orders, newest first.</p>
        </div>
        <Input placeholder="Search…" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full max-w-xs" />
      </div>
      <Card className="card-premium overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Product</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead>
            <TableHead>Status</TableHead><TableHead>Date</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No orders.</TableCell></TableRow>}
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{o.products?.fallback_emoji} {o.products?.name ?? "—"}</TableCell>
                <TableCell>
                  <div className="text-sm">{o.bot_users?.first_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">@{o.bot_users?.username ?? o.bot_users?.telegram_id}</div>
                </TableCell>
                <TableCell>₹{o.amount}</TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={async (v) => {
                    await setFn({ data: { id: o.id, status: v as any } });
                    qc.invalidateQueries({ queryKey: ["admin-orders"] });
                  }}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
