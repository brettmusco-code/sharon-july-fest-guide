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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Send } from "lucide-react";

const messageSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200, "Title too long"),
  body: z.string().trim().max(2000, "Message too long").default(""),
});

interface Message {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

const AdminMessages = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Message[];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = messageSchema.safeParse({ title, body });
    if (!parsed.success) {
      toast({
        title: "Invalid message",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("messages").insert({
      title: parsed.data.title,
      body: parsed.data.body ?? "",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
      return;
    }
    setTitle("");
    setBody("");
    toast({ title: "Message posted", description: "Visitors will see it in the bell icon." });
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl mb-1">Messages</h2>
          <p className="text-muted-foreground text-sm">
            Post announcements that appear in the notification bell on the homepage.
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fireworks delayed by 30 minutes"
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <Label htmlFor="msg-body">Message</Label>
                <Textarea
                  id="msg-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Optional details..."
                  maxLength={2000}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {body.length}/2000 characters
                </p>
              </div>
              <Button type="submit" disabled={submitting || !title.trim()}>
                <Send className="w-4 h-4 mr-1" />
                {submitting ? "Posting…" : "Post message"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h3 className="font-heading text-xl mb-3">Posted messages</h3>
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
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                      </div>
                      {m.body && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {m.body}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(m.id)}
                      aria-label="Delete message"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
    </AdminLayout>
  );
};

export default AdminMessages;
