import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBotUsers, toggleBan } from "@/lib/admin/store.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: UsersPage });

function UsersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBotUsers);
  const banFn = useServerFn(toggleBan);
  const { data = [] } = useQuery({ queryKey: ["admin-bot-users"], queryFn: () => listFn() });
  const [q, setQ] = useState("");

  const rows = (data as any[]).filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      u.username?.toLowerCase().includes(s) ||
      u.first_name?.toLowerCase().includes(s) ||
      String(u.telegram_id).includes(s) ||
      u.referral_code?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Bot Users</h1>
          <p className="text-sm text-muted-foreground">Everyone who has interacted with your bot.</p>
        </div>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full max-w-xs" />
      </div>
      <Card className="card-premium overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>User</TableHead><TableHead>Spent</TableHead><TableHead>Status</TableHead>
            <TableHead>Joined</TableHead><TableHead>Active</TableHead><TableHead>Banned</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.first_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">@{u.username ?? u.telegram_id} · <code>{u.referral_code}</code></div>
                </TableCell>
                <TableCell>${u.total_spent}</TableCell>
                <TableCell>{u.is_subscribed ? <Badge>Subscribed</Badge> : <Badge variant="secondary">Free</Badge>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.joined_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.last_active).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Switch checked={u.is_banned} onCheckedChange={async (c) => {
                    await banFn({ data: { id: u.id, banned: c } });
                    qc.invalidateQueries({ queryKey: ["admin-bot-users"] });
                  }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
