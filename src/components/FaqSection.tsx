import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { HelpCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

interface Faq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

const FaqSection = () => {
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs", "homepage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id, question, answer, sort_order")
        .order("sort_order", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data as Faq[];
    },
  });

  

  return (
    <section id="faq" className="py-16 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
            <HelpCircle className="w-7 h-7" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl text-foreground mb-3">
            Info & FAQ
          </h2>
          <p className="font-body text-muted-foreground text-lg">
            Everything you need to know about the celebration.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading…</p>
        ) : faqs.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-lg border-2 border-dashed bg-card">
            <p className="text-muted-foreground font-body">
              FAQs are coming soon. Check back closer to the celebration!
            </p>
          </div>
        ) : (
          <>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="border rounded-lg px-4 bg-card shadow-sm"
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

            <div className="text-center mt-8">
              <Button asChild variant="outline" size="lg">
                <Link to="/info">
                  See all FAQs
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default FaqSection;
