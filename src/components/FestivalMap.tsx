import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { events, categoryColors, type EventItem } from "@/data/events";

// Create custom festival-style marker icons
const createFestivalIcon = (emoji: string, color: string) => {
  return L.divIcon({
    className: "festival-marker",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        font-size: 22px;
        cursor: pointer;
        transition: transform 0.2s;
      ">${emoji}</div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
  });
};

interface FlyToEventProps {
  event: EventItem | null;
}

const FlyToEvent = ({ event }: FlyToEventProps) => {
  const map = useMap();
  useEffect(() => {
    if (event) {
      map.flyTo([event.lat, event.lng], 17, { duration: 1 });
    }
  }, [event, map]);
  return null;
};

interface FestivalMapProps {
  selectedEvent: EventItem | null;
}

const FestivalMap = ({ selectedEvent }: FestivalMapProps) => {
  const CENTER: [number, number] = [42.1108, -71.1770];

  return (
    <section id="map" className="py-16 px-4 bg-muted">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground mb-3">
            Festival Map
          </h2>
          <p className="font-body text-muted-foreground text-lg">
            Tap a pin to see event details • Click events in the schedule to fly to their location
          </p>
        </div>

        <div className="rounded-xl overflow-hidden shadow-xl border-4 border-card" style={{ height: "500px" }}>
          <MapContainer
            center={CENTER}
            zoom={16}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            {/* Watercolor-style tile for festival feel */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            <FlyToEvent event={selectedEvent} />

            {events.map((event) => (
              <Marker
                key={event.id}
                position={[event.lat, event.lng]}
                icon={createFestivalIcon(event.icon, categoryColors[event.category])}
              >
                <Popup className="festival-popup" maxWidth={280}>
                  <div className="p-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{event.icon}</span>
                      <h3 className="font-bold text-base" style={{ fontFamily: "Abril Fatface, serif" }}>
                        {event.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "Cabin, sans-serif" }}>
                      {event.description}
                    </p>
                    <div className="text-xs font-semibold" style={{ color: categoryColors[event.category], fontFamily: "Cabin, sans-serif" }}>
                      🕐 {event.time} • 📍 {event.location}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </section>
  );
};

export default FestivalMap;
