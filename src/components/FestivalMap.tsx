import { useState } from "react";
import { events, categoryColors, type EventItem } from "@/data/events";
import festivalMapImg from "@/assets/festival-map.jpg";

interface FestivalMapProps {
  selectedEvent: EventItem | null;
}

// Map event IDs to percentage positions on the illustrated map
const pinPositions: Record<string, { x: number; y: number }> = {
  "1": { x: 52, y: 70 },   // Opening Ceremony - beach flag area
  "2": { x: 20, y: 22 },   // Parade - Pond St / downtown upper-left
  "3": { x: 80, y: 50 },   // Kids Zone - playground near school
  "4": { x: 32, y: 50 },   // BBQ & Food Trucks - food truck area left of pavilion
  "5": { x: 58, y: 48 },   // Live Music - main stage center field
  "6": { x: 50, y: 92 },   // Fireworks - over Lake Massapoag
};

const FestivalMap = ({ selectedEvent }: FestivalMapProps) => {
  const [activePin, setActivePin] = useState<string | null>(null);

  const displayedPin = selectedEvent?.id ?? activePin;

  return (
    <section id="map" className="bg-muted px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="font-heading mb-3 text-4xl text-foreground md:text-5xl">Festival Map</h2>
          <p className="font-body text-lg text-muted-foreground">
            Tap a pin to see event details • Click events in the schedule to highlight them
          </p>
        </div>

        <div className="relative mx-auto overflow-hidden rounded-xl border-4 border-card shadow-xl">
          <img
            src={festivalMapImg}
            alt="Illustrated festival map of Sharon July 4th Celebration at Memorial Park Beach"
            className="block w-full h-auto"
            width={1920}
            height={1080}
            draggable={false}
          />

          {/* Interactive pins */}
          {events.map((event) => {
            const pos = pinPositions[event.id];
            if (!pos) return null;
            const isActive = displayedPin === event.id;

            return (
              <button
                key={event.id}
                onClick={() => setActivePin(isActive ? null : event.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group z-10"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                aria-label={`${event.title} - ${event.location}`}
              >
                {/* Pin body */}
                <div
                  className={`flex items-center justify-center rounded-full border-[3px] border-white shadow-lg transition-all duration-300 ${
                    isActive ? "w-14 h-14 scale-110" : "w-11 h-11 hover:scale-110"
                  }`}
                  style={{ background: categoryColors[event.category] }}
                >
                  <span className={`leading-none ${isActive ? "text-2xl" : "text-xl"}`}>
                    {event.icon}
                  </span>
                </div>

                {/* Pulse ring when active */}
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-30"
                    style={{ background: categoryColors[event.category] }}
                  />
                )}

                {/* Tooltip / popup */}
                {isActive && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 sm:w-64 bg-card rounded-xl border-2 shadow-xl p-3 text-left z-20 animate-fade-in"
                    style={{ borderColor: categoryColors[event.category] }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl leading-none">{event.icon}</span>
                      <h3 className="font-heading text-base text-foreground leading-tight">
                        {event.title}
                      </h3>
                    </div>
                    <p className="font-body text-xs text-muted-foreground mb-2 leading-relaxed">
                      {event.description}
                    </p>
                    <div
                      className="font-body text-[11px] font-bold"
                      style={{ color: categoryColors[event.category] }}
                    >
                      🕐 {event.time} &nbsp;•&nbsp; 📍 {event.location}
                    </div>
                    {/* Arrow */}
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 -mt-1.5 border-r-2 border-b-2 bg-card"
                      style={{ borderColor: categoryColors[event.category] }}
                    />
                  </div>
                )}
              </button>
            );
          })}

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm rounded-lg p-2.5 shadow-md border">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {(Object.keys(categoryColors) as EventItem["category"][]).map((cat) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: categoryColors[cat] }}
                  />
                  <span className="font-body text-[10px] text-foreground capitalize">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FestivalMap;
