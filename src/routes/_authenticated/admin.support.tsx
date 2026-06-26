import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listTickets, ticketThread, replyTicket, closeTicket } from "@/lib/admin/store.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/support")({ component: SupportPage });

function SupportPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTickets);
  const threadFn = useServerFn(ticketThread);
  const replyFn = useServerFn(replyTicket);
  const closeFn = useServerFn(closeTicket);

  const { data: tickets = [] } = useQuery({ queryKey: ["admin-tickets"], queryFn: () => listFn() });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: thread } = useQuery({
    queryKey: ["admin-ticket", activeId],
    queryFn: () => threadFn({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  const send = async () => {
    if (!activeId || !reply.trim()) return;
    await replyFn({ data: { id: activeId, body: reply.trim() } });
    setReply("");
    toast.success("Sent");
    qc.invalidateQueries({ queryKey: ["admin-ticket", activeId] });
    qc.invalidateQueries({ queryKey: ["admin-tickets"] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">Support</h1>
        <p className="text-sm text-muted-foreground">Reply to user tickets directly in Telegram.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="card-premium max-h-[70vh] overflow-y-auto p-2">
          {(tickets as any[]).length === 0 && <div className="p-4 text-sm text-muted-foreground">No tickets.</div>}
          {(tickets as any[]).map((t) => (
            <button key={t.id} onClick={() => setActiveId(t.id)}
              className={`block w-full rounded-md p-3 text-left transition ${activeId === t.id ? "bg-primary/15" : "hover:bg-accent/30"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{t.subject}</span>
                <Badge variant={t.status === "open" ? "default" : "secondary"} className="shrink-0">{t.status}</Badge>
              </div>
              <div className="truncate text-xs text-muted-foreground">@{t.bot_users?.username ?? t.bot_users?.telegram_id} · {new Date(t.updated_at).toLocaleDateString()}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{t.last_message}</div>
            </button>
          ))}
        </Card>

        <Card className="card-premium flex max-h-[70vh] flex-col p-4">
          {!activeId && <div className="m-auto text-sm text-muted-foreground">Select a ticket.</div>}
          {activeId && thread && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{(thread as any).ticket?.subject}</div>
                  <div className="text-xs text-muted-foreground">@{(thread as any).ticket?.bot_users?.username ?? (thread as any).ticket?.bot_users?.telegram_id}</div>
                </div>
                <Button size="sm" variant="outline" onClick={async () => {
                  await closeFn({ data: { id: activeId } }); toast.success("Closed");
                  qc.invalidateQueries({ queryKey: ["admin-tickets"] });
                }}>Close ticket</Button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto rounded-md border border-border/60 p-3">
                {(thread as any).messages.map((m: any) => (
                  <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.from_admin ? "ml-auto bg-primary/20" : "bg-muted/60"}`}>
                    <div>{m.body}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Textarea rows={2} placeholder="Reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                <Button onClick={send}>Send</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
