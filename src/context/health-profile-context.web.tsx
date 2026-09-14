import { createContext, type PropsWithChildren, useContext, useEffect, useEffectEvent, useState } from 'react';

import { secureStorage, supabase } from '@/lib/supabase';
import type { HealthProfile, HealthProfileInput } from '@/types/health-profile';
import { emptyProfile } from '@/services/health-profile-service';
import { useAuth } from './auth-context';

interface HealthProfileContextValue {
  profile: HealthProfile | null;
  loading: boolean;
  error: string | null;
  save(input: HealthProfileInput, completeOnboarding?: boolean): Promise<boolean>;
  refresh(): Promise<void>;
  clearCache(): Promise<void>;
}

const HealthProfileContext = createContext<HealthProfileContextValue | null>(null);

const PROFILE_COLUMNS =
  'conditions,allergies,additional_notes,age_years,weight_kg,height_cm,sex,pregnancy,kidney_function,liver_function,alcohol_use,smoking,onboarding_completed_at,updated_at';

function cacheKey(userId: string) {
  return `health-profile-${userId}`;
}

function mapProfile(userId: string, row: Record<string, unknown> | null): HealthProfile {
  if (!row) return emptyProfile(userId);
  const num = (key: string): number | null => {
    const value = row[key];
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const enumValue = <T extends string>(key: string, allowed: readonly T[]): T | null => {
    const value = row[key];
    if (typeof value !== 'string') return null;
    return (allowed as readonly string[]).includes(value) ? (value as T) : null;
  };
  return {
    userId,
    conditions: typeof row.conditions === 'string' ? row.conditions : '',
    allergies: typeof row.allergies === 'string' ? row.allergies : '',
    additionalNotes: typeof row.additional_notes === 'string' ? row.additional_notes : '',
    ageYears: num('age_years'),
    weightKg: num('weight_kg'),
    heightCm: num('height_cm'),
    sex: enumValue('sex', ['female', 'male', 'intersex', 'prefer_not_to_say']),
    pregnancy: enumValue('pregnancy', [
      'not_applicable',
      'possibly_pregnant',
      'pregnant',
      'breastfeeding',
      'unknown',
    ]),
    kidneyFunction: enumValue('kidney_function', [
      'normal',
      'mild_impairment',
      'moderate_impairment',
      'severe_impairment',
      'unknown',
    ]),
    liverFunction: enumValue('liver_function', [
      'normal',
      'mild_impairment',
      'moderate_impairment',
      'severe_impairment',
      'unknown',
    ]),
    alcoholUse: enumValue('alcohol_use', ['none', 'occasional', 'regular', 'unknown']),
    smoking: enumValue('smoking', ['none', 'occasional', 'regular', 'unknown']),
    onboardingCompletedAt: num('onboarding_completed_at'),
    updatedAt: num('updated_at') ?? Date.now(),
  };
}

export function HealthProfileProvider({ children }: PropsWithChildren) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!user) return;
    const cached = await secureStorage.getItem(cacheKey(user.id));
    if (cached) {
      try {
        const value = JSON.parse(cached) as { profile?: HealthProfile };
        if (value.profile) setProfile(value.profile);
      } catch {}
    }
    const { data, error: remoteError } = await supabase
      .from('health_profiles')
      .select(PROFILE_COLUMNS)
      .eq('user_id', user.id)
      .maybeSingle();
    if (remoteError) {
      setError('Não foi possível acessar seu perfil de saúde.');
    } else {
      const next = mapProfile(user.id, data);
      setProfile(next);
      setError(null);
      await secureStorage.setItem(cacheKey(user.id), JSON.stringify({ profile: next, dirty: false }));
    }
    setLoadedUserId(user.id);
  }

  const loadCurrentProfile = useEffectEvent(refresh);

  useEffect(() => {
    if (!authLoading && user) void Promise.resolve().then(() => loadCurrentProfile());
  }, [authLoading, user]);

  async function save(input: HealthProfileInput, completeOnboarding = false) {
    if (!user) throw new Error('Entre na sua conta para salvar seu perfil de saúde.');
    const completion = completeOnboarding
      ? profile?.onboardingCompletedAt ?? Date.now()
      : profile?.onboardingCompletedAt ?? null;
    const local: HealthProfile = {
      userId: user.id,
      conditions: input.conditions.trim(),
      allergies: input.allergies.trim(),
      additionalNotes: input.additionalNotes.trim(),
      ageYears: input.ageYears,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      sex: input.sex,
      pregnancy: input.pregnancy,
      kidneyFunction: input.kidneyFunction,
      liverFunction: input.liverFunction,
      alcoholUse: input.alcoholUse,
      smoking: input.smoking,
      onboardingCompletedAt: completion,
      updatedAt: Date.now(),
    };
    setProfile(local);
    await secureStorage.setItem(cacheKey(user.id), JSON.stringify({ profile: local, dirty: true }));
    const { data, error: remoteError } = await supabase
      .from('health_profiles')
      .upsert(
        {
          user_id: user.id,
          conditions: local.conditions,
          allergies: local.allergies,
          additional_notes: local.additionalNotes,
          age_years: local.ageYears,
          weight_kg: local.weightKg,
          height_cm: local.heightCm,
          sex: local.sex,
          pregnancy: local.pregnancy,
          kidney_function: local.kidneyFunction,
          liver_function: local.liverFunction,
          alcohol_use: local.alcoholUse,
          smoking: local.smoking,
          onboarding_completed_at: completion,
        },
        { onConflict: 'user_id' },
      )
      .select(PROFILE_COLUMNS)
      .single();
    if (remoteError) return false;
    const synced = mapProfile(user.id, data as Record<string, unknown>);
    setProfile(synced);
    await secureStorage.setItem(cacheKey(user.id), JSON.stringify({ profile: synced, dirty: false }));
    return true;
  }

  async function clearCache() {
    if (user) await secureStorage.removeItem(cacheKey(user.id));
    setProfile(null);
    setLoadedUserId(null);
    setError(null);
  }

  return (
    <HealthProfileContext.Provider value={{
      profile: user ? profile : null,
      loading: authLoading || Boolean(user && loadedUserId !== user.id),
      error,
      save,
      refresh,
      clearCache,
    }}>
      {children}
    </HealthProfileContext.Provider>
  );
}

export function useHealthProfile() {
  const value = useContext(HealthProfileContext);
  if (!value) throw new Error('useHealthProfile precisa ser usado dentro de HealthProfileProvider.');
  return value;
}
