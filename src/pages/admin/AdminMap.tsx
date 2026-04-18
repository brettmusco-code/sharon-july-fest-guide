import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useEvents, useCategories, useMapSettings } from "@/hooks/useFestivalData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import festivalMapFallback from "@/assets/festival-map.jpg";

const AdminMap = () => {
  const { data: events = [] } = useEvents();
  const { data: categories = [] } = useCategories();
  const { data: settings } = useMapSettings();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { document.title = "Admin · Map"; }, []);

  const mapUrl = settings?.map_image_url ?? festivalMapFallback;

  const colorFor = (slug: string) => categories.find((c) => c.slug === slug)?.color ?? "#6366f1";

  const handlePointerDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingId(id);
  };

  const handlePointerMove = (id: string) => (e: React.PointerEvent) => {
    if (draggingId !== id || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    qc.setQueryData(["events"], (old: typeof events | undefined) =>
      old?.map((ev) => (ev.id === id ? { ...ev, pin_x: x, pin_y: y } : ev))
    );
  };

  const handlePointerUp = (id: string) => async (e: React.PointerEvent) => {
    if (draggingId !== id) return;
    setDraggingId(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const ev = (qc.getQueryData(["events"]) as typeof events | undefined)?.find((x) => x.id === id);
    if (!ev) return;
    const { error } = await supabase
      .from("events")
      .update({ pin_x: ev.pin_x, pin_y: ev.pin_y })
      .eq("id", id);
    if (error) {
      toast({ title: "Could not save pin", description: error.message, variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["events"] });
    } else {
      toast({ title: "Pin saved", description: `${ev.title} → ${ev.pin_x.toFixed(1)}%, ${ev.pin_y.toFixed(1)}%` });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `map-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("festival").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("festival").getPublicUrl(path);
      const url = pub.publicUrl;

      // Upsert single map_settings row
      const existingId = settings?.id;
      const res = existingId
        ? await supabase.from("map_settings").update({ map_image_url: url }).eq("id", existingId)
        : await supabase.from("map_settings").insert({ map_image_url: url });
      if (res.error) throw res.error;

      toast({ title: "Map updated" });
      qc.invalidateQueries({ queryKey: ["map_settings"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-3xl">Map</h2>
          <p className="text-muted-foreground text-sm">Drag pins to position events. Upload a new map image below.</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-1" />
            {uploading ? "Uploading…" : "Upload new map"}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Pin positioning</CardTitle>
          <CardDescription>Click and drag any pin. Position is saved automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-lg border-2 select-none touch-none"
          >
            <img
              src={mapUrl}
              alt="Festival map"
              className="block w-full h-auto pointer-events-none"
              draggable={false}
            />
            {events.map((ev) => (
              <button
                key={ev.id}
                onPointerDown={handlePointerDown(ev.id)}
                onPointerMove={handlePointerMove(ev.id)}
                onPointerUp={handlePointerUp(ev.id)}
                onPointerCancel={handlePointerUp(ev.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-[3px] border-white shadow-lg transition-transform ${
                  draggingId === ev.id ? "scale-125 cursor-grabbing z-20" : "cursor-grab hover:scale-110 z-10"
                }`}
                style={{
                  left: `${ev.pin_x}%`,
                  top: `${ev.pin_y}%`,
                  width: 44,
                  height: 44,
                  background: colorFor(ev.category_slug),
                }}
                title={ev.title}
                aria-label={`Drag pin for ${ev.title}`}
              >
                <span className="text-xl leading-none pointer-events-none">{ev.icon}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pin positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 p-2 rounded border bg-card">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 border-card shadow"
                  style={{ background: colorFor(ev.category_slug) }}
                >
                  {ev.icon}
                </span>
                <span className="flex-1 truncate font-medium">{ev.title}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {ev.pin_x.toFixed(1)}, {ev.pin_y.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminMap;
