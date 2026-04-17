import { useState } from "react";
import { events, categoryColors, categoryLabels, type EventItem } from "@/data/events";
import { Clock, MapPin } from "lucide-react";

interface ScheduleSectionProps {
  onEventClick?: (event: EventItem) => void;
}

type Filter = "all" | EventItem["category"];

const ScheduleSection = ({ onEventClick }: ScheduleSectionProps) => {
  const [filter, setFilter] = useState<Filter>("all");

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.category === filter);

  return (
    <section id="schedule" className="py-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground mb-3">
            Schedule of Events
          </h2>
          <p className="font-body text-muted-foreground text-lg">
            A full day of fun for the whole family!
          </p>
        </div>

        {/* Category filter buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <button
            onClick={() => setFilter("all")}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-body font-medium border-2 transition-all ${
              filter === "all"
                ? "bg-foreground text-background border-foreground"
                : "border-border text-foreground hover:border-foreground"
            }`}
          >
            All Events
          </button>
          {(Object.keys(categoryLabels) as EventItem["category"][]).map((cat) => {
            const active = filter === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-body font-medium border-2 transition-all"
                style={{
                  borderColor: categoryColors[cat],
                  background: active ? categoryColors[cat] : "transparent",
                  color: active ? "#fff" : categoryColors[cat],
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: active ? "#fff" : categoryColors[cat] }}
                />
                {categoryLabels[cat]}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="w-full text-left group bg-card rounded-lg border-2 p-5 hover:shadow-lg transition-all duration-200 cursor-pointer"
              style={{ borderLeftColor: categoryColors[event.category], borderLeftWidth: "4px" }}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0 mt-1">{event.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                    <h3 className="font-heading text-xl text-foreground group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <span
                      className="text-xs font-body font-semibold px-2 py-0.5 rounded-full self-start"
                      style={{
                        background: categoryColors[event.category] + "20",
                        color: categoryColors[event.category],
                      }}
                    >
                      {categoryLabels[event.category]}
                    </span>
                  </div>
                  <p className="font-body text-muted-foreground text-sm mb-2">
                    {event.description}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm font-body text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {event.time}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
          {filteredEvents.length === 0 && (
            <p className="text-center font-body text-muted-foreground py-8">
              No events in this category.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ScheduleSection;
