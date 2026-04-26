import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ExternalLink, RefreshCw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Submission {
  id: string;
  submitter_name: string | null;
  instagram_handle: string | null;
  caption: string | null;
  drive_file_id: string | null;
  drive_file_url: string | null;
  drive_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: string;
  error: string | null;
  created_at: string;
}

const formatBytes = (n: number | null) => {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const AdminPhotos = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-photo-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Submission[];
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const sub = submissions.find((s) => s.id === deleteId);
    const path = sub?.drive_file_id?.trim() ?? "";
    if (path.includes("/")) {
      const { error: stErr } = await supabase.storage
        .from("festival-photos")
        .remove([path]);
      if (stErr) {
        console.warn("Storage delete:", stErr.message);
      }
    }
    const { error } = await supabase.from("photo_submissions").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Submission and file removed" });
    qc.invalidateQueries({ queryKey: ["admin-photo-submissions"] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl mb-1">Photo submissions</h2>
            <p className="text-muted-foreground text-sm">
              Photos visitors send in are stored in <strong>Supabase Storage</strong> (
              <code className="text-xs bg-muted px-1 rounded">festival-photos</code>).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-photo-submissions"] })}
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : submissions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No photo submissions yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => (
              <Card key={s.id}>
                <CardContent className="py-4 flex items-start justify-between gap-3">
                  {s.drive_file_url && s.status === "uploaded" && (
                    <a
                      href={s.drive_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 w-20 h-20 rounded-md overflow-hidden border bg-muted"
                    >
                      <img
                        src={s.drive_file_url}
                        alt={s.drive_file_name || "Photo"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {s.submitter_name || "Anonymous"}
                      </span>
                      {s.instagram_handle && (
                        <Badge variant="secondary" className="text-xs">
                          @{s.instagram_handle.replace(/^@/, "")}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </span>
                      {s.status !== "uploaded" && (
                        <Badge variant="destructive" className="text-xs">{s.status}</Badge>
                      )}
                    </div>
                    {s.caption && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-1">
                        {s.caption}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{s.drive_file_name || "—"}</span>
                      <span>{formatBytes(s.size_bytes)}</span>
                      {s.mime_type && <span>{s.mime_type}</span>}
                    </div>
                    {s.error && (
                      <p className="text-xs text-destructive mt-1">{s.error}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {s.drive_file_url && (
                      <Button asChild variant="ghost" size="sm">
                        <a href={s.drive_file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-1" /> Open full size
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(s.id)}
                      aria-label="Delete record"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the record and, for files stored in Supabase Storage, removes the image
              file as well. Older Google Drive–based submissions are record-only; remove those
              from Drive by hand if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete record</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminPhotos;
