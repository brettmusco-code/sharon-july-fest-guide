import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, CheckCircle2, Sparkles, Archive } from "lucide-react";

interface Question {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  promoted_faq_id: string | null;
  created_at: string;
}

const statusVariant = (status: string) => {
  switch (status) {
    case "new": return "default";
    case "answered": return "secondary";
    case "promoted": return "secondary";
    case "archived": return "outline";
    default: return "outline";
  }
};

const AdminQuestions = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [promoting, setPromoting] = useState<Question | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["admin-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question, answer, status, promoted_faq_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Question[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-questions"] });
    qc.invalidateQueries({ queryKey: ["faqs"] });
    qc.invalidateQueries({ queryKey: ["admin-faqs"] });
  };

  const setStatus = async (q: Question, status: string) => {
    const { error } = await supabase
      .from("questions")
      .update({ status })
      .eq("id", q.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Marked as ${status}` });
    refresh();
  };

  const openPromote = (q: Question) => {
    setPromoting(q);
    setFaqQuestion(q.question);
    setFaqAnswer(q.answer ?? "");
  };

  const handlePromote = async () => {
    if (!promoting) return;
    if (faqQuestion.trim().length === 0) {
      toast({ title: "Question required", variant: "destructive" });
      return;
    }
    // Find next sort order
    const { data: existing } = await supabase
      .from("faqs")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder = existing && existing[0] ? existing[0].sort_order + 1 : 0;

    const { data: faq, error: faqErr } = await supabase
      .from("faqs")
      .insert({
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        sort_order: nextOrder,
      })
      .select("id")
      .single();
    if (faqErr || !faq) {
      toast({ title: "Promote failed", description: faqErr?.message, variant: "destructive" });
      return;
    }
    const { error: updErr } = await supabase
      .from("questions")
      .update({
        status: "promoted",
        answer: faqAnswer.trim(),
        promoted_faq_id: faq.id,
      })
      .eq("id", promoting.id);
    if (updErr) {
      toast({ title: "Question update failed", description: updErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Promoted to FAQ!" });
    setPromoting(null);
    refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("questions").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Question deleted" });
    refresh();
  };

  const newCount = questions.filter((q) => q.status === "new").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl mb-1">Visitor Questions</h2>
          <p className="text-muted-foreground text-sm">
            Questions submitted by festival-goers.
            {newCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-foreground font-medium">
                <Badge>{newCount} new</Badge>
              </span>
            )}
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : questions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No questions yet. When visitors submit questions, they'll show up here.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {questions.map((q) => (
              <Card key={q.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium whitespace-pre-wrap">{q.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(q.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={statusVariant(q.status) as any}>{q.status}</Badge>
                  </div>
                  {q.answer && (
                    <div className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">
                      <span className="font-semibold">Answer:</span> {q.answer}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="default" onClick={() => openPromote(q)}>
                      <Sparkles className="w-4 h-4 mr-1" />
                      {q.status === "promoted" ? "Promote again" : "Answer & promote to FAQ"}
                    </Button>
                    {q.status !== "answered" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(q, "answered")}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />Mark answered
                      </Button>
                    )}
                    {q.status !== "archived" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(q, "archived")}>
                        <Archive className="w-4 h-4 mr-1" />Archive
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(q.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!promoting} onOpenChange={(o) => !o && setPromoting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to FAQ</DialogTitle>
            <DialogDescription>
              Edit the question and write an answer. It will be added to the public FAQ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="promote-q">Question *</Label>
              <Input
                id="promote-q"
                value={faqQuestion}
                onChange={(e) => setFaqQuestion(e.target.value)}
                maxLength={300}
              />
            </div>
            <div>
              <Label htmlFor="promote-a">Answer</Label>
              <Textarea
                id="promote-a"
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                rows={5}
                maxLength={3000}
                placeholder="Write the public answer…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoting(null)}>Cancel</Button>
            <Button onClick={handlePromote} disabled={!faqQuestion.trim()}>
              Add to FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
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

export default AdminQuestions;
