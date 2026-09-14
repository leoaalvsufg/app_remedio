begin;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  health_conditions text not null default '',
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  created_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  updated_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  revision bigint not null default 1,
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 120
  ),
  constraint profiles_health_conditions_length check (char_length(health_conditions) <= 2000),
  constraint profiles_locale_length check (char_length(locale) between 2 and 35),
  constraint profiles_timezone_length check (char_length(timezone) between 1 and 100),
  constraint profiles_timestamps_valid check (created_at >= 0 and updated_at >= created_at),
  constraint profiles_revision_valid check (revision >= 1)
);

create table public.medicines (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  dosage text not null,
  photo_path text,
  notes text,
  created_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  updated_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  revision bigint not null default 1,
  constraint medicines_user_id_id_key unique (user_id, id),
  constraint medicines_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint medicines_dosage_length check (char_length(btrim(dosage)) between 1 and 120),
  constraint medicines_photo_path_length check (photo_path is null or char_length(photo_path) <= 1024),
  constraint medicines_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint medicines_timestamps_valid check (created_at >= 0 and updated_at >= created_at),
  constraint medicines_revision_valid check (revision >= 1)
);

create table public.schedules (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  medicine_id uuid not null,
  type text not null,
  times text[] not null default '{}',
  interval_hours smallint,
  start_time text,
  weekdays smallint[] not null default '{}',
  start_date bigint not null,
  end_date bigint,
  created_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  updated_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  revision bigint not null default 1,
  constraint schedules_user_id_id_key unique (user_id, id),
  constraint schedules_user_medicine_key unique (user_id, medicine_id),
  constraint schedules_user_id_id_medicine_key unique (user_id, id, medicine_id),
  constraint schedules_medicine_fk foreign key (user_id, medicine_id)
    references public.medicines (user_id, id) on delete cascade,
  constraint schedules_type_valid check (type in ('fixed_times', 'interval', 'weekly')),
  constraint schedules_times_no_nulls check (array_position(times, null) is null),
  constraint schedules_times_valid check (
    cardinality(times) = 0
    or array_to_string(times, ',') ~ '^([01][0-9]|2[0-3]):[0-5][0-9](,([01][0-9]|2[0-3]):[0-5][0-9])*$'
  ),
  constraint schedules_weekdays_no_nulls check (array_position(weekdays, null) is null),
  constraint schedules_weekdays_valid check (
    cardinality(weekdays) <= 7 and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  constraint schedules_shape_valid check (
    (
      type = 'fixed_times'
      and cardinality(times) > 0
      and interval_hours is null
      and start_time is null
      and cardinality(weekdays) = 0
    )
    or (
      type = 'interval'
      and cardinality(times) = 0
      and interval_hours between 1 and 24
      and start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      and cardinality(weekdays) = 0
    )
    or (
      type = 'weekly'
      and cardinality(times) > 0
      and interval_hours is null
      and start_time is null
      and cardinality(weekdays) > 0
    )
  ),
  constraint schedules_dates_valid check (start_date >= 0 and (end_date is null or end_date >= start_date)),
  constraint schedules_timestamps_valid check (created_at >= 0 and updated_at >= created_at),
  constraint schedules_revision_valid check (revision >= 1)
);

create table public.intakes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  medicine_id uuid not null,
  schedule_id uuid not null,
  scheduled_at bigint not null,
  taken_at bigint,
  status text not null default 'pending',
  parent_intake_id uuid,
  snooze_count smallint not null default 0,
  created_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  updated_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  revision bigint not null default 1,
  constraint intakes_user_id_id_key unique (user_id, id),
  constraint intakes_schedule_time_key unique (user_id, schedule_id, scheduled_at),
  constraint intakes_schedule_fk foreign key (user_id, schedule_id, medicine_id)
    references public.schedules (user_id, id, medicine_id) on delete cascade,
  constraint intakes_parent_fk foreign key (user_id, parent_intake_id)
    references public.intakes (user_id, id) on delete set null (parent_intake_id),
  constraint intakes_status_valid check (status in ('pending', 'taken', 'skipped', 'snoozed')),
  constraint intakes_status_timestamp_valid check (
    (status = 'taken' and taken_at is not null)
    or (status <> 'taken' and taken_at is null)
  ),
  constraint intakes_snooze_count_valid check (snooze_count between 0 and 3),
  constraint intakes_scheduled_at_valid check (scheduled_at >= 0),
  constraint intakes_taken_at_valid check (taken_at is null or taken_at >= 0),
  constraint intakes_timestamps_valid check (created_at >= 0 and updated_at >= created_at),
  constraint intakes_revision_valid check (revision >= 1)
);

