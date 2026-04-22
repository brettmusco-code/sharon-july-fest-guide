import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, MousePointerClick, Sparkles, Users, MapPin, HelpCircle } from "lucide-react";

interface AnalyticsRow {
  id: string;
  event_type: string;
  target_id: string | null;
  target_label: string | null;
  session_id: string | null;
  ip_address: string | null;
  created_at: string;
}

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

const AdminAnalytics = () => {
  const [days, setDays] = useState(7);

  useEffect(() => {
    document.title = "Admin · Analytics";
  }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["analytics", days],
    queryFn: async (): Promise<AnalyticsRow[]> => {
      const since = subDays(new Date(), days).toISOString();
      const { data, error } = await supabase
        .from("analytics_events")
        .select("id, event_type, target_id, target_label, session_id, ip_address, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as AnalyticsRow[];
    },
  });

  const stats = useMemo(() => {
    const visits = rows.filter((r) => r.event_type === "page_visit").length;
    const eventClicks = rows.filter((r) => r.event_type === "event_click").length;
    const sponsorClicks = rows.filter((r) => r.event_type === "sponsor_click").length;
    const mapPinClicks = rows.filter((r) => r.event_type === "map_pin_click").length;
    const faqOpens = rows.filter((r) => r.event_type === "faq_open").length;
    // Unique visitors are counted by IP address across the whole site.
    // Fall back to session_id only if IP wasn't captured (older rows).
    const uniqueVisitors = new Set(
      rows.map((r) => r.ip_address ?? (r.session_id ? `s:${r.session_id}` : null)).filter(Boolean),
    ).size;
    return { visits, eventClicks, sponsorClicks, mapPinClicks, faqOpens, uniqueSessions: uniqueVisitors };
  }, [rows]);

  const dailyData = useMemo(() => {
    const buckets: Record<
      string,
      { date: string; visits: number; visitors: number; events: number; sponsors: number; _ips: Set<string> }
    > = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      buckets[d] = { date: d, visits: 0, visitors: 0, events: 0, sponsors: 0, _ips: new Set() };
    }
    rows.forEach((r) => {
      const key = format(startOfDay(new Date(r.created_at)), "MMM d");
      if (!buckets[key]) return;
      const visitorKey = r.ip_address ?? (r.session_id ? `s:${r.session_id}` : null);
      if (visitorKey) buckets[key]._ips.add(visitorKey);
      if (r.event_type === "page_visit") buckets[key].visits++;
      else if (r.event_type === "event_click") buckets[key].events++;
      else if (r.event_type === "sponsor_click") buckets[key].sponsors++;
    });
    return Object.values(buckets).map(({ _ips, ...rest }) => ({
      ...rest,
      visitors: _ips.size,
    }));
  }, [rows, days]);

  const topItems = (type: string) => {
    const counts: Record<string, { label: string; count: number }> = {};
    rows
      .filter((r) => r.event_type === type && r.target_label)
      .forEach((r) => {
        const key = r.target_id ?? r.target_label!;
        if (!counts[key]) counts[key] = { label: r.target_label!, count: 0 };
        counts[key].count++;
      });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
  };

  const topEvents = useMemo(() => topItems("event_click"), [rows]);
  const topSponsors = useMemo(() => topItems("sponsor_click"), [rows]);
  const topPins = useMemo(() => topItems("map_pin_click"), [rows]);
  const topFaqs = useMemo(() => topItems("faq_open"), [rows]);
  const topPages = useMemo(() => topItems("page_visit"), [rows]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-3xl">Analytics</h2>
          <p className="text-muted-foreground text-sm">Anonymous visitor activity. No personal data is collected.</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              size="sm"
              variant={days === r.days ? "default" : "outline"}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={<Eye className="w-5 h-5" />} label="Page visits" value={stats.visits} />
            <StatCard icon={<Users className="w-5 h-5" />} label="Unique visitors" value={stats.uniqueSessions} />
            <StatCard icon={<MousePointerClick className="w-5 h-5" />} label="Event clicks" value={stats.eventClicks} />
            <StatCard icon={<MapPin className="w-5 h-5" />} label="Map pin taps" value={stats.mapPinClicks} />
            <StatCard icon={<HelpCircle className="w-5 h-5" />} label="FAQ opens" value={stats.faqOpens} />
            <StatCard icon={<Sparkles className="w-5 h-5" />} label="Sponsor clicks" value={stats.sponsorClicks} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Daily activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={2} name="Unique visitors" />
                    <Line type="monotone" dataKey="visits" stroke="hsl(var(--accent))" strokeWidth={2} name="Visits" />
                    <Line type="monotone" dataKey="events" stroke="hsl(var(--accent-foreground))" strokeWidth={2} name="Event clicks" />
                    <Line type="monotone" dataKey="sponsors" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Sponsor clicks" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <TopList title="Top events (schedule clicks)" rows={topEvents} emptyText="No event clicks yet." />
            <TopList title="Top map pins" rows={topPins} emptyText="No map pin taps yet." />
            <TopList title="Top FAQs" rows={topFaqs} emptyText="No FAQ opens yet." />
            <TopList title="Top sponsors" rows={topSponsors} emptyText="No sponsor clicks yet." />
            <TopList title="Page visits" rows={topPages} emptyText="No page visits yet." />
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-2xl">{value.toLocaleString()}</p>
      </div>
    </CardContent>
  </Card>
);

const TopList = ({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: { label: string; count: number }[];
  emptyText: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-heading text-xl">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyText}</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                <span className="truncate">{r.label}</span>
              </span>
              <span className="font-semibold tabular-nums">{r.count}</span>
            </li>
          ))}
        </ol>
      )}
    </CardContent>
  </Card>
);

export default AdminAnalytics;
