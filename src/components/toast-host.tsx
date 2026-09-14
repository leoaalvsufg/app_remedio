import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useApp } from '@/context/app-context';
import { colors, radius, spacing, type } from '@/constants/theme';

const TOAST_AUTO_DISMISS_MS = 2500;

export function ToastHost() {
  const { toast, dismissToast } = useApp();
  const lastShownRef = useRef<string | null>(null);

  useEffect(() => {
    if (!toast || toast === lastShownRef.current) return undefined;
    lastShownRef.current = toast;
    const timer = setTimeout(() => {
      lastShownRef.current = null;
      dismissToast();
    }, TOAST_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dismissToast, toast]);

  if (!toast) return null;
  return (
    <Pressable
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityHint="Toque para fechar"
      onPress={() => {
        lastShownRef.current = null;
        dismissToast();
      }}
      style={styles.toast}>
      <Text style={styles.text}>{toast}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 92,
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    zIndex: 100,
  },
  text: { color: colors.surface, fontSize: type.body, lineHeight: 22, textAlign: 'center', fontWeight: '600' },
});
