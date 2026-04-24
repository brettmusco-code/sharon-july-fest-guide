/**
 * Called by a Database Webhook when a row is inserted into `public.messages`.
 * Sends FCM data+notification to every token in `device_push_tokens`.
 *
 * Secrets (set in Supabase Dashboard → Edge Functions → Secrets):
 *   - FIREBASE_SERVICE_ACCOUNT_JSON — full JSON of a Firebase service account with FCM access
 *   - PUSH_WEBHOOK_SECRET — same value you send as header `x-webhook-secret` from the webhook
 *
 * Webhook (Dashboard → Database → Webhooks): table `messages`, event INSERT,
 * HTTP POST to `https://<ref>.supabase.co/functions/v1/broadcast-push`
 * with header `x-webhook-secret: <PUSH_WEBHOOK_SECRET>`.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { GoogleAuth } from "https://esm.sh/google-auth-library@9.14.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  // Trim: dashboard/CLI pastes often include trailing newlines, which break ===.
  const expected = Deno.env.get("PUSH_WEBHOOK_SECRET")?.trim();
  const got = req.headers.get("x-webhook-secret")?.trim();
  if (!expected || !got || got !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const rawJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!rawJson) {
    return new Response(JSON.stringify({ ok: true, skipped: "FIREBASE_SERVICE_ACCOUNT_JSON not set" }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const record =
    (payload.record as Record<string, string> | undefined) ??
    ((payload as { message?: { record?: Record<string, string> } }).message?.record);
  const attemptId = (payload.attempt_id as string | undefined) ?? null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const finalize = async (patch: Record<string, unknown>) => {
    if (!attemptId) return;
    await supabase
      .from("push_attempts")
      .update({ ...patch, completed_at: new Date().toISOString() })
      .eq("id", attemptId);
  };

  if (!record?.title) {
    await finalize({ status: "error", error: "no record.title" });
    return new Response(JSON.stringify({ ok: false, error: "no record.title" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const title = String(record.title).slice(0, 200);
  const body = String(record.body ?? "").slice(0, 350);

  const { data: rows, error: qErr } = await supabase.from("device_push_tokens").select("token");
  if (qErr) {
    await finalize({ status: "error", error: qErr.message });
    return new Response(JSON.stringify({ ok: false, error: qErr.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const credentials = JSON.parse(rawJson) as { project_id: string; client_email: string; private_key: string };
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const accessToken = tokenRes?.token;
  if (!accessToken) {
    await finalize({ status: "error", error: "no oauth token" });
    return new Response(JSON.stringify({ ok: false, error: "no oauth token" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const projectId = credentials.project_id;
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const token = row.token as string;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body: body || " " },
          data: { type: "announcement" },
          android: {
            priority: "HIGH",
            notification: { icon: "ic_stat_notify" },
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: { aps: { sound: "default" } },
          },
        },
      }),
    });
    if (res.ok) sent++;
    else failed++;
  }

  const total = rows?.length ?? 0;
  await finalize({
    status: failed === 0 ? "success" : sent === 0 ? "error" : "partial",
    sent,
    failed,
    total,
  });

  return new Response(
    JSON.stringify({ ok: true, sent, failed, total }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
