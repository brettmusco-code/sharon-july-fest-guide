import { useEffect } from "react";
import SubmitPhoto from "@/components/SubmitPhoto";
import Footer from "@/components/Footer";
import AppMenu from "@/components/AppMenu";
import { trackEvent } from "@/lib/analytics";

const SharePhotos = () => {
  useEffect(() => {
    trackEvent("page_visit", "/share-photos", "Share Photos");
    document.title = "Share Your Photos – Sharon July 4th";
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="fixed left-4 z-50"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <AppMenu />
      </div>

      <header className="bg-secondary text-primary-foreground pt-20">
        <div className="max-w-4xl mx-auto px-4 pb-6">
          <h1 className="font-heading text-3xl md:text-4xl mb-1">📸 Share Your Photos</h1>
          <p className="font-body text-primary-foreground/80 text-sm md:text-base">
            Send us your favorite shots from the celebration — we'd love to feature them!
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 pb-10">
        <div className="max-w-4xl mx-auto">
          <SubmitPhoto />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SharePhotos;
