import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

interface Sponsor {
  id: string;
  name: string;
  url: string;
  logo_url: string;
}

const Sponsors = () => {
  const { data: sponsors = [] } = useQuery({
    queryKey: ["sponsors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsors")
        .select("id, name, url, logo_url")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Sponsor[];
    },
  });

  if (sponsors.length === 0) return null;

  return (
    <section id="sponsors" className="py-10 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-2">
            Our Corporate Sponsors
          </h2>
          <p className="font-body text-muted-foreground">
            Thanks to these wonderful businesses for supporting our celebration!
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {sponsors.map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("sponsor_click", sponsor.url, sponsor.name)}
              className="group bg-card rounded-lg border-2 border-border p-6 flex items-center justify-center hover:border-primary hover:shadow-lg transition-all duration-200 aspect-square"
              aria-label={`Visit ${sponsor.name}`}
            >
              <img
                src={sponsor.logo_url}
                alt={`${sponsor.name} logo`}
                loading="lazy"
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Sponsors;
