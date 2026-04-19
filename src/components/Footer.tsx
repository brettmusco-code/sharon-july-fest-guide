import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";

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
