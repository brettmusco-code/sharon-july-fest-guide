import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import ScheduleSection from "@/components/ScheduleSection";
import FestivalMap from "@/components/FestivalMap";
import Footer from "@/components/Footer";
import type { EventItem } from "@/data/events";

const Index = () => {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const handleEventClick = (event: EventItem) => {
    setSelectedEvent(event);
    // Scroll to map
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
