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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

const faqSchema = z.object({
  question: z.string().trim().min(1, "Question required").max(300),
  answer: z.string().trim().max(3000).default(""),
});

interface Faq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

const blank = { question: "", answer: "" };

const AdminFaqs = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [form, setForm] = useState(blank);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id, question, answer, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Faq[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-faqs"] });
    qc.invalidateQueries({ queryKey: ["faqs"] });
  };

  const openNew = () => {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  };

  const openEdit = (faq: Faq) => {
    setEditing(faq);
    setForm({ question: faq.question, answer: faq.answer });
    setOpen(true);
  };

  const handleSave = async () => {
    const parsed = faqSchema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Invalid FAQ",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    if (editing) {
      const { error } = await supabase
        .from("faqs")
        .update({ question: parsed.data.question, answer: parsed.data.answer ?? "" })
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "FAQ updated" });
    } else {
      const nextOrder = faqs.length > 0 ? Math.max(...faqs.map((f) => f.sort_order)) + 1 : 0;
      const { error } = await supabase.from("faqs").insert({
        question: parsed.data.question,
        answer: parsed.data.answer ?? "",
        sort_order: nextOrder,
      });
      if (error) {
        toast({ title: "Create failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "FAQ added" });
    }
    setOpen(false);
    refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("faqs").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "FAQ deleted" });
    refresh();
  };

  const move = async (faq: Faq, direction: -1 | 1) => {
    const idx = faqs.findIndex((f) => f.id === faq.id);
    const swapWith = faqs[idx + direction];
    if (!swapWith) return;
    const { error } = await supabase.from("faqs").upsert([
      { id: faq.id, question: faq.question, answer: faq.answer, sort_order: swapWith.sort_order },
      { id: swapWith.id, question: swapWith.question, answer: swapWith.answer, sort_order: faq.sort_order },
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
            <h2 className="font-heading text-3xl mb-1">FAQs</h2>
            <p className="text-muted-foreground text-sm">
              Manage the questions visitors see on the Info page.
            </p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Add FAQ</Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : faqs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No FAQs yet. Click "Add FAQ" to create your first one.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <Card key={faq.id}>
                <CardContent className="py-4 flex items-start gap-3">
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === 0}
                      onClick={() => move(faq, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === faqs.length - 1}
                      onClick={() => move(faq, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold">{faq.question}</h4>
                    {faq.answer && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(faq)} aria-label="Edit">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(faq.id)}
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
            <DialogTitle>{editing ? "Edit FAQ" : "New FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="faq-q">Question *</Label>
              <Input
                id="faq-q"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="Where can I park?"
                maxLength={300}
              />
            </div>
            <div>
              <Label htmlFor="faq-a">Answer</Label>
              <Textarea
                id="faq-a"
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder="Free parking is available at..."
                maxLength={3000}
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.answer.length}/3000 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.question.trim()}>
              {editing ? "Save changes" : "Create FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this FAQ?</AlertDialogTitle>
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

export default AdminFaqs;
