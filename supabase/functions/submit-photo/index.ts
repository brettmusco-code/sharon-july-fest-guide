// Photo submission edge function.
//
// Accepts multipart/form-data from the public site:
//   file              : the image (required, <=15 MB)
//   submitter_name    : optional, <=100
//   instagram_handle  : optional, <=100
//   caption           : optional, <=1000
//
// Reads the destination Drive folder ID from public.app_config and uploads
// the file via the Lovable Connector Gateway for Google Drive (multipart).
// On success inserts a row in public.photo_submissions for admin review.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_NAME = 100;
const MAX_CAPTION = 1000;

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

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY is not configured" });
  if (!GOOGLE_DRIVE_API_KEY) return json(500, { error: "GOOGLE_DRIVE_API_KEY is not configured" });
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Supabase env not configured" });

  // Service-role client so the insert/select bypass RLS cleanly for this trusted server flow.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Look up the destination folder ID set by an admin in /admin/settings.
  const { data: cfgRows, error: cfgError } = await admin
    .from("app_config")
    .select("key, value")
    .eq("key", "photo_drive_folder_id")
    .maybeSingle();
  if (cfgError) return json(500, { error: `Config read failed: ${cfgError.message}` });
  const folderId = (cfgRows?.value ?? "").trim();
  if (!folderId) {
    return json(503, {
      error: "Photo uploads aren't configured yet. The festival admin needs to set the Google Drive folder.",
    });
  }

  // Parse multipart body.
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

  // Build a friendly filename: "<timestamp>_<name?>_<original>".
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = safeFilename(file.name);
  const namePart = submitterName ? `_${safeFilename(submitterName)}` : "";
  const driveName = `${ts}${namePart}_${baseName}`.slice(0, 200);

  // Description metadata to keep in Drive even if our DB row is deleted.
  const descLines = [
    submitterName ? `Submitted by: ${submitterName}` : null,
    instagramHandle ? `Instagram: @${instagramHandle}` : null,
    caption ? `Caption: ${caption}` : null,
    `Uploaded: ${new Date().toUTCString()}`,
  ].filter(Boolean);

  // Drive multipart upload (related body with metadata + media).
  const boundary = `----LovableBoundary${crypto.randomUUID()}`;
  const metadata = {
    name: driveName,
    parents: [folderId],
    description: descLines.join("\n"),
    mimeType: mime,
  };

  const fileBuf = new Uint8Array(await file.arrayBuffer());
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mime}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(head.length + fileBuf.length + tail.length);
  body.set(head, 0);
  body.set(fileBuf, head.length);
  body.set(tail, head.length + fileBuf.length);

  const driveRes = await fetch(
    `${DRIVE_GATEWAY}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_DRIVE_API_KEY,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  const driveText = await driveRes.text();
  if (!driveRes.ok) {
    console.error("[submit-photo] Drive upload failed", driveRes.status, driveText);
    // Persist a failure record so admins can see attempts went nowhere.
    await admin.from("photo_submissions").insert({
      submitter_name: submitterName || null,
      instagram_handle: instagramHandle || null,
      caption: caption || null,
      mime_type: mime,
      size_bytes: file.size,
      status: "failed",
      error: `Drive ${driveRes.status}: ${driveText.slice(0, 500)}`,
    });
    // Friendlier client message
    let friendly = "Upload failed. Please try again.";
    if (driveRes.status === 403) {
      friendly = "The festival's photo folder isn't shared with the upload service yet. Tell an organizer.";
    } else if (driveRes.status === 404) {
      friendly = "The photo folder couldn't be found. Tell an organizer.";
    } else if (driveRes.status === 401) {
      friendly = "The Google Drive connection has expired. Tell an organizer to reconnect it.";
    }
    return json(502, { error: friendly });
  }

  let driveResult: { id?: string; webViewLink?: string; name?: string } = {};
  try {
    driveResult = JSON.parse(driveText);
  } catch {
    /* ignore */
  }

  const { error: insertError } = await admin.from("photo_submissions").insert({
    submitter_name: submitterName || null,
    instagram_handle: instagramHandle || null,
    caption: caption || null,
    drive_file_id: driveResult.id ?? null,
    drive_file_url: driveResult.webViewLink ?? null,
    drive_file_name: driveResult.name ?? driveName,
    mime_type: mime,
    size_bytes: file.size,
    status: "uploaded",
  });
  if (insertError) {
    // The file is in Drive — log but don't fail the user.
    console.error("[submit-photo] DB insert failed:", insertError.message);
  }

  return json(200, {
    ok: true,
    file_id: driveResult.id,
    file_url: driveResult.webViewLink,
  });
});
