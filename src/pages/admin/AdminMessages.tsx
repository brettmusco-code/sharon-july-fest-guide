import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Send, Pencil, Clock } from "lucide-react";
import { PushAttemptsCard } from "@/components/admin/PushAttemptsCard";

const messageSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200, "Title too long"),
  body: z.string().trim().max(2000, "Message too long").default(""),
  scheduled_for: z.string().nullable(),
});

interface Message {
  id: string;
  title: string;
  body: string;
  created_at: string;
  scheduled_for: string | null;
}

const blank = { title: "", body: "", scheduled_for: "" };

const AdminMessages = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [editForm, setEditForm] = useState(blank);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, title, body, created_at, scheduled_for")
        .order("scheduled_for", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Message[];
    },
  });

  const buildPayload = (f: typeof blank) => {
    const parsed = messageSchema.safeParse({
      title: f.title,
      body: f.body,
      scheduled_for: f.scheduled_for ? f.scheduled_for : null,
    });
    if (!parsed.success) {
      toast({
        title: "Invalid message",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return null;
    }
    return {
      title: parsed.data.title,
      body: parsed.data.body ?? "",
      scheduled_for: parsed.data.scheduled_for
        ? new Date(parsed.data.scheduled_for).toISOString()
        : null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload(form);
    if (!payload) return;
    setSubmitting(true);
    const { error } = await supabase.from("messages").insert(payload);
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
      return;
    }
    setForm(blank);
    toast({
      title: payload.scheduled_for ? "Message scheduled" : "Message posted",
      description: payload.scheduled_for
        ? `Will publish at ${new Date(payload.scheduled_for).toLocaleString()}`
        : "Visitors will see it in the bell icon.",
    });
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
    qc.invalidateQueries({ queryKey: ["messages"] });
  };

  const openEdit = (m: Message) => {
    setEditing(m);
    setEditForm({
      title: m.title,
      body: m.body,
      scheduled_for: m.scheduled_for
        ? new Date(m.scheduled_for).toISOString().slice(0, 16)
        : "",
    });
  };

  const handleEditSave = async () => {
    if (!editing) return;
    const payload = buildPayload(editForm);
    if (!payload) return;
    const { error } = await supabase
      .from("messages")
      .update(payload)
      .eq("id", editing.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setEditing(null);
    toast({ title: "Message updated" });
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
    qc.invalidateQueries({ queryKey: ["messages"] });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("messages").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Message deleted" });
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
    qc.invalidateQueries({ queryKey: ["messages"] });
  };

  const isScheduled = (m: Message) =>
    m.scheduled_for && new Date(m.scheduled_for).getTime() > Date.now();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl mb-1">Messages</h2>
          <p className="text-muted-foreground text-sm">
            Post announcements that appear in the notification bell. Schedule for later or post now.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="msg-title">Title *</Label>
                <Input
                  id="msg-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Fireworks delayed by 30 minutes"
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <Label htmlFor="msg-body">Message</Label>
                <Textarea
                  id="msg-body"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Optional details..."
                  maxLength={2000}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.body.length}/2000 characters
                </p>
              </div>
              <div>
                <Label htmlFor="msg-schedule">Schedule for later (optional)</Label>
                <Input
                  id="msg-schedule"
                  type="datetime-local"
                  value={form.scheduled_for}
                  onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to publish immediately.
                </p>
              </div>
              <Button type="submit" disabled={submitting || !form.title.trim()}>
                <Send className="w-4 h-4 mr-1" />
                {submitting ? "Saving…" : form.scheduled_for ? "Schedule" : "Post now"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <PushAttemptsCard />

        <div>
          <h3 className="font-heading text-xl mb-3">All messages</h3>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : messages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No messages yet. Post one above to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => (
                <Card key={m.id}>
                  <CardContent className="py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h4 className="font-semibold">{m.title}</h4>
                        {isScheduled(m) && (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="w-3 h-3" />
                            Scheduled {new Date(m.scheduled_for!).toLocaleString()}
                          </Badge>
                        )}
                        {!isScheduled(m) && (
                          <span className="text-xs text-muted-foreground">
                            Posted {new Date(m.scheduled_for ?? m.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {m.body && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {m.body}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(m)}
                        aria-label="Edit message"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(m.id)}
                        aria-label="Delete message"
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
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Visitors will no longer see this announcement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor="edit-body">Message</Label>
              <Textarea
                id="edit-body"
                value={editForm.body}
                onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                maxLength={2000}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="edit-schedule">Scheduled for (optional)</Label>
              <Input
                id="edit-schedule"
                type="datetime-local"
                value={editForm.scheduled_for}
                onChange={(e) => setEditForm({ ...editForm, scheduled_for: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={!editForm.title.trim()}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminMessages;
