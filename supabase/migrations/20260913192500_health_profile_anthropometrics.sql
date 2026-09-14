begin;

alter table public.health_profiles
  add column if not exists age_years smallint,
  add column if not exists weight_kg numeric(5,2),
  add column if not exists height_cm numeric(5,2),
  add column if not exists sex text,
  add column if not exists pregnancy text,
  add column if not exists kidney_function text,
  add column if not exists liver_function text,
  add column if not exists alcohol_use text,
  add column if not exists smoking text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'health_profiles_age_range'
  ) then
    alter table public.health_profiles
      add constraint health_profiles_age_range
      check (age_years is null or (age_years between 0 and 130));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'health_profiles_weight_range'
  ) then
    alter table public.health_profiles
      add constraint health_profiles_weight_range
      check (weight_kg is null or (weight_kg between 0.5 and 500));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'health_profiles_height_range'
  ) then
    alter table public.health_profiles
      add constraint health_profiles_height_range
      check (height_cm is null or (height_cm between 20 and 260));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'health_profiles_sex_valid'
  ) then
    alter table public.health_profiles
      add constraint health_profiles_sex_valid
      check (sex is null or sex in ('female','male','intersex','prefer_not_to_say'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'health_profiles_pregnancy_valid'
  ) then
    alter table public.health_profiles
      add constraint health_profiles_pregnancy_valid
      check (
        pregnancy is null
        or pregnancy in ('not_applicable','possibly_pregnant','pregnant','breastfeeding','unknown')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'health_profiles_kidney_valid'
  ) then
    alter table public.health_profiles
      add constraint health_profiles_kidney_valid
      check (kidney_function is null or kidney_function in ('normal','mild_impairment','moderate_impairment','severe_impairment','unknown'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'health_profiles_liver_valid'
  ) then
    alter table public.health_profiles
      add constraint health_profiles_liver_valid
      check (liver_function is null or liver_function in ('normal','mild_impairment','moderate_impairment','severe_impairment','unknown'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'health_profiles_alcohol_valid'
  ) then
    alter table public.health_profiles
      add constraint health_profiles_alcohol_valid
      check (alcohol_use is null or alcohol_use in ('none','occasional','regular','unknown'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'health_profiles_smoking_valid'
  ) then
    alter table public.health_profiles
      add constraint health_profiles_smoking_valid
      check (smoking is null or smoking in ('none','occasional','regular','unknown'));
  end if;
end$$;

commit;
