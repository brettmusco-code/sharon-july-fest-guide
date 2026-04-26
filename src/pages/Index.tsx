import { useEffect, useState } from "react";
import HeroSection from "@/components/HeroSection";
import { trackEvent } from "@/lib/analytics";
import ScheduleSection from "@/components/ScheduleSection";
import FestivalMap from "@/components/FestivalMap";
import FaqSection from "@/components/FaqSection";
import DonateSection from "@/components/DonateSection";

import Footer from "@/components/Footer";
import MessagesBell from "@/components/MessagesBell";
import AppMenu from "@/components/AppMenu";
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
        className="fixed left-4 z-50"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <AppMenu />
      </div>
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
      <DonateSection />
      <Footer />
      
    </div>
  );
};

export default Index;
