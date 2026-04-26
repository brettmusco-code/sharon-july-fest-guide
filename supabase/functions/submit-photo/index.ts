// Photo submission edge function (public).
//
// Flow
//  1. Receives `multipart/form-data` from the website / app:
//       file              (required, <=15 MB)
//       submitter_name    (optional, <=100)
//       instagram_handle  (optional, <=100)
//       caption           (optional, <=1000)
//  2. Looks up the destination Drive folder ID from `public.app_config`
//     (key `photo_drive_folder_id`).
//  3. Authenticates as a Google Cloud service account and uploads the file to
//     Google Drive using a multipart upload (metadata + media). The folder must
//     be shared with the service account's `client_email` (Editor/Content
//     manager). Shared Drives are fully supported via `supportsAllDrives=true`.
//  4. Inserts a row in `public.photo_submissions` so admins can review.
//
// Secrets (Supabase Dashboard → Edge Functions → Secrets)
//   - GOOGLE_SERVICE_ACCOUNT_JSON — full JSON for a Google Cloud service
//     account with Drive access. Share the target folder with the account's
//     email (e.g. `xxx@yyy.iam.gserviceaccount.com`).
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-populated by Supabase.
//
// Historical note: the previous implementation used Lovable Cloud's connector
// gateway (`connector-gateway.lovable.dev`), which stopped working once this
// project moved off Lovable Cloud.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { GoogleAuth } from "https://esm.sh/google-auth-library@9.14.2";

const DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink,name";
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
  const GOOGLE_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: "Supabase env not configured" });
  }
  if (!GOOGLE_JSON) {
    return json(500, {
      error:
        "Photo uploads aren't configured yet. GOOGLE_SERVICE_ACCOUNT_JSON is not set.",
    });
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(GOOGLE_JSON);
  } catch {
    return json(500, { error: "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON" });
  }

  // Service-role client so the insert/select bypass RLS cleanly for this trusted server flow.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: cfgRow, error: cfgError } = await admin
    .from("app_config")
    .select("key, value")
    .eq("key", "photo_drive_folder_id")
    .maybeSingle();
  if (cfgError) return json(500, { error: `Config read failed: ${cfgError.message}` });
  const folderId = (cfgRow?.value ?? "").trim();
  if (!folderId) {
    return json(503, {
      error:
        "Photo uploads aren't configured yet. The festival admin needs to set the Google Drive folder ID in app_config.",
    });
  }

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

  // Friendly filename: "<timestamp>_<name?>_<original>".
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = safeFilename(file.name);
  const namePart = submitterName ? `_${safeFilename(submitterName)}` : "";
  const driveName = `${ts}${namePart}_${baseName}`.slice(0, 200);

  // Description kept in Drive so admins still have context if the DB row is removed.
  const descLines = [
    submitterName ? `Submitted by: ${submitterName}` : null,
    instagramHandle ? `Instagram: @${instagramHandle}` : null,
    caption ? `Caption: ${caption}` : null,
    `Uploaded: ${new Date().toUTCString()}`,
  ].filter(Boolean);

  const auth = new GoogleAuth({
    credentials: credentials as {
      client_email: string;
      private_key: string;
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  let accessToken: string;
  try {
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    accessToken = (tokenResponse?.token ?? tokenResponse) as string;
    if (!accessToken) throw new Error("no token");
  } catch (err) {
    console.error("[submit-photo] Google auth failed", err);
    return json(500, { error: "Server could not authenticate with Google Drive" });
  }

  const boundary = `----SubmitPhotoBoundary${crypto.randomUUID()}`;
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

  const driveRes = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const driveText = await driveRes.text();
  if (!driveRes.ok) {
    console.error("[submit-photo] Drive upload failed", driveRes.status, driveText);
    await admin.from("photo_submissions").insert({
      submitter_name: submitterName || null,
      instagram_handle: instagramHandle || null,
      caption: caption || null,
      mime_type: mime,
      size_bytes: file.size,
      status: "failed",
      error: `Drive ${driveRes.status}: ${driveText.slice(0, 500)}`,
    });

    let friendly = "Upload failed. Please try again.";
    if (driveRes.status === 403) {
      friendly =
        "The festival's photo folder isn't shared with the upload service yet. Tell an organizer.";
    } else if (driveRes.status === 404) {
      friendly = "The photo folder couldn't be found. Tell an organizer.";
    } else if (driveRes.status === 401) {
      friendly = "The Google Drive credential is invalid or expired. Tell an organizer.";
    }
    return json(502, { error: friendly });
  }

  let driveResult: { id?: string; webViewLink?: string; name?: string } = {};
  try {
    driveResult = JSON.parse(driveText);
  } catch {
    /* ignore parse errors; Drive returned 2xx */
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
    // File is already in Drive — log for admins but don't fail the user.
    console.error("[submit-photo] DB insert failed:", insertError.message);
  }

  return json(200, {
    ok: true,
    file_id: driveResult.id,
    file_url: driveResult.webViewLink,
  });
});
