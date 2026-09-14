import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type ViewStyle,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cardShadow, colors, maxContentWidth, radius, spacing, type } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'text';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

const buttonColors: Record<ButtonVariant, { background: string; border: string; text: string }> = {
  primary: { background: colors.primary, border: colors.primary, text: colors.surface },
  secondary: { background: colors.surface, border: colors.primary, text: colors.primary },
  success: { background: colors.success, border: colors.success, text: colors.surface },
  danger: { background: colors.surface, border: colors.danger, text: colors.danger },
  text: { background: 'transparent', border: 'transparent', text: colors.primary },
};

export function Button({
  children,
  variant = 'primary',
  loading = false,
  compact = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const palette = buttonColors[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.background, borderColor: palette.border },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.buttonText, { color: palette.text }]}>{children}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  optional?: boolean;
}

export function Field({ label, error, optional, style, ...props }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (opcional)</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, props.multiline && styles.multiline, error && styles.inputError, style]}
        {...props}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type BadgeTone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning';

const badgePalette: Record<BadgeTone, { background: string; text: string }> = {
  neutral: { background: colors.disabledSurface, text: colors.textSecondary },
  primary: { background: '#E6F2FF', text: colors.primaryDark },
  success: { background: colors.successSoft, text: colors.success },
  danger: { background: colors.dangerSoft, text: colors.danger },
  warning: { background: colors.warningSoft, text: colors.warning },
};

export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: BadgeTone }>) {
  const palette = badgePalette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{children}</Text>
    </View>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View accessibilityElementsHidden style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>+</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
      {action}
    </View>
  );
}

export function LoadingState() {
  return (
    <View accessibilityLabel="Carregando" style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function Screen({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <View style={[styles.screenContent, style]}>{children}</View>
    </SafeAreaView>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Fab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Adicionar medicamento"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
      <Text style={styles.fabText}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { flex: 1, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: Platform.select({ web: 1, default: 2 }),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: { minHeight: 44, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  buttonText: { fontSize: type.body, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...cardShadow,
  },
  fieldWrap: { gap: spacing.sm },
  label: { color: colors.text, fontSize: type.small, lineHeight: 20, fontWeight: '700' },
  optional: { color: colors.textSecondary, fontWeight: '400' },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: type.body,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger, borderWidth: 2 },
  error: { color: colors.danger, fontSize: type.small, lineHeight: 20 },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: type.caption, lineHeight: 16, fontWeight: '700' },
  empty: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E6F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: { color: colors.primary, fontSize: 44, lineHeight: 48, fontWeight: '300' },
  emptyTitle: { color: colors.text, fontSize: type.heading, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  emptyDescription: { color: colors.textSecondary, fontSize: type.body, lineHeight: 23, textAlign: 'center' },
  loading: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.text, fontSize: type.heading, lineHeight: 28, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...cardShadow,
  },
  fabText: { color: colors.surface, fontSize: 38, lineHeight: 42, fontWeight: '300' },
});
