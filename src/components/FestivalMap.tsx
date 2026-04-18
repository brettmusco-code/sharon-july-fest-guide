import { useState } from "react";
import { useEvents, useCategories, useMapSettings, FestivalEvent } from "@/hooks/useFestivalData";
import festivalMapFallback from "@/assets/festival-map.jpg";

interface FestivalMapProps {
  selectedEvent: FestivalEvent | null;
}

const FestivalMap = ({ selectedEvent }: FestivalMapProps) => {
  const [activePin, setActivePin] = useState<string | null>(null);
  const { data: events = [] } = useEvents();
  const { data: categories = [] } = useCategories();
  const { data: settings } = useMapSettings();

  const displayedPin = selectedEvent?.id ?? activePin;
  const colorFor = (slug: string) => categories.find((c) => c.slug === slug)?.color ?? "#6366f1";
  const mapUrl = settings?.map_image_url ?? festivalMapFallback;

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
            src={mapUrl}
            alt="Illustrated festival map of Sharon July 4th Celebration at Memorial Park Beach"
            className="block w-full h-auto"
            draggable={false}
          />

          {events.map((event) => {
            const isActive = displayedPin === event.id;
            const color = colorFor(event.category_slug);

            return (
              <button
                key={event.id}
                onClick={() => setActivePin(isActive ? null : event.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group z-10"
                style={{ left: `${event.pin_x}%`, top: `${event.pin_y}%` }}
                aria-label={`${event.title} - ${event.location}`}
              >
                <div
                  className={`flex items-center justify-center rounded-full border-[3px] border-white shadow-lg transition-all duration-300 ${
                    isActive ? "w-14 h-14 scale-110" : "w-11 h-11 hover:scale-110"
                  }`}
                  style={{ background: color }}
                >
                  <span className={`leading-none ${isActive ? "text-2xl" : "text-xl"}`}>
                    {event.icon}
                  </span>
                </div>

                {isActive && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-30"
                    style={{ background: color }}
                  />
                )}

                {isActive && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 sm:w-64 bg-card rounded-xl border-2 shadow-xl p-3 text-left z-20 animate-fade-in"
                    style={{ borderColor: color }}
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
                      style={{ color }}
                    >
                      🕐 {event.time} &nbsp;•&nbsp; 📍 {event.location}
                    </div>
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 -mt-1.5 border-r-2 border-b-2 bg-card"
                      style={{ borderColor: color }}
                    />
                  </div>
                )}
              </button>
            );
          })}

          <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm rounded-lg p-2.5 shadow-md border">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {categories.map((cat) => (
                <div key={cat.slug} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: cat.color }}
                  />
                  <span className="font-body text-[10px] text-foreground capitalize">{cat.name}</span>
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
