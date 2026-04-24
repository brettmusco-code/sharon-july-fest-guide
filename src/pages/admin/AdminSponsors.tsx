import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
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
import { Pencil, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

const sponsorSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  url: z.string().trim().url("Must be a valid URL").max(500),
  logo_url: z.string().trim().url("Logo must be a valid URL").max(500),
});

interface Sponsor {
  id: string;
  name: string;
  url: string;
  logo_url: string;
  sort_order: number;
}

const blank = { name: "", url: "", logo_url: "" };

const AdminSponsors = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [form, setForm] = useState(blank);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ["sponsors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsors")
        .select("id, name, url, logo_url, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Sponsor[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sponsors"] });
  };

  const openNew = () => {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  };

  const openEdit = (s: Sponsor) => {
    setEditing(s);
    setForm({ name: s.name, url: s.url, logo_url: s.logo_url });
    setOpen(true);
  };

  const handleSave = async () => {
    const parsed = sponsorSchema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Invalid sponsor",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    if (editing) {
      const { error } = await supabase
        .from("sponsors")
        .update(parsed.data)
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Sponsor updated" });
    } else {
      const nextOrder = sponsors.length > 0 ? Math.max(...sponsors.map((s) => s.sort_order)) + 10 : 10;
      const { error } = await supabase.from("sponsors").insert({
        name: parsed.data.name,
        url: parsed.data.url,
        logo_url: parsed.data.logo_url,
        sort_order: nextOrder,
      });
      if (error) {
        toast({ title: "Create failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Sponsor added" });
    }
    setOpen(false);
    refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("sponsors").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sponsor deleted" });
    refresh();
  };

  const move = async (s: Sponsor, direction: -1 | 1) => {
    const idx = sponsors.findIndex((x) => x.id === s.id);
    const swapWith = sponsors[idx + direction];
    if (!swapWith) return;
    const { error } = await supabase.from("sponsors").upsert([
      { id: s.id, name: s.name, url: s.url, logo_url: s.logo_url, sort_order: swapWith.sort_order },
      { id: swapWith.id, name: swapWith.name, url: swapWith.url, logo_url: swapWith.logo_url, sort_order: s.sort_order },
    ]);
    if (error) {
      toast({ title: "Reorder failed", description: error.message, variant: "destructive" });
      return;
    }
    refresh();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-heading text-3xl mb-1">Sponsors</h2>
            <p className="text-muted-foreground text-sm">
              Manage the sponsor tiles shown on the home page.
            </p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Add Sponsor</Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : sponsors.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No sponsors yet. Click "Add Sponsor" to create the first one.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sponsors.map((s, idx) => (
              <Card key={s.id}>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === 0}
                      onClick={() => move(s, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === sponsors.length - 1}
                      onClick={() => move(s, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="w-16 h-16 shrink-0 bg-muted rounded flex items-center justify-center overflow-hidden">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">no logo</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold truncate">{s.name}</h4>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary truncate block"
                    >
                      {s.url}
                    </a>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label="Edit">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(s.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Sponsor" : "New Sponsor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sp-name">Name *</Label>
              <Input
                id="sp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Corp"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="sp-url">Website URL *</Label>
              <Input
                id="sp-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com"
                maxLength={500}
              />
            </div>
            <div>
              <Label htmlFor="sp-logo">Logo URL *</Label>
              <Input
                id="sp-logo"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                maxLength={500}
              />
              {form.logo_url && (
                <div className="mt-2 w-24 h-24 bg-muted rounded flex items-center justify-center overflow-hidden">
                  <img src={form.logo_url} alt="preview" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.url.trim() || !form.logo_url.trim()}>
              {editing ? "Save changes" : "Create Sponsor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sponsor?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminSponsors;
