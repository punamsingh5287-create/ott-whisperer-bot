import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/admin/store.functions";
import { updateBranding } from "@/lib/admin/payments.functions";
import { uploadSigned } from "@/lib/admin/storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/branding")({ component: BrandingPage });

function ImgUpload({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const [up, setUp] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex items-center gap-3">
        {value
          ? <img src={value} alt="" className="h-12 w-12 rounded-md border border-white/10 object-contain" />
          : <div className="grid h-12 w-12 place-items-center rounded-md border border-dashed border-white/10 text-xs text-muted-foreground">none</div>}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/30">
          <Upload className="h-4 w-4" />{up ? "Uploading…" : "Upload"}
          <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setUp(true);
            try { onChange(await uploadSigned("branding", f)); toast.success("Uploaded"); }
            catch (err: any) { toast.error(err?.message ?? "Failed"); }
            finally { setUp(false); }
          }} />
        </label>
        {value && <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Remove</Button>}
      </div>
    </div>
  );
}

function BrandingPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSettings);
  const setFn = useServerFn(updateBranding);
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: () => getFn() });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data) setForm({ ...data }); }, [data]);

  const save = async () => {
    try {
      await setFn({ data: {
        site_name: form.site_name ?? "",
        panel_title: form.panel_title ?? "",
        footer_text: form.footer_text ?? "",
        logo_url: form.logo_url ?? null,
        panel_logo_url: form.panel_logo_url ?? null,
        bot_logo_url: form.bot_logo_url ?? null,
        favicon_url: form.favicon_url ?? null,
      } });
      toast.success("Branding saved");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["public-branding"] });
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  };

  if (!form) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">Branding</h1>
        <p className="text-sm text-muted-foreground">Customize logos and copy across the website, admin panel and bot.</p>
      </div>

      <Card className="card-premium grid gap-4 p-5 md:grid-cols-2">
        <div><Label>Website name</Label>
          <Input value={form.site_name ?? ""} onChange={(e) => setForm({ ...form, site_name: e.target.value })} /></div>
        <div><Label>Panel title</Label>
          <Input value={form.panel_title ?? ""} onChange={(e) => setForm({ ...form, panel_title: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Footer text</Label>
          <Input value={form.footer_text ?? ""} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} /></div>

        <ImgUpload label="Website logo" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} />
        <ImgUpload label="Admin panel logo" value={form.panel_logo_url} onChange={(v) => setForm({ ...form, panel_logo_url: v })} />
        <ImgUpload label="Bot logo" value={form.bot_logo_url} onChange={(v) => setForm({ ...form, bot_logo_url: v })} />
        <ImgUpload label="Favicon" value={form.favicon_url} onChange={(v) => setForm({ ...form, favicon_url: v })} />

        <div className="md:col-span-2"><Button onClick={save}>Save branding</Button></div>
      </Card>
    </div>
  );
}
