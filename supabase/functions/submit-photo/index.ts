// Photo submission edge function (public).
//
// Uploads to Supabase Storage bucket `festival-photos` (no Google Drive).
// Service role only for upload + DB row; RLS on storage allows public read of objects.
//
// Multipart form fields (same as before):
//   file, submitter_name, instagram_handle, caption
//
// DB columns drive_file_id / drive_file_url / drive_file_name now mean:
//   object path in bucket, public URL, display filename (legacy column names).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const BUCKET = "festival-photos";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_NAME = 100;
const MAX_CAPTION = 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sanitize = (s: string, max: number) =>
  s.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);

const safeFilename = (raw: string): string => {
  const cleaned = (raw || "photo.jpg").replace(/[^\w.\- ]+/g, "_").slice(0, 80);
  return cleaned || "photo.jpg";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: "Supabase env not configured" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json(400, { error: "Invalid multipart form data" });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json(400, { error: "Missing 'file' field" });
  }
  if (file.size === 0) return json(400, { error: "File is empty" });
  if (file.size > MAX_BYTES) {
    return json(413, { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` });
  }
  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("image/")) {
    return json(400, { error: "Only image files are accepted" });
  }

  const submitterName = sanitize(String(form.get("submitter_name") ?? ""), MAX_NAME);
  const instagramHandle = sanitize(String(form.get("instagram_handle") ?? ""), MAX_NAME).replace(/^@/, "");
  const caption = sanitize(String(form.get("caption") ?? ""), MAX_CAPTION);

  const ts = new Date();
  const y = ts.getUTCFullYear();
  const baseName = safeFilename(file.name);
  const namePart = submitterName ? `_${safeFilename(submitterName)}` : "";
  const objectName = `${crypto.randomUUID()}${namePart}_${baseName}`.slice(0, 200);
  const objectPath = `${y}/${objectName}`;

  const fileBuf = new Uint8Array(await file.arrayBuffer());

  const { data: upData, error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(objectPath, fileBuf, {
      contentType: mime,
      upsert: false,
    });

  if (upErr || !upData?.path) {
    const msg = upErr?.message ?? "Upload failed";
    console.error("[submit-photo] storage upload failed", upErr);
    await admin.from("photo_submissions").insert({
      submitter_name: submitterName || null,
      instagram_handle: instagramHandle || null,
      caption: caption || null,
      mime_type: mime,
      size_bytes: file.size,
      status: "failed",
      error: msg.slice(0, 500),
    });
    return json(502, {
      error: "We couldn't store your photo. Please try again in a moment, or try a smaller image.",
    });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = pub.publicUrl;

  const { error: insertError } = await admin.from("photo_submissions").insert({
    submitter_name: submitterName || null,
    instagram_handle: instagramHandle || null,
    caption: caption || null,
    drive_file_id: objectPath,
    drive_file_url: publicUrl,
    drive_file_name: objectName,
    mime_type: mime,
    size_bytes: file.size,
    status: "uploaded",
  });
  if (insertError) {
    console.error("[submit-photo] DB insert failed:", insertError.message);
    // Best effort: remove orphan object
    await admin.storage.from(BUCKET).remove([objectPath]);
    return json(500, { error: "We saved your file but couldn't record the submission. Please try again." });
  }

  return json(200, {
    ok: true,
    file_id: objectPath,
    file_url: publicUrl,
  });
});
