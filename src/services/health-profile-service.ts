import type { SQLiteDatabase } from 'expo-sqlite';

import { secureStorage, supabase } from '@/lib/supabase';
import type {
  HealthProfile,
  HealthProfileInput,
  OrganFunction,
  PregnancyStatus,
  Sex,
  SubstanceUse,
} from '@/types/health-profile';

interface CachedRow {
  user_id: string;
  conditions: string;
  allergies: string;
  additional_notes: string;
  onboarding_completed_at: number | null;
  updated_at: number;
  dirty: number;
}

interface RemoteRow {
  user_id: string;
  conditions: string;
  allergies: string;
  additional_notes: string;
  age_years: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  sex: Sex | null;
  pregnancy: PregnancyStatus | null;
  kidney_function: OrganFunction | null;
  liver_function: OrganFunction | null;
  alcohol_use: SubstanceUse | null;
  smoking: SubstanceUse | null;
  onboarding_completed_at: number | null;
  updated_at: number;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nullableEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== 'string') return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

const SEX_VALUES: readonly Sex[] = ['female', 'male', 'intersex', 'prefer_not_to_say'];
const PREGNANCY_VALUES: readonly PregnancyStatus[] = [
  'not_applicable',
  'possibly_pregnant',
  'pregnant',
  'breastfeeding',
  'unknown',
];
const ORGAN_VALUES: readonly OrganFunction[] = [
  'normal',
  'mild_impairment',
  'moderate_impairment',
  'severe_impairment',
  'unknown',
];
const SUBSTANCE_VALUES: readonly SubstanceUse[] = ['none', 'occasional', 'regular', 'unknown'];

function mapCached(row: CachedRow): HealthProfile {
  return {
    userId: row.user_id,
    conditions: row.conditions,
    allergies: row.allergies,
    additionalNotes: row.additional_notes,
    ageYears: null,
    weightKg: null,
    heightCm: null,
    sex: null,
    pregnancy: null,
    kidneyFunction: null,
    liverFunction: null,
    alcoholUse: null,
    smoking: null,
    onboardingCompletedAt: row.onboarding_completed_at,
    updatedAt: row.updated_at,
  };
}

function mapRemote(row: RemoteRow): HealthProfile {
  return {
    userId: row.user_id,
    conditions: row.conditions,
    allergies: row.allergies,
    additionalNotes: row.additional_notes,
    ageYears: nullableNumber(row.age_years),
    weightKg: nullableNumber(row.weight_kg),
    heightCm: nullableNumber(row.height_cm),
    sex: nullableEnum(row.sex, SEX_VALUES),
    pregnancy: nullableEnum(row.pregnancy, PREGNANCY_VALUES),
    kidneyFunction: nullableEnum(row.kidney_function, ORGAN_VALUES),
    liverFunction: nullableEnum(row.liver_function, ORGAN_VALUES),
    alcoholUse: nullableEnum(row.alcohol_use, SUBSTANCE_VALUES),
    smoking: nullableEnum(row.smoking, SUBSTANCE_VALUES),
    onboardingCompletedAt: nullableNumber(row.onboarding_completed_at),
    updatedAt: row.updated_at,
  };
}

function cacheKey(userId: string) {
  return `health-profile-${userId}`;
}

async function readCache(db: SQLiteDatabase, userId: string) {
  const encrypted = await secureStorage.getItem(cacheKey(userId));
  if (encrypted) {
    try {
      return JSON.parse(encrypted) as { profile: HealthProfile; dirty: boolean };
    } catch {
      await secureStorage.removeItem(cacheKey(userId));
    }
  }

  const legacy = await db.getFirstAsync<CachedRow>(
    'SELECT * FROM health_profile_cache WHERE user_id = ?',
    userId,
  );
  if (!legacy) return null;
  const migrated = { profile: mapCached(legacy), dirty: Boolean(legacy.dirty) };
  await secureStorage.setItem(cacheKey(userId), JSON.stringify(migrated));
  await db.runAsync('DELETE FROM health_profile_cache WHERE user_id = ?', userId);
  return migrated;
}

async function writeCache(db: SQLiteDatabase, profile: HealthProfile, dirty: boolean) {
  await secureStorage.setItem(cacheKey(profile.userId), JSON.stringify({ profile, dirty }));
  await db.runAsync('DELETE FROM health_profile_cache WHERE user_id = ?', profile.userId);
}

