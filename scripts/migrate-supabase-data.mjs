/**
 * One-shot copy of public data from OLD Supabase project → NEW (yours).
 *
 * Prerequisites:
 *   - NEW project already has all migrations applied (empty tables except seeds OK).
 *   - OLD anon key must be allowed to SELECT these tables (RLS "Anyone can read" policies).
 *   - NEW service role key (Settings → API → service_role) — keep secret; never commit.
 *
 * Run from repo root:
 *   MIGRATE_OLD_URL="https://xxxx.supabase.co" \
 *   MIGRATE_OLD_ANON_KEY="eyJ..." \
 *   MIGRATE_NEW_URL="https://yyyy.supabase.co" \
 *   MIGRATE_NEW_SERVICE_ROLE_KEY="eyJ..." \
 *   node scripts/migrate-supabase-data.mjs
 *
 * Does NOT copy auth.users or user_roles — recreate admin users in the new project (Auth → Users),
 * then restore roles with SQL or the admin UI.
 */
import { createClient } from "@supabase/supabase-js";

const oldUrl = process.env.MIGRATE_OLD_URL;
const oldKey = process.env.MIGRATE_OLD_ANON_KEY;
const newUrl = process.env.MIGRATE_NEW_URL;
const newKey = process.env.MIGRATE_NEW_SERVICE_ROLE_KEY;

if (!oldUrl || !oldKey || !newUrl || !newKey) {
  console.error("Missing env. Set MIGRATE_OLD_URL, MIGRATE_OLD_ANON_KEY, MIGRATE_NEW_URL, MIGRATE_NEW_SERVICE_ROLE_KEY");
  process.exit(1);
}

const oldDb = createClient(oldUrl, oldKey);
const newDb = createClient(newUrl, newKey, { auth: { persistSession: false } });

/** Delete all rows (PostgREST needs a filter; UUID tables use impossible id match). */
const NIL = "00000000-0000-0000-0000-000000000000";

async function clearNew() {
  const order = [
    "questions",
    "messages",
    "analytics_events",
    "events",
    "faqs",
    "categories",
    "map_settings",
  ];
  for (const table of order) {
    const { error } = await newDb.from(table).delete().neq("id", NIL);
    if (error) console.warn(`clear ${table}:`, error.message);
  }
}

async function copyTable(table) {
  const { data, error } = await oldDb.from(table).select("*");
  if (error) {
    console.error(`OLD read ${table}:`, error.message);
    return 0;
  }
  if (!data?.length) {
    console.log(`  ${table}: 0 rows`);
    return 0;
  }
  const { error: ins } = await newDb.from(table).insert(data);
  if (ins) {
    console.error(`NEW insert ${table}:`, ins.message);
    return 0;
  }
  console.log(`  ${table}: ${data.length} rows`);
  return data.length;
}

async function main() {
  console.log("Clearing NEW public tables (order safe for FKs)…");
  await clearNew();

  console.log("Copying from OLD → NEW…");
  let n = 0;
  n += await copyTable("categories");
  n += await copyTable("events");
  n += await copyTable("map_settings");
  n += await copyTable("faqs");
  n += await copyTable("questions");
  n += await copyTable("messages");
  n += await copyTable("analytics_events");

  console.log(`Done. Copied ${n} total rows (see per-table counts above).`);
  console.log("Next: recreate Auth admin users on NEW, then update .env to NEW keys and rebuild the app.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