create table public.ai_messages (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  medicine_id uuid,
  mode text not null,
  role text not null,
  content text not null,
  created_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  updated_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  revision bigint not null default 1,
  constraint ai_messages_user_id_id_key unique (user_id, id),
  constraint ai_messages_medicine_fk foreign key (user_id, medicine_id)
    references public.medicines (user_id, id) on delete set null (medicine_id),
  constraint ai_messages_mode_valid check (mode in ('leaflet', 'interactions', 'timing', 'chat')),
  constraint ai_messages_role_valid check (role in ('user', 'assistant')),
  constraint ai_messages_content_length check (char_length(btrim(content)) between 1 and 12000),
  constraint ai_messages_timestamps_valid check (created_at >= 0 and updated_at >= created_at),
  constraint ai_messages_revision_valid check (revision >= 1)
);

create table public.sync_changes (
  seq bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  operation text not null,
  payload jsonb not null,
  created_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  constraint sync_changes_entity_valid check (entity in ('medicine', 'schedule', 'intake')),
  constraint sync_changes_operation_valid check (operation in ('upsert', 'delete')),
  constraint sync_changes_created_at_valid check (created_at >= 0)
);

create table private.ai_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  minute_started_at timestamptz not null,
  minute_count smallint not null default 0,
  day_started_at date not null,
  day_count smallint not null default 0,
  updated_at timestamptz not null default clock_timestamp(),
  constraint ai_rate_limits_minute_count_valid check (minute_count between 0 and 5),
  constraint ai_rate_limits_day_count_valid check (day_count between 0 and 50)
);

create index medicines_user_id_idx on public.medicines (user_id);
create index schedules_user_id_idx on public.schedules (user_id);
create index intakes_user_id_scheduled_at_idx on public.intakes (user_id, scheduled_at);
create index intakes_user_id_medicine_id_idx on public.intakes (user_id, medicine_id);
create index intakes_user_id_parent_intake_id_idx
  on public.intakes (user_id, parent_intake_id)
  where parent_intake_id is not null;
create index ai_messages_user_id_created_at_idx on public.ai_messages (user_id, created_at desc);
create index ai_messages_user_id_medicine_id_idx
  on public.ai_messages (user_id, medicine_id)
  where medicine_id is not null;
create index sync_changes_user_id_seq_idx on public.sync_changes (user_id, seq);

create or replace function private.touch_entity_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id then
    raise exception 'id and user_id are immutable';
  end if;

  new.revision := old.revision + 1;
  new.updated_at := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  return new;
end;
$$;

create or replace function private.touch_profile_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id is immutable';
  end if;

  new.revision := old.revision + 1;
  new.updated_at := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  return new;
end;
$$;

