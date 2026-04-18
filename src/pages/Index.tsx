import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import ScheduleSection from "@/components/ScheduleSection";
import FestivalMap from "@/components/FestivalMap";
import Footer from "@/components/Footer";
import type { FestivalEvent } from "@/hooks/useFestivalData";

const Index = () => {
  const [selectedEvent, setSelectedEvent] = useState<FestivalEvent | null>(null);

  const handleEventClick = (event: FestivalEvent) => {
    setSelectedEvent(event);
    document.getElementById("map")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <HeroSection />
      <ScheduleSection onEventClick={handleEventClick} />
      <FestivalMap selectedEvent={selectedEvent} />
      <Footer />
    </div>
  );
};

export default Index;
