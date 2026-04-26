-- =====================================================================
-- FULL SCHEMA — run this ONCE on your NEW Supabase project
-- (exnfwgygwdrtrmlrichj) in: SQL Editor → New query → Run
--
-- Idempotent: safe to re-run. Creates enums, tables, functions, triggers,
-- RLS policies, and the `festival` storage bucket.
--
-- After this, run scripts/migrate-supabase-data.mjs to copy data.
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";
create extension if not exists "pg_net" with schema extensions;

-- ---------- Enums ----------
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- TABLES
-- =====================================================================

-- categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  color text not null default '#6366f1',
  icon text not null default '📌',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  time text not null default '',
  location text not null default '',
  category_slug text not null references public.categories(slug),
  icon text not null default '📌',
  pin_x numeric not null default 50,
  pin_y numeric not null default 50,
  sort_order int not null default 0,
  image_url text,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- faqs
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- questions (user-submitted Q&A)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text,
  status text not null default 'new',
  promoted_faq_id uuid references public.faqs(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- map_settings
create table if not exists public.map_settings (
  id uuid primary key default gen_random_uuid(),
  map_image_url text,
  updated_at timestamptz not null default now()
);

-- sponsors
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null default '',
  logo_url text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- messages (push notifications)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  scheduled_for timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- analytics_events
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  target_id text,
  target_label text,
  session_id text,
  ip_address text,
  created_at timestamptz not null default now()
);

-- user_roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- app_config
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- device_push_tokens
create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  token text not null unique,
  platform text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- push_attempts
create table if not exists public.push_attempts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid,
  message_title text,
  status text not null default 'pending',
  sent int,
  failed int,
  total int,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- photo_submissions (files in Storage bucket festival-photos)
create table if not exists public.photo_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_name text,
  instagram_handle text,
  caption text,
  storage_path text,
  file_name text,
  public_url text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'uploaded',
  error text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.claim_admin()
returns boolean language plpgsql security definer set search_path = public as $$
declare admin_count int; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Must be signed in'; end if;
  select count(*) into admin_count from public.user_roles where role = 'admin';
  if admin_count > 0 then return false; end if;
  insert into public.user_roles (user_id, role) values (uid, 'admin')
    on conflict (user_id, role) do nothing;
  return true;
end $$;

create or replace function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or length(p_token) = 0 then raise exception 'token required'; end if;
  if p_platform not in ('ios','android') then raise exception 'invalid platform'; end if;
  insert into public.device_push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set platform = excluded.platform, user_id = excluded.user_id, updated_at = now();
end $$;

create or replace function public.set_analytics_ip()
returns trigger language plpgsql security definer set search_path = public as $$
declare hdrs jsonb; xff text; ip text;
begin
  begin hdrs := current_setting('request.headers', true)::jsonb;
  exception when others then hdrs := null; end;
  if hdrs is not null then
    xff := hdrs->>'x-forwarded-for';
    if xff is not null and length(xff) > 0 then
      ip := trim(split_part(xff, ',', 1));
    end if;
    if ip is null or length(ip) = 0 then ip := hdrs->>'cf-connecting-ip'; end if;
    if ip is null or length(ip) = 0 then ip := hdrs->>'x-real-ip'; end if;
  end if;
  new.ip_address := ip;
  return new;
end $$;

-- send_message_push: posts to broadcast-push edge function.
-- IMPORTANT: function_url already points to your NEW project ref.
create or replace function public.send_message_push(_message_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  webhook_secret text;
  function_url text := 'https://exnfwgygwdrtrmlrichj.supabase.co/functions/v1/broadcast-push';
  attempt_id uuid;
  msg record;
begin
  select * into msg from public.messages where id = _message_id;
  if not found then return; end if;
  if msg.pushed_at is not null then return; end if;

  select value into webhook_secret from public.app_config where key = 'push_webhook_secret';
  if webhook_secret is null then
    insert into public.push_attempts (message_id, message_title, status, error, completed_at)
    values (msg.id, msg.title, 'skipped', 'push_webhook_secret not set', now());
    return;
  end if;

  insert into public.push_attempts (message_id, message_title, status)
  values (msg.id, msg.title, 'pending')
  returning id into attempt_id;

  update public.messages set pushed_at = now() where id = msg.id;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'record', to_jsonb(msg),
      'attempt_id', attempt_id
    )
  );
end $$;

create or replace function public.notify_message_inserted()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.scheduled_for is null or new.scheduled_for <= now() then
    perform public.send_message_push(new.id);
  end if;
  return new;
end $$;

create or replace function public.notify_message_updated()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.pushed_at is null and (new.scheduled_for is null or new.scheduled_for <= now()) then
    perform public.send_message_push(new.id);
  end if;
  return new;
end $$;

create or replace function public.dispatch_scheduled_messages()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare m record;
begin
  for m in
    select id from public.messages
    where pushed_at is null and scheduled_for is not null and scheduled_for <= now()
  loop
    perform public.send_message_push(m.id);
  end loop;
end $$;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists trg_faqs_updated_at on public.faqs;
create trigger trg_faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

drop trigger if exists trg_questions_updated_at on public.questions;
create trigger trg_questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_map_settings_updated_at on public.map_settings;
create trigger trg_map_settings_updated_at before update on public.map_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_sponsors_updated_at on public.sponsors;
create trigger trg_sponsors_updated_at before update on public.sponsors
  for each row execute function public.set_updated_at();

