import { useState } from "react";
import { useEvents, useCategories, FestivalEvent } from "@/hooks/useFestivalData";
import { Clock, MapPin } from "lucide-react";

interface ScheduleSectionProps {
  onEventClick?: (event: FestivalEvent) => void;
  filter?: string;
  onFilterChange?: (filter: string) => void;
}

const ScheduleSection = ({ onEventClick, filter: filterProp, onFilterChange }: ScheduleSectionProps) => {
  const [internalFilter, setInternalFilter] = useState<string>("all");
  const filter = filterProp ?? internalFilter;
  const setFilter = (f: string) => {
    if (onFilterChange) onFilterChange(f);
    else setInternalFilter(f);
  };
  const { data: events = [], isLoading } = useEvents();
  const { data: categories = [] } = useCategories();

  const colorFor = (slug: string) => categories.find((c) => c.slug === slug)?.color ?? "#6366f1";
  const nameFor = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.category_slug === filter);

  return (
    <section id="schedule" className="py-14 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-2">
            Schedule of Events
          </h2>
          <p className="font-body text-muted-foreground">A full day of fun for the whole family!</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
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
          {categories.map((cat) => {
            const active = filter === cat.slug;
            return (
              <button
                key={cat.slug}
                onClick={() => setFilter(cat.slug)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-body font-medium border-2 transition-all"
                style={{
                  borderColor: cat.color,
                  background: active ? cat.color : "transparent",
                  color: active ? "#fff" : cat.color,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: active ? "#fff" : cat.color }}
                />
                {cat.name}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {isLoading && (
            <p className="text-center font-body text-muted-foreground py-8">Loading events…</p>
          )}
          {!isLoading && filteredEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="w-full text-left group bg-card rounded-lg border-2 p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
              style={{ borderLeftColor: colorFor(event.category_slug), borderLeftWidth: "4px" }}
            >
              <div className="flex items-start gap-3">
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    loading="lazy"
                    className="w-14 h-14 rounded-md object-cover flex-shrink-0 border"
                  />
                ) : (
                  <span className="text-3xl flex-shrink-0 w-14 text-center mt-0.5">{event.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                    <h3 className="font-heading text-lg text-foreground group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <span
                      className="text-[10px] font-body font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: colorFor(event.category_slug) + "20",
                        color: colorFor(event.category_slug),
                      }}
                    >
                      {nameFor(event.category_slug)}
                    </span>
                  </div>
                  {event.description && (
                    <p className="font-body text-muted-foreground text-sm mb-1.5 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-body text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {event.all_day ? "All day" : event.time}
                    </span>
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
          {!isLoading && filteredEvents.length === 0 && (
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
