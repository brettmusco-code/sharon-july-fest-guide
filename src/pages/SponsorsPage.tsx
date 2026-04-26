import { useEffect } from "react";
import Sponsors from "@/components/Sponsors";
import Footer from "@/components/Footer";
import AppMenu from "@/components/AppMenu";
import { trackEvent } from "@/lib/analytics";

const SponsorsPage = () => {
  useEffect(() => {
    trackEvent("page_visit", "/sponsors", "Corporate Sponsors");
    document.title = "Corporate Sponsors – Sharon July 4th";
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="fixed left-4 z-50"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <AppMenu />
      </div>

      <header className="bg-primary text-primary-foreground py-12 px-4 pt-20">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-heading text-4xl md:text-5xl mb-2">Our Corporate Sponsors</h1>
          <p className="text-primary-foreground/80 font-body">
            Thanks to these wonderful businesses for supporting our celebration!
          </p>
        </div>
      </header>

      <main className="flex-1 py-8">
        <Sponsors />
      </main>

      <Footer />
    </div>
  );
};

export default SponsorsPage;
