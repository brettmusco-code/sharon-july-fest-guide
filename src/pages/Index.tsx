import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import ScheduleSection from "@/components/ScheduleSection";
import FestivalMap from "@/components/FestivalMap";
import Sponsors from "@/components/Sponsors";
import InstallBanner from "@/components/InstallBanner";
import Footer from "@/components/Footer";
import MessagesBell from "@/components/MessagesBell";
import type { FestivalEvent } from "@/hooks/useFestivalData";

const Index = () => {
  const [selectedEvent, setSelectedEvent] = useState<FestivalEvent | null>(null);

  const handleEventClick = (event: FestivalEvent) => {
    setSelectedEvent(event);
    document.getElementById("map")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <div className="fixed top-4 right-4 z-50">
        <MessagesBell />
      </div>
      <HeroSection />
      <ScheduleSection onEventClick={handleEventClick} />
      <FestivalMap selectedEvent={selectedEvent} />
      <Sponsors />
      <Footer />
      <InstallBanner />
    </div>
  );
};

export default Index;
