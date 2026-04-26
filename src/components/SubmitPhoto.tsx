import { useState, useRef } from "react";
import { z } from "zod";
import { Camera, Upload, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const schema = z.object({
  submitter_name: z.string().trim().max(100).optional().or(z.literal("")),
  instagram_handle: z.string().trim().max(100).optional().or(z.literal("")),
  caption: z.string().trim().max(1000).optional().or(z.literal("")),
});

const SubmitPhoto = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast({
        title: "Photo too large",
        description: `Max 15 MB. Yours is ${(f.size / 1024 / 1024).toFixed(1)} MB.`,
        variant: "destructive",
      });
      return;
    }
    if (!ACCEPTED.includes(f.type) && !f.type.startsWith("image/")) {
      toast({
        title: "Not an image",
        description: "Pick a JPG, PNG, or HEIC file.",
        variant: "destructive",
      });
      return;
    }
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setName("");
    setHandle("");
    setCaption("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "Pick a photo first", variant: "destructive" });
      return;
    }
    const parsed = schema.safeParse({
      submitter_name: name,
      instagram_handle: handle,
      caption,
    });
    if (!parsed.success) {
      toast({
        title: "Check your info",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (name.trim()) fd.append("submitter_name", name.trim());
      if (handle.trim()) fd.append("instagram_handle", handle.trim().replace(/^@/, ""));
      if (caption.trim()) fd.append("caption", caption.trim());

      const { data, error } = await supabase.functions.invoke("submit-photo", {
        body: fd,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      trackEvent("photo_submit", null, file.name.slice(0, 80));
      setSubmitted(true);
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({
        title: "Couldn't upload",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-10 rounded-xl border bg-card p-6 shadow-sm text-center">
        <div className="text-4xl mb-2">📸</div>
        <h3 className="font-heading text-xl mb-1">Thanks for sharing!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your photo was uploaded successfully.
        </p>
        <Button variant="outline" onClick={() => setSubmitted(false)}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-5 h-5 text-primary" />
        <h3 className="font-heading text-xl">Share your festival photos</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Send us your favorite shots from the celebration — we'd love to see them!
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        {preview ? (
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            <img
              src={preview}
              alt="Selected photo preview"
              className="w-full max-h-72 object-contain"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 shadow-md"
              onClick={reset}
              aria-label="Remove photo"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-border hover:border-primary rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ImageIcon className="w-8 h-8" />
            <span className="font-medium">Tap to pick a photo</span>
            <span className="text-xs">JPG, PNG or HEIC • Max 15 MB</span>
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ph-name" className="text-xs">
              Your name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="ph-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Jane"
            />
          </div>
          <div>
            <Label htmlFor="ph-handle" className="text-xs">
              Instagram handle <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="ph-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              maxLength={100}
              placeholder="@yourhandle"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="ph-caption" className="text-xs">
            Caption <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="ph-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Tell us about the moment..."
          />
        </div>

        <Button type="submit" disabled={submitting || !file} className="w-full sm:w-auto">
          <Upload className="w-4 h-4 mr-1" />
          {submitting ? "Uploading…" : "Submit photo"}
        </Button>
      </form>
    </div>
  );
};

export default SubmitPhoto;
