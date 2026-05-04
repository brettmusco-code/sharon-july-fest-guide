import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEvents, useCategories, useMapSettings } from "@/hooks/useFestivalData";
import festivalMapFallback from "@/assets/festival-map.jpg";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  sort_order: number;
}

const SITE_URL = "https://sma-july4th.lovable.app";

/**
 * Print-ready 20"x30" portrait sign with map + schedule on one page.
 * Tip: open /print, then File → Print → "Save as PDF", set paper to 20x30 in,
 * margins = None, scale = 100%, background graphics ON.
 */
const PrintSign = () => {
  const { data: events = [] } = useEvents();
  const { data: categories = [] } = useCategories();
  const { data: settings } = useMapSettings();
  const { data: sponsors = [] } = useQuery({
    queryKey: ["sponsors", "print"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsors")
        .select("id, name, logo_url, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Sponsor[];
    },
  });
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=0&data=${encodeURIComponent(SITE_URL)}`;

  const colorFor = (slug: string) =>
    categories.find((c) => c.slug === slug)?.color ?? "#6366f1";
  const nameFor = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug;
  const mapUrl = settings?.map_image_url ?? festivalMapFallback;

  useEffect(() => {
    document.title = "Festival Sign – Print";
  }, []);

  return (
    <>
      <style>{`
        @page { size: 20in 30in; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .print-toolbar { display: none !important; }
          .sign-page { box-shadow: none !important; margin: 0 !important; }
        }
        .sign-page {
          width: 20in;
          height: 30in;
          background: #fff;
          color: #0a0a0a;
          margin: 0 auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        }
      `}</style>

      <div style={{ background: "#f3f4f6", minHeight: "100vh", padding: "24px 0" }}>
        <div className="print-toolbar" style={{
          maxWidth: "20in", margin: "0 auto 16px", display: "flex",
          justifyContent: "space-between", alignItems: "center", padding: "0 8px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}>
          <div style={{ fontSize: 14, color: "#374151" }}>
            <strong>20" × 30" Print Sign</strong> — File → Print → Save as PDF, paper size 20×30 in, margins None, background graphics ON.
          </div>
          <button
            onClick={() => window.print()}
            style={{
              background: "#1d4ed8", color: "#fff", border: 0, padding: "10px 18px",
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Print / Save PDF
          </button>
        </div>

        <div className="sign-page">
          {/* Header band */}
          <header style={{
            background: "linear-gradient(135deg, #b91c1c 0%, #1d4ed8 100%)",
            color: "#fff",
            padding: "0.6in 0.7in 0.55in",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.18em", opacity: 0.92 }}>
              SHARON • MASSACHUSETTS
            </div>
            <h1 style={{
              fontSize: 100, lineHeight: 1.0, margin: "10px 0 8px",
              fontWeight: 900, letterSpacing: "-0.02em",
            }}>
              INDEPENDENCE DAY CELEBRATION
            </h1>
            <div style={{ fontSize: 36, fontWeight: 600, opacity: 0.95 }}>
              Memorial Park Beach · Lake Massapoag
            </div>
          </header>

          {/* Map */}
          <section style={{ padding: "0.45in 0.6in 0.2in" }}>
            <h2 style={{
              fontSize: 44, fontWeight: 800, margin: "0 0 12px",
              borderBottom: "4px solid #0a0a0a", paddingBottom: 8,
            }}>
              Festival Map
            </h2>
            <div style={{
              position: "relative", width: "100%",
              border: "3px solid #0a0a0a", borderRadius: 12, overflow: "hidden",
              background: "#fff",
            }}>
              {(() => {
                // Crop: hide top 8% and bottom 15% of the source map to focus on the beach.
                const CROP_TOP = 0.08;
                const CROP_BOTTOM = 0.15;
                const VISIBLE = 1 - CROP_TOP - CROP_BOTTOM; // 0.77
                return (
                  <div style={{
                    position: "relative",
                    width: "100%",
                    paddingTop: `${VISIBLE * 100}%`, // square-ish container sized to visible portion
                    overflow: "hidden",
                  }}>
                    <img
                      src={mapUrl}
                      alt="Festival map"
                      style={{
                        position: "absolute",
                        top: `-${(CROP_TOP / VISIBLE) * 100}%`,
                        left: 0,
                        width: "100%",
                        height: `${(1 / VISIBLE) * 100}%`,
                        display: "block",
                      }}
                    />
                    {events.map((ev) => {
                      const color = colorFor(ev.category_slug);
                      // Remap pin Y from full-image space to visible-crop space.
                      const remappedY = ((ev.pin_y / 100 - CROP_TOP) / VISIBLE) * 100;
                      if (remappedY < 0 || remappedY > 100) return null;
                      return (
                        <div
                          key={ev.id}
                          style={{
                            position: "absolute",
                            left: `${ev.pin_x}%`,
                            top: `${remappedY}%`,
                            transform: "translate(-50%, -100%)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{
                            background: color,
                            color: "#fff",
                            border: "3px solid #fff",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                            borderRadius: "999px",
                            width: 56, height: 56,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 30, fontWeight: 900,
                          }}>
                            {ev.sort_order ?? ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Legend */}
          <section style={{ padding: "0.15in 0.6in 0.1in" }}>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: "10px 22px",
              justifyContent: "center",
            }}>
              {categories.map((cat) => (
                <div key={cat.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 14,
                  fontSize: 32, fontWeight: 700,
                }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: "999px",
                    background: cat.color, border: "2px solid #0a0a0a",
                  }} />
                  {cat.name}
                </div>
              ))}
            </div>
          </section>

          {/* Schedule */}
          <section style={{
            padding: "0.2in 0.6in 0.25in",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}>
            <h2 style={{
              fontSize: 48, fontWeight: 800, margin: "0 0 12px",
              borderBottom: "4px solid #0a0a0a", paddingBottom: 8,
            }}>
              Schedule of Events
            </h2>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              {events.map((ev) => {
                const color = colorFor(ev.category_slug);
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 2.4in 1fr",
                      alignItems: "center",
                      gap: 18,
                      padding: "10px 16px",
                      border: "2px solid #0a0a0a",
                      borderLeft: `14px solid ${color}`,
                      borderRadius: 8,
                      background: "#fff",
                      breakInside: "avoid",
                    }}
                  >
                    <div style={{
                      width: 64, height: 64, borderRadius: "999px",
                      background: color, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 36, fontWeight: 900, border: "3px solid #0a0a0a",
                    }}>
                      {ev.sort_order ?? ""}
                    </div>
                    <div style={{
                      fontSize: 32, fontWeight: 900, color: "#1d4ed8",
                      lineHeight: 1.05,
                    }}>
                      {ev.all_day ? "All Day" : ev.time}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>
                        {ev.title}
                      </div>
                      <div style={{
                        fontSize: 22, fontWeight: 600, color: "#374151",
                        marginTop: 2,
                      }}>
                        📍 {ev.location}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Sponsors strip */}
          {sponsors.length > 0 && (
            <section style={{
              padding: "0.15in 0.6in 0.1in",
              borderTop: "2px solid #e5e7eb",
            }}>
              <div style={{
                fontSize: 18, fontWeight: 700, letterSpacing: "0.15em",
                textAlign: "center", color: "#6b7280", marginBottom: 8,
              }}>
                THANK YOU TO OUR SPONSORS
              </div>
              <div style={{
                display: "flex", flexWrap: "wrap", justifyContent: "center",
                alignItems: "center", gap: "12px 28px",
              }}>
                {sponsors.map((s) => (
                  <img
                    key={s.id}
                    src={s.logo_url}
                    alt={s.name}
                    style={{ maxHeight: 70, maxWidth: 160, objectFit: "contain" }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Footer */}
          <footer style={{
            background: "#0a0a0a", color: "#fff",
            padding: "0.3in 0.7in",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 22, fontWeight: 600, gap: 24,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <img
                src={qrSrc}
                alt="QR code to festival site"
                style={{
                  width: 130, height: 130, background: "#fff",
                  padding: 8, borderRadius: 8,
                }}
              />
              <div style={{ lineHeight: 1.25 }}>
                <div style={{ fontSize: 20, opacity: 0.8, fontWeight: 600 }}>
                  Scan for live schedule, alerts & map
                </div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>
                  sma-july4th.lovable.app
                </div>
              </div>
            </div>
            <div style={{ opacity: 0.85, fontSize: 24 }}>#SharonJuly4th</div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default PrintSign;
