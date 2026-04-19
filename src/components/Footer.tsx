import { Link } from "react-router-dom";
import { HelpCircle, Facebook, Instagram } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-10 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-3xl mb-3">🎆🇺🇸🎆</p>
        <h3 className="font-heading text-2xl mb-2">
          Sharon Independence Day Celebration
        </h3>
        <p className="font-body text-secondary-foreground/70 text-sm mb-4">
          July 3, 2026 • Memorial Park Beach, Sharon, MA
        </p>

        <div className="flex items-center justify-center gap-3 mb-5">
          <a
            href="https://www.facebook.com/sharonjuly4"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Facebook"
            onClick={() => trackEvent("sponsor_click", "facebook", "Facebook")}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-secondary-foreground/10 hover:bg-firework-gold hover:text-accent-foreground transition-colors"
          >
            <Facebook className="w-5 h-5" />
          </a>
          <a
            href="https://www.instagram.com/sharonjuly4"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Instagram"
            onClick={() => trackEvent("sponsor_click", "instagram", "Instagram")}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-secondary-foreground/10 hover:bg-firework-gold hover:text-accent-foreground transition-colors"
          >
            <Instagram className="w-5 h-5" />
          </a>
        </div>

        <p className="font-body text-secondary-foreground/60 text-xs mb-4">
          Follow <span className="font-semibold">@sharonjuly4</span> and tag your photos
          with <span className="font-semibold">#sharon4thewin</span>
        </p>

        <Link
          to="/info"
          className="inline-flex items-center gap-1.5 text-sm font-body text-secondary-foreground/80 hover:text-secondary-foreground underline-offset-4 hover:underline mb-4"
        >
          <HelpCircle className="w-4 h-4" />
          Info & FAQ
        </Link>
        <p className="font-body text-secondary-foreground/50 text-xs">
          Have a safe and happy Independence Day!
        </p>
      </div>
    </footer>
  );
};

export default Footer;
