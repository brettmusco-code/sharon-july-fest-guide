import { Heart } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const DonateSection = () => {
  return (
    <section className="py-10 px-4 bg-secondary text-secondary-foreground">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-firework-gold/20 mb-3">
          <Heart className="w-6 h-6 text-firework-gold" fill="currentColor" />
        </div>
        <h2 className="font-heading text-3xl md:text-4xl mb-3">
          Fully Funded by Donations
        </h2>
        <p className="font-body text-secondary-foreground/80 mb-5 leading-relaxed">
          Each year, the Sharon Independence Day Celebration is funded entirely by your
          donations. We receive no financial support from the Town of Sharon. Every
          dollar helps keep this beloved tradition alive.
        </p>
        <a
          href="https://www.paypal.com/donate/?hosted_button_id=Q76L3XCL2NAQY"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("sponsor_click", "donate", "Donate button")}
          className="inline-flex items-center gap-2 bg-firework-gold text-accent-foreground px-8 py-4 rounded-lg font-body font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
        >
          <Heart className="w-5 h-5" fill="currentColor" />
          Donate Now
        </a>
        <p className="font-body text-secondary-foreground/60 text-xs mt-4">
          Secure donations via PayPal
        </p>
      </div>
    </section>
  );
};

export default DonateSection;
