import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listEmojis, upsertEmoji } from "@/lib/admin/payments.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/buttons")({ component: ButtonsPage });

type ButtonDef = { key: string; name: string; defaultLabel: string; defaultEmoji: string };

const GROUPS: { title: string; description: string; items: ButtonDef[] }[] = [
  {
    title: "Main Menu",
    description: "The 6 main buttons shown on /start and Home.",
    items: [
      { key: "menu_categories", name: "Categories", defaultLabel: "Categories", defaultEmoji: "🗂" },
      { key: "menu_search", name: "Search", defaultLabel: "Search", defaultEmoji: "🔎" },
      { key: "menu_orders", name: "My Orders", defaultLabel: "My Orders", defaultEmoji: "🧾" },
      { key: "menu_profile", name: "Profile", defaultLabel: "Profile", defaultEmoji: "👤" },
      { key: "menu_referrals", name: "Referrals", defaultLabel: "Referrals", defaultEmoji: "🎁" },
      { key: "menu_support", name: "Support", defaultLabel: "Support", defaultEmoji: "💬" },
    ],
  },
  {
    title: "Navigation",
    description: "Back / Home / Close shown under every sub-screen.",
    items: [
      { key: "menu_back", name: "Back", defaultLabel: "Back", defaultEmoji: "‹" },
      { key: "menu_home", name: "Home", defaultLabel: "Home", defaultEmoji: "🏠" },
      { key: "menu_close", name: "Close", defaultLabel: "Close", defaultEmoji: "✕" },
    ],
  },
  {
    title: "Actions",
    description: "Buy and payment confirmation buttons.",
    items: [
      { key: "action_buy", name: "Buy Now", defaultLabel: "Buy now", defaultEmoji: "🛒" },
      { key: "action_paid", name: "I Have Paid", defaultLabel: "I have paid", defaultEmoji: "✅" },
    ],
  },
  {
    title: "Payment Networks",
    description: "Crypto checkout network selector buttons.",
    items: [
      { key: "pay_trc20", name: "USDT TRC20", defaultLabel: "Pay with USDT (TRC20)", defaultEmoji: "💵" },
      { key: "pay_bep20", name: "USDT BEP20", defaultLabel: "Pay with USDT (BEP20)", defaultEmoji: "🟡" },
      { key: "pay_sol", name: "Solana (SOL)", defaultLabel: "Pay with Solana (SOL)", defaultEmoji: "🟣" },
    ],
  },
];

type Row = {
  key: string;
  name: string;
  label: string;
  fallback_emoji: string;
  premium_emoji_id: string;
  dirty: boolean;
  saving: boolean;
};

function ButtonsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listEmojis);
  const upFn = useServerFn(upsertEmoji);
  const { data: rows = [] } = useQuery({ queryKey: ["admin-emojis"], queryFn: () => listFn() });

  const byKey = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of rows as any[]) m[r.key] = r;
    return m;
  }, [rows]);

  const [state, setState] = useState<Record<string, Row>>({});

  const getRow = (def: ButtonDef): Row => {
    if (state[def.key]) return state[def.key];
    const existing = byKey[def.key];
    return {
      key: def.key,
      name: def.name,
      label: existing?.label ?? def.defaultLabel,
      fallback_emoji: existing?.fallback_emoji ?? def.defaultEmoji,
      premium_emoji_id: existing?.premium_emoji_id ?? "",
      dirty: false,
      saving: false,
    };
  };

  const update = (def: ButtonDef, patch: Partial<Row>) => {
    setState((s) => ({ ...s, [def.key]: { ...getRow(def), ...patch, dirty: true } }));
  };

  const save = async (def: ButtonDef) => {
    const r = getRow(def);
    setState((s) => ({ ...s, [def.key]: { ...r, saving: true } }));
    try {
      await upFn({
        data: {
          key: def.key,
          name: def.name,
          label: r.label || null,
          fallback_emoji: r.fallback_emoji || def.defaultEmoji,
          premium_emoji_id: r.premium_emoji_id || null,
          scope: "button",
        },
      });
      toast.success(`${def.name} saved`);
      setState((s) => ({ ...s, [def.key]: { ...r, dirty: false, saving: false } }));
      qc.invalidateQueries({ queryKey: ["admin-emojis"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
      setState((s) => ({ ...s, [def.key]: { ...r, saving: false } }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">Bot Buttons Manager</h1>
        <p className="text-sm text-muted-foreground">
          Edit the label, emoji, and Telegram Premium emoji ID for every button shown in the bot.
        </p>
        <p className="mt-1 text-xs text-amber-400/80">
          Telegram only renders premium icons on buttons for users on Premium and on supported clients. The fallback emoji is always shown otherwise.
        </p>
      </div>

      {GROUPS.map((group) => (
        <Card key={group.title} className="card-premium p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{group.title}</h2>
                <Badge variant="secondary">{group.items.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {group.items.map((def) => {
              const r = getRow(def);
              return (
                <div
                  key={def.key}
                  className="grid items-end gap-3 rounded-lg border border-white/10 bg-background/40 p-3 md:grid-cols-[140px_1fr_120px_1fr_auto]"
                >
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Button</Label>
                    <div className="text-sm font-medium">{def.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{def.key}</div>
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Label</Label>
                    <Input
                      value={r.label}
                      onChange={(e) => update(def, { label: e.target.value })}
                      placeholder={def.defaultLabel}
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Emoji</Label>
                    <Input
                      value={r.fallback_emoji}
                      onChange={(e) => update(def, { fallback_emoji: e.target.value })}
                      placeholder={def.defaultEmoji}
                      maxLength={8}
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Premium emoji ID (optional)</Label>
                    <Input
                      value={r.premium_emoji_id}
                      onChange={(e) => update(def, { premium_emoji_id: e.target.value })}
                      placeholder="5879770924629905517"
                    />
                  </div>

                  <Button
                    onClick={() => save(def)}
                    disabled={!r.dirty || r.saving}
                    size="sm"
                    className="md:self-end"
                  >
                    {r.saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
