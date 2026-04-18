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

  const daysUntil = Math.ceil((new Date(DATE).getTime() - Date.now()) / 86400000);
  const tooFar = daysUntil > 16;

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-border bg-card">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="font-body text-sm text-muted-foreground">Loading forecast…</span>
      </div>
    );
  }

  if (error || tooFar || !data) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-border bg-card">
        <Cloud className="h-4 w-4 text-muted-foreground" />
        <span className="font-body text-sm text-muted-foreground">
          {tooFar ? "Forecast available closer to July 3" : "Forecast unavailable"}
        </span>
      </div>
    );
  }

  const { label, Icon } = codeToInfo(data.code);
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-border bg-card">
      <Icon className="h-5 w-5 text-firework-gold" strokeWidth={1.75} />
      <span className="font-heading text-base text-foreground">
        {data.high}°<span className="text-muted-foreground">/{data.low}°</span>
      </span>
      <span className="font-body text-sm text-muted-foreground">· {label}</span>
      {data.precipitation > 20 && (
        <span className="font-body text-xs text-primary">· 💧{data.precipitation}%</span>
      )}
    </div>
  );
};

export default WeatherWidget;
