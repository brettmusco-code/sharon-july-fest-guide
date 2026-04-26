-- Clear Drive-era names: photos use Supabase Storage only.
alter table public.photo_submissions rename column drive_file_id to storage_path;
alter table public.photo_submissions rename column drive_file_url to public_url;
alter table public.photo_submissions rename column drive_file_name to file_name;

-- Obsolete after Storage migration; safe to remove if present.
delete from public.app_config where key = 'photo_drive_folder_id';