drop trigger if exists trg_messages_updated_at on public.messages;
create trigger trg_messages_updated_at before update on public.messages
  for each row execute function public.set_updated_at();

drop trigger if exists trg_app_config_updated_at on public.app_config;
create trigger trg_app_config_updated_at before update on public.app_config
  for each row execute function public.set_updated_at();

drop trigger if exists trg_device_push_tokens_updated_at on public.device_push_tokens;
create trigger trg_device_push_tokens_updated_at before update on public.device_push_tokens
  for each row execute function public.set_updated_at();

drop trigger if exists trg_analytics_set_ip on public.analytics_events;
create trigger trg_analytics_set_ip before insert on public.analytics_events
  for each row execute function public.set_analytics_ip();

drop trigger if exists trg_messages_inserted_push on public.messages;
create trigger trg_messages_inserted_push after insert on public.messages
  for each row execute function public.notify_message_inserted();

drop trigger if exists trg_messages_updated_push on public.messages;
create trigger trg_messages_updated_push after update of scheduled_for on public.messages
  for each row execute function public.notify_message_updated();

-- =====================================================================
-- RLS — enable & policies
-- =====================================================================

alter table public.categories          enable row level security;
alter table public.events              enable row level security;
alter table public.faqs                enable row level security;
alter table public.questions           enable row level security;
alter table public.map_settings        enable row level security;
alter table public.sponsors            enable row level security;
alter table public.messages            enable row level security;
alter table public.analytics_events    enable row level security;
alter table public.user_roles          enable row level security;
alter table public.app_config          enable row level security;
alter table public.device_push_tokens  enable row level security;
alter table public.push_attempts       enable row level security;
alter table public.photo_submissions   enable row level security;

-- helper to drop+recreate policies cleanly
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in (
        'categories','events','faqs','questions','map_settings','sponsors',
        'messages','analytics_events','user_roles','app_config',
        'device_push_tokens','push_attempts','photo_submissions'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- categories
create policy "Anyone can view categories" on public.categories for select using (true);
create policy "Admins manage categories" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- events
create policy "Anyone can view events" on public.events for select using (true);
create policy "Admins manage events" on public.events for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- faqs
create policy "Anyone can view faqs" on public.faqs for select using (true);
create policy "Admins manage faqs" on public.faqs for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- questions
create policy "Admins manage questions" on public.questions for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Anyone can submit questions" on public.questions for insert
  with check (length(question) > 0 and length(question) <= 1000
              and answer is null and status = 'new' and promoted_faq_id is null);

-- map_settings
create policy "Anyone can view map settings" on public.map_settings for select using (true);
create policy "Admins manage map settings" on public.map_settings for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- sponsors
create policy "Anyone can view sponsors" on public.sponsors for select using (true);
create policy "Admins manage sponsors" on public.sponsors for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- messages
create policy "Anyone can view published messages" on public.messages for select
  using (scheduled_for is null or scheduled_for <= now());
create policy "Admins view all messages" on public.messages for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "Admins manage messages" on public.messages for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- analytics_events
create policy "Anyone can insert analytics" on public.analytics_events for insert with check (true);
create policy "Admins can view analytics" on public.analytics_events for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- user_roles
create policy "Users can view their own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id);
create policy "Admins can view all roles" on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "Admins can manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- app_config
create policy "Anyone can view public app config keys" on public.app_config for select
  using (key = 'fireworks_at');
create policy "Admins can view app config" on public.app_config for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "Admins can insert app config" on public.app_config for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));
create policy "Admins can update app config" on public.app_config for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins can delete app config" on public.app_config for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- device_push_tokens (insert/update only via register_push_token RPC)
create policy "Admins can view push tokens" on public.device_push_tokens for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "Admins can delete push tokens" on public.device_push_tokens for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- push_attempts (writes only via SECURITY DEFINER funcs)
create policy "Admins can view push attempts" on public.push_attempts for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "Admins can delete push attempts" on public.push_attempts for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- photo_submissions
create policy "Admins manage photo submissions" on public.photo_submissions for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Anyone can submit photo metadata" on public.photo_submissions for insert
  with check (
    (submitter_name is null or length(submitter_name) <= 100)
    and (instagram_handle is null or length(instagram_handle) <= 100)
    and (caption is null or length(caption) <= 1000)
  );

-- =====================================================================
-- STORAGE — public 'festival' bucket
-- =====================================================================
insert into storage.buckets (id, name, public)
  values ('festival', 'festival', true)
  on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read festival" on storage.objects;
create policy "Public read festival" on storage.objects for select
  using (bucket_id = 'festival');

drop policy if exists "Admins write festival" on storage.objects;
create policy "Admins write festival" on storage.objects for all to authenticated
  using (bucket_id = 'festival' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'festival' and public.has_role(auth.uid(),'admin'));

-- =====================================================================
-- DONE.
-- Next steps:
-- 1. In NEW project SQL editor, set the push webhook secret:
--      insert into public.app_config (key, value) values
--        ('push_webhook_secret', 'YOUR_RANDOM_SECRET') on conflict (key) do update set value = excluded.value;
-- 2. Deploy edge functions (broadcast-push, submit-photo) and set secrets
--    (PUSH_WEBHOOK_SECRET, FIREBASE_SERVICE_ACCOUNT_JSON for push; submit-photo uses Storage only).
-- 3. Sign up your admin user, then call: select public.claim_admin();
-- 4. Run scripts/migrate-supabase-data.mjs to copy rows from OLD → NEW.
-- 5. Manually move files in the 'festival' storage bucket (Studio → Storage).
-- =====================================================================
