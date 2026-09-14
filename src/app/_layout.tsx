import { router, Stack, type Href, useSegments } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { LoadingState } from '@/components/ui';
import { ToastHost } from '@/components/toast-host';
import { AppProvider, useApp } from '@/context/app-context';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { HealthProfileProvider, useHealthProfile } from '@/context/health-profile-context';
import { colors } from '@/constants/theme';
import { migrateDatabase } from '@/data/database';
import { useNotificationRouting } from '@/hooks/use-notification-routing';

function AppNavigator() {
  const { ready } = useApp();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: healthLoading } = useHealthProfile();
  const segments = useSegments();
  useNotificationRouting();

  useEffect(() => {
    const segmentList = segments as string[];
    const atRoot = segmentList.length === 0;
    const inHealthOnboarding = segmentList[0] === 'saude' && segmentList[1] === 'onboarding';
    if (
      ready &&
      !authLoading &&
      !healthLoading &&
      user &&
      !profile?.onboardingCompletedAt &&
      !inHealthOnboarding &&
      atRoot
    ) {
      router.replace('/saude/onboarding' as Href);
    }
  }, [authLoading, healthLoading, profile?.onboardingCompletedAt, ready, segments, user]);

  if (!ready) return <LoadingState />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="medicamento/novo" options={{ title: 'Novo medicamento', presentation: 'modal' }} />
        <Stack.Screen name="medicamento/[id]/index" options={{ title: 'Medicamento' }} />
        <Stack.Screen name="medicamento/[id]/editar" options={{ title: 'Editar medicamento', presentation: 'modal' }} />
        <Stack.Screen name="alerta/[intakeId]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="alerta/grupo" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="conta" options={{ title: 'Minha conta', presentation: 'modal' }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="auth/redefinir-senha" options={{ title: 'Nova senha' }} />
        <Stack.Screen name="saude/onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="saude/editar" options={{ title: 'Perfil de saúde', presentation: 'modal' }} />
      </Stack>
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SQLiteProvider
        databaseName={Platform.OS === 'web' ? ':memory:' : 'zelo.db'}
        onInit={migrateDatabase}
        useSuspense>
        <AuthProvider>
          <HealthProfileProvider>
            <AppProvider>
              <AppNavigator />
            </AppProvider>
          </HealthProfileProvider>
        </AuthProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
