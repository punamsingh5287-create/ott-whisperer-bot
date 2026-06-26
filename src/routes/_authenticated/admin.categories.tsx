import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCategories, upsertCategory, deleteCategory } from "@/lib/admin/store.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({ component: CategoriesPage });

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const empty = { name: "", slug: "", icon_emoji: "📦", sort_order: 0, is_active: true };

function CategoriesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCategories);
  const upsertFn = useServerFn(upsertCategory);
  const delFn = useServerFn(deleteCategory);
  const { data = [] } = useQuery({ queryKey: ["admin-cats"], queryFn: () => listFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const save = async () => {
    try {
      await upsertFn({ data: {
        ...form,
        slug: form.slug || slugify(form.name),
        sort_order: Number(form.sort_order || 0),
      } });
      toast.success("Saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-cats"] });
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Categories</h1>
          <p className="text-sm text-muted-foreground">Organise products into browsable sections.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(empty)}><Plus className="mr-1 h-4 w-4" />New category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} category</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></div>
              <div><Label>Emoji</Label><Input value={form.icon_emoji} onChange={(e) => setForm({ ...form, icon_emoji: e.target.value })} /></div>
              <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /><Label>Active</Label></div>
            </div>
            <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-premium overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Order</TableHead><TableHead>Active</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
          <TableBody>
            {(data as any[]).map((c) => (
              <TableRow key={c.id}>
                <TableCell><span className="mr-2">{c.icon_emoji}</span>{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                <TableCell>{c.sort_order}</TableCell>
                <TableCell>{c.is_active ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setForm(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (!confirm("Delete?")) return;
                    await delFn({ data: { id: c.id } }); toast.success("Deleted");
                    qc.invalidateQueries({ queryKey: ["admin-cats"] });
                  }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
