const sponsors = [
  {
    name: "Dedham Savings",
    url: "https://www.dedhamsavings.com/",
    logo: "https://sharonjuly4.org/uploads/1/1/7/7/117790431/dedham-logo-vertical-color_orig.png",
  },
  {
    name: "Dunkin'",
    url: "https://www.dunkindonuts.com/en",
    logo: "https://sharonjuly4.org/uploads/1/1/7/7/117790431/dunkin-logo-mid_orig.jpeg",
  },
  {
    name: "Koopman Lumber",
    url: "https://koopmanlumber.com/",
    logo: "https://sharonjuly4.org/uploads/1/1/7/7/117790431/koopman2_orig.png",
  },
  {
    name: "The Needle Group",
    url: "https://www.theneedlegroup.com/",
    logo: "https://sharonjuly4.org/uploads/1/1/7/7/117790431/needle-sj4_orig.png",
  },
  {
    name: "Orchard Cove",
    url: "https://www.hebrewseniorlife.org/orchard-cove",
    logo: "https://sharonjuly4.org/uploads/1/1/7/7/117790431/orchardcove_orig.jpeg",
  },
];

const Sponsors = () => {
  return (
    <section id="sponsors" className="py-16 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground mb-3">
            Our Corporate Sponsors
          </h2>
          <p className="font-body text-muted-foreground text-lg">
            Thanks to these wonderful businesses for supporting our celebration!
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {sponsors.map((sponsor) => (
            <a
              key={sponsor.name}
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-card rounded-lg border-2 border-border p-6 flex items-center justify-center hover:border-primary hover:shadow-lg transition-all duration-200 aspect-square"
              aria-label={`Visit ${sponsor.name}`}
            >
              <img
                src={sponsor.logo}
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
