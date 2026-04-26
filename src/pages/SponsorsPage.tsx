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

      <main className="flex-1 pt-20">
        <Sponsors />
      </main>

      <Footer />
    </div>
  );
};

export default SponsorsPage;
