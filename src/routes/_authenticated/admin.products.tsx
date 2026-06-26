import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listProducts, upsertProduct, deleteProduct, listCategories,
} from "@/lib/admin/store.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsPage,
});

type Product = any;

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const emptyForm: Product = {
  name: "", slug: "", description: "", category_id: null,
  price: 0, duration_days: 30, stock: 0, status: "active",
  image_url: null, tags: [], premium_emoji_id: "", fallback_emoji: "✨", sort_order: 0,
};

function ProductsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listProducts);
  const catsFn = useServerFn(listCategories);
  const upsertFn = useServerFn(upsertProduct);
  const delFn = useServerFn(deleteProduct);

  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => listFn() });
  const { data: categories = [] } = useQuery({ queryKey: ["admin-cats"], queryFn: () => catsFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Product>(emptyForm);
  const [tagsRaw, setTagsRaw] = useState("");
  const [uploading, setUploading] = useState(false);

  const openNew = () => { setForm(emptyForm); setTagsRaw(""); setOpen(true); };
  const openEdit = (p: Product) => {
    setForm({ ...p, premium_emoji_id: p.premium_emoji_id ?? "", description: p.description ?? "", tags: p.tags ?? [] });
    setTagsRaw((p.tags ?? []).join(", "));
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
        price: Number(form.price),
        duration_days: Number(form.duration_days),
        stock: Number(form.stock),
        sort_order: Number(form.sort_order || 0),
        tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
        premium_emoji_id: form.premium_emoji_id || null,
        image_url: form.image_url || null,
      };
      await upsertFn({ data: payload });
      toast.success("Product saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await delFn({ data: { id } });
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage.from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (sErr) throw sErr;
      setForm((f: Product) => ({ ...f, image_url: data.signedUrl }));
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Products</h1>
          <p className="text-sm text-muted-foreground">Add OTT, AI, gaming and utility apps your bot will sell.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />New product</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} product</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.icon_emoji} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Price ($)</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input type="number" min={0} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
              </div>
              <div>
                <Label>Stock</Label>
                <Input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              </div>
              <div>
                <Label>Premium emoji ID</Label>
                <Input placeholder="e.g. 5879770924629905517" value={form.premium_emoji_id ?? ""} onChange={(e) => setForm({ ...form, premium_emoji_id: e.target.value })} />
              </div>
              <div>
                <Label>Fallback emoji</Label>
                <Input value={form.fallback_emoji ?? ""} onChange={(e) => setForm({ ...form, fallback_emoji: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Tags (comma separated)</Label>
                <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="4k, shared, 30d" />
              </div>
              <div className="sm:col-span-2">
                <Label>Image</Label>
                <div className="flex items-center gap-3">
                  {form.image_url && <img src={form.image_url} alt="" className="h-14 w-14 rounded-md object-cover" />}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/30">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading…" : "Upload image"}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch checked={form.status === "active"} onCheckedChange={(c) => setForm({ ...form, status: c ? "active" : "disabled" })} />
                <Label>Active</Label>
              </div>
              <div className="rounded-md border bg-muted/40 p-3 sm:col-span-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Preview in bot</div>
                <div className="mt-1 text-sm">
                  {form.fallback_emoji || "✨"}  <b>{form.name || "Product name"}</b> — ${form.price || 0}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-premium overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No products yet.</TableCell></TableRow>
            )}
            {products.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {p.image_url ? <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" /> :
                      <div className="grid h-8 w-8 place-items-center rounded bg-muted text-base">{p.fallback_emoji || "✨"}</div>}
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.slug}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{p.categories ? `${p.categories.icon_emoji} ${p.categories.name}` : "—"}</TableCell>
                <TableCell>${p.price}</TableCell>
                <TableCell>{p.stock}</TableCell>
                <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