create or replace function public.append_sync_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.sync_changes (user_id, entity, entity_id, operation, payload)
    values (
      old.user_id,
      case tg_table_name
        when 'medicines' then 'medicine'
        when 'schedules' then 'schedule'
        when 'intakes' then 'intake'
      end,
      old.id,
      'delete',
      pg_catalog.to_jsonb(old)
    );
    return old;
  end if;

  insert into public.sync_changes (user_id, entity, entity_id, operation, payload)
  values (
    new.user_id,
    case tg_table_name
      when 'medicines' then 'medicine'
      when 'schedules' then 'schedule'
      when 'intakes' then 'intake'
    end,
    new.id,
    'upsert',
    pg_catalog.to_jsonb(new)
  );
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    left(
      nullif(
        pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')),
        ''
      ),
      120
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.consume_health_assistant_quota(p_user_id uuid)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  minute_remaining integer,
  day_remaining integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_today date := (v_now at time zone 'UTC')::date;
  quota private.ai_rate_limits%rowtype;
begin
  insert into private.ai_rate_limits (
    user_id,
    minute_started_at,
    minute_count,
    day_started_at,
    day_count,
    updated_at
  )
  values (p_user_id, v_now, 0, v_today, 0, v_now)
  on conflict (user_id) do nothing;

  select *
  into quota
  from private.ai_rate_limits
  where user_id = p_user_id
  for update;

  if quota.day_started_at <> v_today then
    quota.day_started_at := v_today;
    quota.day_count := 0;
  end if;

  if v_now - quota.minute_started_at >= interval '1 minute' then
    quota.minute_started_at := v_now;
    quota.minute_count := 0;
  end if;

  if quota.day_count >= 50 then
    update private.ai_rate_limits
    set
      minute_started_at = quota.minute_started_at,
      minute_count = quota.minute_count,
      day_started_at = quota.day_started_at,
      day_count = quota.day_count,
      updated_at = v_now
    where user_id = p_user_id;

    return query select
      false,
      greatest(
        1,
        ceil(extract(epoch from (((v_today + 1)::timestamp at time zone 'UTC') - v_now)))::integer
      ),
      greatest(0, 5 - quota.minute_count)::integer,
      0;
    return;
  end if;

  if quota.minute_count >= 5 then
    update private.ai_rate_limits
    set
      minute_started_at = quota.minute_started_at,
      minute_count = quota.minute_count,
      day_started_at = quota.day_started_at,
      day_count = quota.day_count,
      updated_at = v_now
    where user_id = p_user_id;

    return query select
      false,
      greatest(
        1,
        ceil(extract(epoch from ((quota.minute_started_at + interval '1 minute') - v_now)))::integer
      ),
      0,
      greatest(0, 50 - quota.day_count)::integer;
    return;
  end if;

  quota.minute_count := quota.minute_count + 1;
  quota.day_count := quota.day_count + 1;

  update private.ai_rate_limits
  set
    minute_started_at = quota.minute_started_at,
    minute_count = quota.minute_count,
    day_started_at = quota.day_started_at,
    day_count = quota.day_count,
    updated_at = v_now
  where user_id = p_user_id;

  return query select
    true,
    0,
    (5 - quota.minute_count)::integer,
    (50 - quota.day_count)::integer;
end;
$$;

create trigger profiles_touch_metadata
before update on public.profiles
for each row execute function private.touch_profile_row();

create trigger medicines_touch_metadata
before update on public.medicines
for each row execute function private.touch_entity_row();

create trigger schedules_touch_metadata
before update on public.schedules
for each row execute function private.touch_entity_row();

create trigger intakes_touch_metadata
before update on public.intakes
for each row execute function private.touch_entity_row();

create trigger ai_messages_touch_metadata
before update on public.ai_messages
for each row execute function private.touch_entity_row();

create trigger medicines_append_sync_change
after insert or update or delete on public.medicines
for each row execute function public.append_sync_change();

create trigger schedules_append_sync_change
after insert or update or delete on public.schedules
for each row execute function public.append_sync_change();

create trigger intakes_append_sync_change
after insert or update or delete on public.intakes
for each row execute function public.append_sync_change();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (user_id, display_name)
select
  id,
  left(
    nullif(
      btrim(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', '')),
      ''
    ),
    120
  )
from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.medicines enable row level security;
alter table public.schedules enable row level security;
alter table public.intakes enable row level security;
alter table public.ai_messages enable row level security;
alter table public.sync_changes enable row level security;
alter table private.ai_rate_limits enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.medicines from public, anon, authenticated;
revoke all on table public.schedules from public, anon, authenticated;
revoke all on table public.intakes from public, anon, authenticated;
revoke all on table public.ai_messages from public, anon, authenticated;
revoke all on table public.sync_changes from public, anon, authenticated;
revoke all on table private.ai_rate_limits from public, anon, authenticated;
revoke all on sequence public.sync_changes_seq_seq from public, anon, authenticated;
revoke all on function public.append_sync_change() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.consume_health_assistant_quota(uuid) from public, anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.medicines to authenticated;
grant select, insert, update, delete on table public.schedules to authenticated;
grant select, insert, update, delete on table public.intakes to authenticated;
grant select, insert, update, delete on table public.ai_messages to authenticated;
grant select on table public.sync_changes to authenticated;
grant execute on function public.consume_health_assistant_quota(uuid) to service_role;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "profiles_delete_own"
on public.profiles for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "medicines_select_own"
on public.medicines for select to authenticated
using ((select auth.uid()) = user_id);

create policy "medicines_insert_own"
on public.medicines for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "medicines_update_own"
on public.medicines for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "medicines_delete_own"
on public.medicines for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "schedules_select_own"
on public.schedules for select to authenticated
using ((select auth.uid()) = user_id);

create policy "schedules_insert_own"
on public.schedules for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "schedules_update_own"
on public.schedules for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "schedules_delete_own"
on public.schedules for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "intakes_select_own"
on public.intakes for select to authenticated
using ((select auth.uid()) = user_id);

create policy "intakes_insert_own"
on public.intakes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "intakes_update_own"
on public.intakes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "intakes_delete_own"
on public.intakes for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "ai_messages_select_own"
on public.ai_messages for select to authenticated
using ((select auth.uid()) = user_id);

create policy "ai_messages_insert_own"
on public.ai_messages for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "ai_messages_update_own"
on public.ai_messages for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "ai_messages_delete_own"
on public.ai_messages for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "sync_changes_select_own"
on public.sync_changes for select to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medicine-photos',
  'medicine-photos',
  false,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "medicine_photos_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'medicine-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "medicine_photos_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'medicine-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "medicine_photos_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'medicine-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'medicine-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "medicine_photos_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'medicine-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
