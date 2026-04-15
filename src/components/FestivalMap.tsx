import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { events, categoryColors, type EventItem } from "@/data/events";

interface FestivalMapProps {
  selectedEvent: EventItem | null;
}

const CENTER: L.LatLngExpression = [42.1108, -71.1770];
const DEFAULT_ZOOM = 16;

const createFestivalIcon = (emoji: string, color: string) =>
  L.divIcon({
    className: "festival-marker",
    html: `
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        width:44px;
        height:44px;
        background:${color};
        border:3px solid white;
        border-radius:9999px;
        box-shadow:0 6px 18px rgba(0,0,0,0.28);
        font-size:22px;
      ">${emoji}</div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  });

const FestivalMap = ({ selectedEvent }: FestivalMapProps) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({});

  const markerIcons = useMemo(
    () =>
      Object.fromEntries(
        events.map((event) => [event.id, createFestivalIcon(event.icon, categoryColors[event.category])]),
      ),
    [],
  );

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      center: CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    events.forEach((event) => {
      const marker = L.marker([event.lat, event.lng], {
        icon: markerIcons[event.id],
      }).addTo(map);

      marker.bindPopup(
        `
          <div style="padding:4px;font-family:Cabin,sans-serif;max-width:240px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="font-size:24px;line-height:1;">${event.icon}</span>
              <h3 style="margin:0;font-family:'Abril Fatface',serif;font-size:18px;line-height:1.2;color:hsl(var(--foreground));">${event.title}</h3>
            </div>
            <p style="margin:0 0 8px 0;font-size:14px;line-height:1.4;color:hsl(var(--muted-foreground));">${event.description}</p>
            <div style="font-size:12px;font-weight:700;color:${categoryColors[event.category]};">
              🕐 ${event.time} &nbsp;•&nbsp; 📍 ${event.location}
            </div>
          </div>
        `,
        { className: "festival-popup", maxWidth: 280 },
      );

      markerRefs.current[event.id] = marker;
    });

    mapRef.current = map;

    return () => {
      Object.values(markerRefs.current).forEach((marker) => marker.remove());
      markerRefs.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, [markerIcons]);

  useEffect(() => {
    if (!selectedEvent || !mapRef.current) return;

    const marker = markerRefs.current[selectedEvent.id];
    mapRef.current.flyTo([selectedEvent.lat, selectedEvent.lng], 17, { duration: 1 });
    marker?.openPopup();
  }, [selectedEvent]);

  return (
    <section id="map" className="bg-muted px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="font-heading mb-3 text-4xl text-foreground md:text-5xl">Festival Map</h2>
          <p className="font-body text-lg text-muted-foreground">
            Tap a pin to see event details • Click events in the schedule to jump to their location
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border-4 border-card shadow-xl">
          <div ref={mapElementRef} className="h-[500px] w-full" aria-label="Festival event map" />
        </div>
      </div>
    </section>
  );
};

export default FestivalMap;
