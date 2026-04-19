import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/analytics";

interface Faq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

const Info = () => {
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id, question, answer, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Faq[];
    },
  });

  useEffect(() => {
    trackEvent("page_visit", "/info", "Info & FAQ");
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Button asChild variant="ghost" size="sm" className="mb-4 text-primary-foreground hover:bg-primary-foreground/10">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" />Back to home</Link>
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="w-8 h-8" />
            <h1 className="font-heading text-4xl md:text-5xl">Info & FAQ</h1>
          </div>
          <p className="text-primary-foreground/80 font-body">
            Everything you need to know about the celebration.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        {isLoading ? (
          <p className="text-muted-foreground text-center py-12">Loading…</p>
        ) : faqs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No info available yet. Check back soon!</p>
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible
            className="space-y-2"
            onValueChange={(value) => {
              if (!value) return;
              const faq = faqs.find((f) => f.id === value);
              if (faq) trackEvent("faq_open", faq.id, faq.question);
            }}
          >
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border rounded-lg px-4 bg-card"
              >
                <AccordionTrigger className="font-heading text-lg text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground whitespace-pre-wrap font-body">
                  {faq.answer || <em>No answer yet.</em>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Info;
