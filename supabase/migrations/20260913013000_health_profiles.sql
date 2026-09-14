begin;

create table public.health_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  conditions text not null default '',
  allergies text not null default '',
  additional_notes text not null default '',
  onboarding_completed_at bigint,
  created_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  updated_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  revision bigint not null default 1,
  constraint health_profiles_conditions_length check (char_length(conditions) <= 2000),
  constraint health_profiles_allergies_length check (char_length(allergies) <= 2000),
  constraint health_profiles_notes_length check (char_length(additional_notes) <= 2000),
  constraint health_profiles_onboarding_timestamp_valid check (
    onboarding_completed_at is null or onboarding_completed_at >= 0
  ),
  constraint health_profiles_timestamps_valid check (created_at >= 0 and updated_at >= created_at),
  constraint health_profiles_revision_valid check (revision >= 1)
);

insert into public.health_profiles (user_id, conditions)
select users.id, coalesce(profiles.health_conditions, '')
from auth.users as users
left join public.profiles as profiles on profiles.user_id = users.id
on conflict (user_id) do nothing;

create trigger health_profiles_touch_metadata
before update on public.health_profiles
for each row execute function private.touch_profile_row();

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

  insert into public.health_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

alter table public.health_profiles enable row level security;
revoke all on table public.health_profiles from public, anon, authenticated;
grant select, insert, update, delete on table public.health_profiles to authenticated;

create policy "health_profiles_select_own"
on public.health_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "health_profiles_insert_own"
on public.health_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "health_profiles_update_own"
on public.health_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "health_profiles_delete_own"
on public.health_profiles for delete to authenticated
using ((select auth.uid()) = user_id);

comment on column public.profiles.health_conditions is
  'Deprecated after health_profiles migration; retained temporarily for rollout compatibility.';

commit;
