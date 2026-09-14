import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

import {
  clearHealthProfileCache,
  loadHealthProfile,
  saveHealthProfile,
} from '@/services/health-profile-service';
import type { HealthProfile, HealthProfileInput } from '@/types/health-profile';
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

export function HealthProfileProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!user) {
      setProfile(null);
      setLoadedUserId(null);
      setError(null);
      return;
    }
    try {
      const loaded = await loadHealthProfile(user.id, db);
      setProfile(loaded);
      setLoadedUserId(user.id);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível acessar seu perfil de saúde.');
    } finally {
      setLoadedUserId(user.id);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    async function load() {
      if (!user) {
        if (active) {
          setProfile(null);
          setError(null);
          setLoadedUserId(null);
        }
        return;
      }
      try {
        const loaded = await loadHealthProfile(user.id, db);
        if (active) {
          setProfile(loaded);
          setLoadedUserId(user.id);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível acessar seu perfil de saúde.');
        }
      } finally {
        if (active) setLoadedUserId(user.id);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [authLoading, db, user]);

  async function save(input: HealthProfileInput, completeOnboarding = false) {
    if (!user) throw new Error('Entre na sua conta para salvar seu perfil de saúde.');
    const completion = completeOnboarding
      ? profile?.onboardingCompletedAt ?? Date.now()
      : profile?.onboardingCompletedAt ?? null;
    const result = await saveHealthProfile(user.id, input, completion, db);
    setProfile(result.profile);
    setError(null);
    return result.synced;
  }

  async function clearCache() {
    if (user) await clearHealthProfileCache(user.id, db);
    setProfile(null);
    setLoadedUserId(null);
    setError(null);
  }

  return (
    <HealthProfileContext.Provider
      value={{
        profile,
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
