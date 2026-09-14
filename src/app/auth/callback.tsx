import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LoadingState } from '@/components/ui';
import { colors, spacing, type } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function AuthCallbackScreen() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) router.replace(session ? '/(tabs)' : '/(onboarding)');
  }, [loading, session]);

  return (
    <View style={styles.screen}>
      <LoadingState />
      <Text style={styles.text}>Confirmando sua conta...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl },
  text: { color: colors.textSecondary, fontSize: type.body, textAlign: 'center' },
});
