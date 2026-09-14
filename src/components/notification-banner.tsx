import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { Button } from './ui';

export function NotificationBanner() {
  const { notificationsEnabled, enableNotifications, showToast } = useApp();
  if (notificationsEnabled || Platform.OS === 'web') return null;

  async function activate() {
    const enabled = await enableNotifications();
    if (!enabled) {
      showToast('Ative as notificações nas configurações do aparelho.');
      await Linking.openSettings();
    }
  }

  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Notificações desativadas</Text>
        <Text style={styles.text}>Ative os avisos para não perder seus horários.</Text>
      </View>
      <Button compact onPress={activate} variant="secondary">Ativar</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#B8D9FF',
    backgroundColor: '#E6F2FF',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textWrap: { flex: 1, gap: 2 },
  title: { color: colors.primaryDark, fontSize: type.small, lineHeight: 20, fontWeight: '800' },
  text: { color: colors.textSecondary, fontSize: type.caption, lineHeight: 17 },
});
