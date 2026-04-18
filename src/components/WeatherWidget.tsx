import { useEffect, useState } from "react";
import { Cloud, CloudRain, CloudSnow, Sun, CloudSun, Zap, CloudFog, Loader2 } from "lucide-react";

// Sharon, MA coordinates
const LAT = 42.1237;
const LON = -71.1786;
const DATE = "2026-07-03";

interface Forecast {
  high: number;
  low: number;
  code: number;
  precipitation: number;
}

// WMO Weather interpretation codes
const codeToInfo = (code: number): { label: string; Icon: typeof Sun } => {
  if (code === 0) return { label: "Clear & sunny", Icon: Sun };
  if (code <= 2) return { label: "Mostly sunny", Icon: CloudSun };
  if (code === 3) return { label: "Cloudy", Icon: Cloud };
  if (code <= 48) return { label: "Foggy", Icon: CloudFog };
  if (code <= 67) return { label: "Rain expected", Icon: CloudRain };
  if (code <= 77) return { label: "Snow", Icon: CloudSnow };
  if (code <= 82) return { label: "Showers", Icon: CloudRain };
  if (code <= 99) return { label: "Thunderstorms", Icon: Zap };
  return { label: "Forecast pending", Icon: Cloud };
};

const WeatherWidget = () => {
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=${DATE}&end_date=${DATE}`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        const d = j?.daily;
        if (!d || !d.temperature_2m_max?.[0]) throw new Error("no data");
        setData({
          high: Math.round(d.temperature_2m_max[0]),
          low: Math.round(d.temperature_2m_min[0]),
          code: d.weathercode[0],
          precipitation: d.precipitation_probability_max?.[0] ?? 0,
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Show "forecast available closer to date" if too far out
  const daysUntil = Math.ceil((new Date(DATE).getTime() - Date.now()) / 86400000);
  const tooFar = daysUntil > 16;

  return (
    <section className="bg-background py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border-2 border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Forecast for July 3
              </p>
              <h3 className="font-heading text-2xl md:text-3xl text-foreground">
                Sharon, Massachusetts
              </h3>
            </div>

            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : error || tooFar || !data ? (
              <div className="text-right">
                <Cloud className="h-10 w-10 text-muted-foreground inline-block mb-1" />
                <p className="font-body text-sm text-muted-foreground">
                  {tooFar ? "Forecast available closer to the date" : "Forecast unavailable"}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {(() => {
                  const { label, Icon } = codeToInfo(data.code);
                  return (
                    <>
                      <Icon className="h-12 w-12 text-firework-gold" strokeWidth={1.5} />
                      <div className="text-right">
                        <div className="font-heading text-3xl md:text-4xl text-foreground leading-none">
                          {data.high}°
                          <span className="text-xl text-muted-foreground ml-1">/ {data.low}°</span>
                        </div>
                        <p className="font-body text-sm text-muted-foreground mt-1">{label}</p>
                        {data.precipitation > 20 && (
                          <p className="font-body text-xs text-primary mt-0.5">
                            💧 {data.precipitation}% chance of rain
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WeatherWidget;
