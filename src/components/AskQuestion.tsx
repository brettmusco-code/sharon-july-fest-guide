import { useState } from "react";
import { z } from "zod";
import { MessageCircleQuestion, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

const schema = z.object({
  question: z
    .string()
    .trim()
    .min(5, "Please enter at least 5 characters")
    .max(1000, "Question must be under 1000 characters"),
});

const AskQuestion = () => {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ question });
    if (!parsed.success) {
      toast({
        title: "Can't send that",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("questions")
      .insert({ question: parsed.data.question });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Couldn't send your question",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    trackEvent("question_submit", null, parsed.data.question.slice(0, 80));
    setQuestion("");
    setSubmitted(true);
    toast({ title: "Thanks! Your question was sent to organizers." });
  };

  return (
    <div className="mt-10 rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircleQuestion className="w-5 h-5 text-primary" />
        <h3 className="font-heading text-xl">Have a different question?</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Send it to the organizers — popular ones may be added to the FAQ.
      </p>
      {submitted ? (
        <div className="text-sm">
          <p className="text-foreground font-medium">Got it — thanks!</p>
          <Button
            variant="link"
            className="px-0 h-auto"
            onClick={() => setSubmitted(false)}
          >
            Ask another question
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to know?"
            maxLength={1000}
            rows={4}
            disabled={submitting}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {question.length}/1000
            </span>
            <Button type="submit" disabled={submitting || question.trim().length < 5}>
              <Send className="w-4 h-4 mr-1" />
              {submitting ? "Sending…" : "Send question"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AskQuestion;
