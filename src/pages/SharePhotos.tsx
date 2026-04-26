import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SubmitPhoto from "@/components/SubmitPhoto";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/analytics";

const SharePhotos = () => {
  useEffect(() => {
    trackEvent("page_visit", "/share-photos", "Share Photos");
    document.title = "Share Your Photos – Sharon July 4th";
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-secondary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-body text-primary-foreground/80 hover:text-primary-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
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