async function pushProfile(profile: HealthProfile) {
  const { data, error } = await supabase
    .from('health_profiles')
    .upsert(
      {
        user_id: profile.userId,
        conditions: profile.conditions,
        allergies: profile.allergies,
        additional_notes: profile.additionalNotes,
        age_years: profile.ageYears,
        weight_kg: profile.weightKg,
        height_cm: profile.heightCm,
        sex: profile.sex,
        pregnancy: profile.pregnancy,
        kidney_function: profile.kidneyFunction,
        liver_function: profile.liverFunction,
        alcohol_use: profile.alcoholUse,
        smoking: profile.smoking,
        onboarding_completed_at: profile.onboardingCompletedAt,
      },
      { onConflict: 'user_id' },
    )
    .select(
      'user_id,conditions,allergies,additional_notes,age_years,weight_kg,height_cm,sex,pregnancy,kidney_function,liver_function,alcohol_use,smoking,onboarding_completed_at,updated_at',
    )
    .single();
  if (error) throw error;
  return mapRemote(data as RemoteRow);
}

export async function loadHealthProfile(userId: string, db: SQLiteDatabase) {
  const cached = await readCache(db, userId);

  if (cached?.dirty) {
    try {
      const synced = await pushProfile(cached.profile);
      await writeCache(db, synced, false);
    } catch {
      return cached.profile;
    }
  }

  const { data, error } = await supabase
    .from('health_profiles')
    .select(
      'user_id,conditions,allergies,additional_notes,age_years,weight_kg,height_cm,sex,pregnancy,kidney_function,liver_function,alcohol_use,smoking,onboarding_completed_at,updated_at',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (cached) return cached.profile;
    throw new Error('Não foi possível acessar seu perfil de saúde.');
  }

  if (!data) {
    const empty: HealthProfile = emptyProfile(userId);
    try {
      const created = await pushProfile(empty);
      await writeCache(db, created, false);
      return created;
    } catch {
      await writeCache(db, empty, true);
      return empty;
    }
  }

  const remote = mapRemote(data as RemoteRow);
  await writeCache(db, remote, false);
  return remote;
}

export async function saveHealthProfile(
  userId: string,
  input: HealthProfileInput,
  onboardingCompletedAt: number | null,
  db: SQLiteDatabase,
) {
  const local: HealthProfile = {
    userId,
    conditions: input.conditions.trim(),
    allergies: input.allergies.trim(),
    additionalNotes: input.additionalNotes.trim(),
    ageYears: validateAge(input.ageYears),
    weightKg: validateWeight(input.weightKg),
    heightCm: validateHeight(input.heightCm),
    sex: input.sex,
    pregnancy: input.pregnancy,
    kidneyFunction: input.kidneyFunction,
    liverFunction: input.liverFunction,
    alcoholUse: input.alcoholUse,
    smoking: input.smoking,
    onboardingCompletedAt,
    updatedAt: Date.now(),
  };
  await writeCache(db, local, true);
  try {
    const remote = await pushProfile(local);
    await writeCache(db, remote, false);
    return { profile: remote, synced: true };
  } catch {
    return { profile: local, synced: false };
  }
}

export function emptyProfile(userId: string): HealthProfile {
  return {
    userId,
    conditions: '',
    allergies: '',
    additionalNotes: '',
    ageYears: null,
    weightKg: null,
    heightCm: null,
    sex: null,
    pregnancy: null,
    kidneyFunction: null,
    liverFunction: null,
    alcoholUse: null,
    smoking: null,
    onboardingCompletedAt: null,
    updatedAt: Date.now(),
  };
}

export async function clearHealthProfileCache(userId: string, db: SQLiteDatabase) {
  await secureStorage.removeItem(cacheKey(userId));
  await db.runAsync('DELETE FROM health_profile_cache WHERE user_id = ?', userId);
}

function validateAge(value: number | null): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value)) return null;
  if (value < 0 || value > 130) return null;
  return value;
}

function validateWeight(value: number | null): number | null {
  if (value === null) return null;
  if (value <= 0 || value > 500) return null;
  return value;
}

function validateHeight(value: number | null): number | null {
  if (value === null) return null;
  if (value <= 0 || value > 260) return null;
  return value;
}
