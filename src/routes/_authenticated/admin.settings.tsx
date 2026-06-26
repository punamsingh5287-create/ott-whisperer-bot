import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getSettings, updateSettings, syncBotUsername } from "@/lib/admin/store.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSettings);
  const setFn = useServerFn(updateSettings);
  const syncFn = useServerFn(syncBotUsername);
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: () => getFn() });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data) setForm({ ...data }); }, [data]);

  const save = async () => {
    try {
      await setFn({ data: {
        bot_name: form.bot_name ?? "",
        welcome_text: form.welcome_text ?? "",
        support_handle: form.support_handle ?? "",
        referral_reward: Number(form.referral_reward ?? 0),
        bot_username: form.bot_username ?? null,
      } });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  };

  if (!form) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Bot identity, welcome message and support channel.</p>
      </div>
      <Card className="card-premium grid gap-3 p-5 md:grid-cols-2">
        <div><Label>Bot name (header)</Label><Input value={form.bot_name ?? ""} onChange={(e) => setForm({ ...form, bot_name: e.target.value })} /></div>
        <div>
          <Label>Bot username</Label>
          <div className="flex gap-2">
            <Input value={form.bot_username ?? ""} onChange={(e) => setForm({ ...form, bot_username: e.target.value })} placeholder="my_bot" />
            <Button variant="outline" size="icon" onClick={async () => { await syncFn(); toast.success("Synced"); qc.invalidateQueries({ queryKey: ["admin-settings"] }); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="md:col-span-2"><Label>Welcome text</Label><Textarea rows={4} value={form.welcome_text ?? ""} onChange={(e) => setForm({ ...form, welcome_text: e.target.value })} /></div>
        <div><Label>Support handle</Label><Input value={form.support_handle ?? ""} onChange={(e) => setForm({ ...form, support_handle: e.target.value })} /></div>
        <div><Label>Referral reward ($)</Label><Input type="number" value={form.referral_reward ?? 0} onChange={(e) => setForm({ ...form, referral_reward: e.target.value })} /></div>
        <div className="md:col-span-2"><Button onClick={save}>Save settings</Button></div>
      </Card>
    </div>
  );
}
