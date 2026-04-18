import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, Category } from "@/hooks/useFestivalData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";

const schema = z.object({
  slug: z.string().trim().min(1).max(50).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes"),
  name: z.string().trim().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use hex like #f59e0b"),
  icon: z.string().trim().min(1).max(8),
  sort_order: z.number().int(),
});

type FormState = z.infer<typeof schema>;

const blank = (sort: number): FormState => ({ slug: "", name: "", color: "#6366f1", icon: "📌", sort_order: sort });

const AdminCategories = () => {
  const { data: categories = [], isLoading } = useCategories();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDel, setConfirmDel] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(blank(0));

  useEffect(() => { document.title = "Admin · Categories"; }, []);

  const openNew = () => {
    setEditing(null);
    setForm(blank((categories.at(-1)?.sort_order ?? 0) + 1));
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ slug: c.slug, name: c.name, color: c.color, icon: c.icon, sort_order: c.sort_order });
    setOpen(true);
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    const data = parsed.data;
    const res = editing
      ? await supabase.from("categories").update(data).eq("id", editing.id)
      : await supabase.from("categories").insert({
          slug: data.slug, name: data.name, color: data.color, icon: data.icon, sort_order: data.sort_order,
        });
    if (res.error) {
      toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Category updated" : "Category created" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const remove = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("categories").delete().eq("id", confirmDel.id);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message.includes("foreign key")
          ? "Category is in use by one or more events. Reassign them first."
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Category deleted" });
      qc.invalidateQueries({ queryKey: ["categories"] });
    }
    setConfirmDel(null);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-3xl">Categories</h2>
          <p className="text-muted-foreground text-sm">Manage event categories, colors and icons.</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />New category</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {categories.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-card shadow"
                  style={{ background: c.color }}
                >
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-lg">{c.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{c.slug} · {c.color}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDel(c)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Slug (lowercase, no spaces)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editing} />
              {editing && <p className="text-xs text-muted-foreground">Slug cannot be changed once events reference it.</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={4} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 p-1" />
              </div>
              <div className="space-y-2">
                <Label>Sort</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDel?.name}" will be removed. Events using it must be reassigned first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminCategories;
