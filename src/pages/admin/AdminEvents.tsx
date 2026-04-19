import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useEvents, useCategories, FestivalEvent } from "@/hooks/useFestivalData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, Clock, MapPin, Upload, X } from "lucide-react";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  description: z.string().trim().max(1000).default(""),
  time: z.string().trim().max(100).default(""),
  location: z.string().trim().max(200).default(""),
  category_slug: z.string().min(1, "Category required"),
  icon: z.string().trim().max(8).default("📌"),
  pin_x: z.number().min(0).max(100),
  pin_y: z.number().min(0).max(100),
  sort_order: z.number().int(),
  image_url: z.string().url().nullable().or(z.literal("")).transform((v) => v || null),
});

type FormState = z.infer<typeof eventSchema>;

const blank = (sort: number): FormState => ({
  title: "",
  description: "",
  time: "",
  location: "",
  category_slug: "",
  icon: "📌",
  pin_x: 50,
  pin_y: 50,
  sort_order: sort,
  image_url: null,
});

const AdminEvents = () => {
  const { data: events = [], isLoading } = useEvents();
  const { data: categories = [] } = useCategories();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState<FestivalEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<FestivalEvent | null>(null);
  const [form, setForm] = useState<FormState>(blank(0));
  const [uploading, setUploading] = useState(false);

  useEffect(() => { document.title = "Admin · Events"; }, []);

  const openNew = () => {
    setEditing(null);
    setForm(blank((events.at(-1)?.sort_order ?? 0) + 1));
    setOpen(true);
  };
  const openEdit = (ev: FestivalEvent) => {
    setEditing(ev);
    setForm({
      title: ev.title, description: ev.description, time: ev.time, location: ev.location,
      category_slug: ev.category_slug, icon: ev.icon, pin_x: ev.pin_x, pin_y: ev.pin_y,
      sort_order: ev.sort_order, image_url: ev.image_url,
    });
    setOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `events/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("festival").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("festival").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast({ title: "Image uploaded" });
  };

  const save = async () => {
    const parsed = eventSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    const payload = parsed.data;
    const res = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase.from("events").insert({
          title: payload.title,
          description: payload.description,
          time: payload.time,
          location: payload.location,
          category_slug: payload.category_slug,
          icon: payload.icon,
          pin_x: payload.pin_x,
          pin_y: payload.pin_y,
          sort_order: payload.sort_order,
          image_url: payload.image_url,
        });
    if (res.error) {
      toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Event updated" : "Event created" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const remove = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("events").delete().eq("id", confirmDel.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event deleted" });
      qc.invalidateQueries({ queryKey: ["events"] });
    }
    setConfirmDel(null);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-3xl">Events</h2>
          <p className="text-muted-foreground text-sm">Manage the festival schedule.</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />New event</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No events yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const cat = categories.find((c) => c.slug === ev.category_slug);
            return (
              <Card key={ev.id}>
                <CardContent className="p-4 flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">{ev.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-heading text-lg">{ev.title}</h3>
                      {cat && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: cat.color + "20", color: cat.color }}
                        >
                          {cat.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{ev.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{ev.time || "—"}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location || "—"}</span>
                      <span>Pin: {ev.pin_x.toFixed(1)}%, {ev.pin_y.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(ev)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDel(ev)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Time</Label>
                <Input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="9:00 AM" />
              </div>
              <div className="space-y-2">
                <Label>Icon (emoji)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={4} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category_slug} onValueChange={(v) => setForm({ ...form, category_slug: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>{c.icon} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Pin X (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={form.pin_x}
                  onChange={(e) => setForm({ ...form, pin_x: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Pin Y (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={form.pin_y}
                  onChange={(e) => setForm({ ...form, pin_y: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Sort</Label>
                <Input type="number" value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: drag pins visually on the <strong>Map</strong> tab.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save changes" : "Create event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDel?.title}" will be permanently removed.
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

export default AdminEvents;
