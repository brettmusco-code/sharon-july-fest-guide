import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Calendar as CalendarIcon, FolderOpen } from "lucide-react";

/** Convert ISO -> value usable by <input type="datetime-local"> in the user's local TZ. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Try to extract a folder ID from any of:
 *   - bare ID (alphanumeric/underscore/dash, ~25-44 chars)
 *   - https://drive.google.com/drive/folders/<id>?...
 *   - https://drive.google.com/drive/u/0/folders/<id>
 */
const extractFolderId = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return trimmed;
};

const AdminSettings = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [fireworksAt, setFireworksAt] = useState("");
  const [folderInput, setFolderInput] = useState("");
  const [savingFireworks, setSavingFireworks] = useState(false);
  const [savingFolder, setSavingFolder] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-app-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", ["fireworks_at", "photo_drive_folder_id"]);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.key, r.value]));
    },
  });

  useEffect(() => {
    if (!rows) return;
    setFireworksAt(toLocalInput(rows.get("fireworks_at") ?? null));
    setFolderInput(rows.get("photo_drive_folder_id") ?? "");
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

  const saveFolder = async () => {
    const id = extractFolderId(folderInput);
    setSavingFolder(true);
    const error = await upsertConfig("photo_drive_folder_id", id);
    setSavingFolder(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setFolderInput(id);
    toast({
      title: id ? "Folder saved" : "Folder cleared",
      description: id || "Photo submissions will now be rejected until a folder is set.",
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
              <FolderOpen className="w-5 h-5" /> Photo upload folder (Google Drive)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Visitors can submit photos from the site. Each photo is uploaded directly
                to the Google Drive folder you specify here.
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Open the destination folder in Google Drive in a browser.</li>
                <li>
                  Copy the URL — it looks like{" "}
                  <code className="bg-muted px-1 rounded text-xs">
                    drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
                  </code>
                </li>
                <li>
                  Paste the full URL <em>or</em> just the folder ID below.
                </li>
                <li>
                  <strong>Important:</strong> the folder must be shared with the Google account
                  that authorized the Lovable Drive connection (give it Editor access).
                </li>
              </ol>
            </div>
            <div>
              <Label htmlFor="folder-id">Folder URL or ID</Label>
              <Input
                id="folder-id"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/1A2B3C... or just 1A2B3C..."
                disabled={isLoading}
              />
              {folderInput && extractFolderId(folderInput) !== folderInput && (
                <p className="text-xs text-muted-foreground mt-1">
                  Will be saved as: <code>{extractFolderId(folderInput)}</code>
                </p>
              )}
            </div>
            <Button onClick={saveFolder} disabled={savingFolder || isLoading}>
              <Save className="w-4 h-4 mr-1" />
              {savingFolder ? "Saving…" : "Save folder"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
