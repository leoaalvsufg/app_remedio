import { router } from 'expo-router';
import { Alert } from 'react-native';

import { HealthProfileForm } from '@/components/health-profile-form';
import { LoadingState } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { useHealthProfile } from '@/context/health-profile-context';
import type { HealthProfileInput } from '@/types/health-profile';

export default function EditHealthProfileScreen() {
  const { profile, loading, save } = useHealthProfile();
  const { showToast } = useApp();

  if (loading) return <LoadingState />;

  return (
    <HealthProfileForm
      initial={profile}
      onSave={async (input: HealthProfileInput) => {
        try {
          const synced = await save(input);
          showToast(synced ? 'Perfil de saúde atualizado.' : 'Alterações salvas no aparelho.');
          router.back();
        } catch (error) {
          Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
        }
      }}
    />
  );
}
