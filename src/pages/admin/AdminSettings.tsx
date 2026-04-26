import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Calendar as CalendarIcon, Image } from "lucide-react";

/** Convert ISO -> value usable by <input type="datetime-local"> in the user's local TZ. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AdminSettings = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [fireworksAt, setFireworksAt] = useState("");
  const [savingFireworks, setSavingFireworks] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-app-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("key, value")
        .eq("key", "fireworks_at");
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.key, r.value]));
    },
  });

  useEffect(() => {
    if (!rows) return;
    setFireworksAt(toLocalInput(rows.get("fireworks_at") ?? null));
  }, [rows]);

  const upsertConfig = async (key: string, value: string) => {
    // app_config.key is the primary key — use upsert.
    const { error } = await supabase
      .from("app_config")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    return error;
  };

  const saveFireworks = async () => {
    if (!fireworksAt) {
      toast({ title: "Pick a date and time", variant: "destructive" });
      return;
    }
    setSavingFireworks(true);
    const iso = new Date(fireworksAt).toISOString();
    const error = await upsertConfig("fireworks_at", iso);
    setSavingFireworks(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Fireworks time saved",
      description: new Date(iso).toLocaleString(),
    });
    qc.invalidateQueries({ queryKey: ["admin-app-config"] });
    qc.invalidateQueries({ queryKey: ["public-config"] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="font-heading text-3xl mb-1">Settings</h2>
          <p className="text-muted-foreground text-sm">
            Festival-wide settings that affect the public site and the apps.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="w-5 h-5" /> Fireworks date & time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Drives the homepage countdown and the iOS Live Activity (which appears in the
              last 2 hours before fireworks). Set in your local timezone.
            </p>
            <div>
              <Label htmlFor="fireworks-at">Date & time</Label>
              <Input
                id="fireworks-at"
                type="datetime-local"
                value={fireworksAt}
                onChange={(e) => setFireworksAt(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button onClick={saveFireworks} disabled={savingFireworks || isLoading}>
              <Save className="w-4 h-4 mr-1" />
              {savingFireworks ? "Saving…" : "Save fireworks time"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Image className="w-5 h-5" /> Public photo uploads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Visitor photos are stored in <strong>Supabase Storage</strong> (bucket{" "}
              <code className="bg-muted px-1 rounded text-xs">festival-photos</code>) via the
              <code className="bg-muted px-1 rounded text-xs mx-1">submit-photo</code> edge
              function.
            </p>
            <p>
              Review and delete submissions in <strong>Admin → Photo submissions</strong>{" "}
              (deleting a row also removes the file from storage for new submissions).
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
