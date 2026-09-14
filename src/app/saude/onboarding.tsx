import { router } from 'expo-router';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HealthProfileForm } from '@/components/health-profile-form';
import { LoadingState } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';
import { useHealthProfile } from '@/context/health-profile-context';
import type { HealthProfileInput } from '@/types/health-profile';

export default function HealthOnboardingScreen() {
  const { user } = useAuth();
  const { profile, loading, save } = useHealthProfile();
  const { showToast } = useApp();

  if (!user || loading) return <LoadingState />;

  async function persist(input: HealthProfileInput) {
    try {
      const synced = await save(input, true);
      showToast(synced ? 'Perfil de saúde salvo.' : 'Salvo no aparelho. Será sincronizado quando houver conexão.');
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <HealthProfileForm
        initial={profile}
        onboarding
        onSave={persist}
        onSkip={() => persist({
          conditions: profile?.conditions ?? '',
          allergies: profile?.allergies ?? '',
          additionalNotes: profile?.additionalNotes ?? '',
          ageYears: profile?.ageYears ?? null,
          weightKg: profile?.weightKg ?? null,
          heightCm: profile?.heightCm ?? null,
          sex: profile?.sex ?? null,
          pregnancy: profile?.pregnancy ?? null,
          kidneyFunction: profile?.kidneyFunction ?? null,
          liverFunction: profile?.liverFunction ?? null,
          alcoholUse: profile?.alcoholUse ?? null,
          smoking: profile?.smoking ?? null,
        })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
});
