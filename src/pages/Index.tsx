import { useEffect, useState } from "react";
import HeroSection from "@/components/HeroSection";
import { trackEvent } from "@/lib/analytics";
import ScheduleSection from "@/components/ScheduleSection";
import FestivalMap from "@/components/FestivalMap";
import FaqSection from "@/components/FaqSection";
import Sponsors from "@/components/Sponsors";
import DonateSection from "@/components/DonateSection";
import InstallBanner from "@/components/InstallBanner";
import Footer from "@/components/Footer";
import MessagesBell from "@/components/MessagesBell";
import type { FestivalEvent } from "@/hooks/useFestivalData";

const Index = () => {
  const [selectedEvent, setSelectedEvent] = useState<FestivalEvent | null>(null);

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
      <div className="fixed top-4 right-4 z-50">
        <MessagesBell />
      </div>
      <HeroSection />
      <ScheduleSection onEventClick={handleEventClick} />
      <FestivalMap selectedEvent={selectedEvent} onClearSelected={() => setSelectedEvent(null)} />
      <FaqSection />
      <DonateSection />
      <Sponsors />
      <Footer />
      <InstallBanner />
    </div>
  );
};

export default Index;
