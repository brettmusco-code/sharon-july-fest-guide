import { useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useEvents, useCategories, useMapSettings, FestivalEvent } from "@/hooks/useFestivalData";
import { Button } from "@/components/ui/button";
import festivalMapFallback from "@/assets/festival-map.jpg";

interface FestivalMapProps {
  selectedEvent: FestivalEvent | null;
}

const FestivalMap = ({ selectedEvent }: FestivalMapProps) => {
  const [activePin, setActivePin] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const { data: events = [] } = useEvents();
  const { data: categories = [] } = useCategories();
  const { data: settings } = useMapSettings();
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const displayedPin = selectedEvent?.id ?? activePin;
  const colorFor = (slug: string) => categories.find((c) => c.slug === slug)?.color ?? "#6366f1";
  const mapUrl = settings?.map_image_url ?? festivalMapFallback;

  // Counter-scale so pins stay constant size as the map zooms
  const inv = 1 / scale;

  // When an event is selected from outside, zoom/pan to its pin
  useEffect(() => {
    if (!selectedEvent || !transformRef.current) return;
    const wrapperEl = transformRef.current.instance.wrapperComponent;
    if (!wrapperEl) return;
    const { offsetWidth: w, offsetHeight: h } = wrapperEl;
    const targetScale = 2.5;
    const x = -(selectedEvent.pin_x / 100) * w * targetScale + w / 2;
    const y = -(selectedEvent.pin_y / 100) * h * targetScale + h / 2;
    transformRef.current.setTransform(x, y, targetScale, 400, "easeOut");
  }, [selectedEvent]);

  return (
    <section id="map" className="bg-muted py-16">
      <div className="mx-auto w-full px-4">
        <div className="mb-10 text-center">
          <h2 className="font-heading mb-3 text-4xl text-foreground md:text-5xl">Festival Map</h2>
          <p className="font-body text-lg text-muted-foreground">
            Pinch, scroll, or use the buttons to zoom • Tap a pin for details
          </p>
        </div>

        <div className="relative mx-auto overflow-hidden rounded-xl border-4 border-card shadow-xl bg-card aspect-[4/5] w-full">
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={1}
            maxScale={6}
            centerOnInit
            wheel={{ step: 0.15 }}
            pinch={{ step: 5 }}
            doubleClick={{ mode: "toggle", step: 1.5 }}
            limitToBounds
            onTransform={(ref) => setScale(ref.state.scale)}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: "100%", height: "100%" }}
                >
                  <div className="relative w-full h-full">
                    <img
                      src={mapUrl}
                      alt="Illustrated festival map of Sharon July 4th Celebration at Memorial Park Beach"
                      className="block w-full h-full object-contain select-none"
                      draggable={false}
                    />

                    {events.map((event) => {
                      const isActive = displayedPin === event.id;
                      const color = colorFor(event.category_slug);

                      return (
                        <button
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePin(isActive ? null : event.id);
                          }}
                          className="absolute group z-10"
                          style={{
                            left: `${event.pin_x}%`,
                            top: `${event.pin_y}%`,
                            transform: `translate(-50%, -50%) scale(${inv})`,
                            transformOrigin: "center center",
                          }}
                          aria-label={`${event.title} - ${event.location}`}
                        >
                          <div
                            className={`flex items-center justify-center rounded-full border-[3px] border-white shadow-lg transition-all duration-200 ${
                              isActive ? "w-14 h-14" : "w-11 h-11 hover:scale-110"
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
                            <div
                              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 sm:w-64 bg-card rounded-xl border-2 shadow-xl p-3 text-left z-20 animate-fade-in"
                              style={{ borderColor: color }}
                            >
                              {event.image_url && (
                                <img
                                  src={event.image_url}
                                  alt={event.title}
                                  loading="lazy"
                                  className="w-full h-24 object-cover rounded-md mb-2"
                                />
                              )}
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
                  </div>
                </TransformComponent>

                {/* Zoom controls */}
                <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-30">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 shadow-md"
                    onClick={() => zoomIn()}
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 shadow-md"
                    onClick={() => zoomOut()}
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 shadow-md"
                    onClick={() => resetTransform()}
                    aria-label="Reset view"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </TransformWrapper>

        </div>

        <div className="mx-auto mt-4 max-w-3xl rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {categories.map((cat) => (
              <div key={cat.slug} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ background: cat.color }}
                />
                <span className="font-body text-xs capitalize text-foreground">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FestivalMap;
