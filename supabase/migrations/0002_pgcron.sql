-- Schedule a job that pings /api/cron/sync-matches every 10 minutes.
-- Runs entirely inside Supabase (free tier) and replaces Vercel cron.
--
-- BEFORE running this migration: deploy the app to Vercel first so you have
-- the production URL. Then seed the two secrets in Supabase Vault by running
-- this in the SQL editor (replace the values):
--
--   select vault.create_secret('https://your-app.vercel.app', 'app_url');
--   select vault.create_secret('your-cron-secret-here',       'cron_secret');
--
-- Update later with vault.update_secret('new value', 'app_url').

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;
create extension if not exists supabase_vault;

create or replace function public.trigger_match_sync()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  v_app_url   text;
  v_secret    text;
  v_request_id bigint;
begin
  select decrypted_secret into v_app_url
    from vault.decrypted_secrets where name = 'app_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'cron_secret' limit 1;

  if v_app_url is null or v_secret is null then
    raise notice 'trigger_match_sync: missing app_url or cron_secret in vault';
    return null;
  end if;

  -- pg_net.http_get is async / fire-and-forget; returns a request id.
  select net.http_get(
    url := v_app_url || '/api/cron/sync-matches',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 50000
  ) into v_request_id;

  return v_request_id;
end;
$$;

-- Drop any existing schedule with this name (idempotent).
do $$
begin
  perform cron.unschedule('match-sync-10min');
exception when others then null;
end$$;

-- Schedule: every 10 minutes.
select cron.schedule(
  'match-sync-10min',
  '*/10 * * * *',
  $$ select public.trigger_match_sync(); $$
);

-- Inspect:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select * from net._http_response order by created desc limit 10;
