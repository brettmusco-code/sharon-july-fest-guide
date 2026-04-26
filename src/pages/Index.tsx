import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import { trackEvent } from "@/lib/analytics";
import ScheduleSection from "@/components/ScheduleSection";
import FestivalMap from "@/components/FestivalMap";
import FaqSection from "@/components/FaqSection";
import Sponsors from "@/components/Sponsors";
import DonateSection from "@/components/DonateSection";

import Footer from "@/components/Footer";
import MessagesBell from "@/components/MessagesBell";
import type { FestivalEvent } from "@/hooks/useFestivalData";

const Index = () => {
  const [selectedEvent, setSelectedEvent] = useState<FestivalEvent | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    trackEvent("page_visit", "/", "Home");
  }, []);

  const handleEventClick = (event: FestivalEvent) => {
    setSelectedEvent(event);
    trackEvent("event_click", event.id, event.title);
    document.getElementById("map")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <div
        className="fixed right-4 z-50"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <MessagesBell />
      </div>
      <HeroSection />
      <FestivalMap
        selectedEvent={selectedEvent}
        onClearSelected={() => setSelectedEvent(null)}
        filter={categoryFilter}
        onFilterChange={setCategoryFilter}
      />
      <ScheduleSection
        onEventClick={handleEventClick}
        filter={categoryFilter}
        onFilterChange={setCategoryFilter}
      />
      <FaqSection />
      <section className="bg-background px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/share-photos"
            onClick={() => trackEvent("share_photos_click", "home_cta", "Share photos (home CTA)")}
            className="group block rounded-xl border-2 border-dashed border-primary/40 bg-card p-6 text-center hover:border-primary hover:bg-muted/50 transition-colors"
          >
            <Camera className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-heading text-xl mb-1">Share your festival photos</h3>
            <p className="font-body text-sm text-muted-foreground mb-3">
              Send us your favorite shots from the celebration — we'd love to see them!
            </p>
            <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg font-body font-semibold text-sm group-hover:opacity-90">
              <Camera className="w-4 h-4" />
              Submit a Photo
            </span>
          </Link>
        </div>
      </section>
      <DonateSection />
      <Sponsors />
      <Footer />
      
    </div>
  );
};

export default Index;
