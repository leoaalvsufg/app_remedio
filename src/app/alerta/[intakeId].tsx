import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MedicinePhoto } from '@/components/medicine-photo';
import { Badge, Button, LoadingState } from '@/components/ui';
import { colors, spacing, type } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import type { IntakeWithMedicine } from '@/types/models';
import { formatTime } from '@/utils/date';

export default function AlertScreen() {
  const params = useLocalSearchParams<{ intakeId: string }>();
  const { service, revision, markTaken, skipIntake, snoozeIntake } = useApp();
  const [intake, setIntake] = useState<IntakeWithMedicine | null | undefined>();
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    service.getIntake(params.intakeId).then(setIntake);
  }, [params.intakeId, revision, service]);

  if (intake === undefined) return <LoadingState />;
  if (!intake) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <Text style={styles.title}>Este lembrete não está mais disponível.</Text>
          <Button onPress={() => router.replace('/(tabs)')}>Voltar ao início</Button>
        </View>
      </SafeAreaView>
    );
  }

  async function take() {
    if (!intake) return;
    setBusy(true);
    await markTaken(intake.id);
    setCompleted(true);
    setBusy(false);
  }

  async function snooze() {
    if (!intake) return;
    setBusy(true);
    await snoozeIntake(intake.id);
    router.replace('/(tabs)');
  }

  async function skip() {
    if (!intake) return;
    setBusy(true);
    await skipIntake(intake.id);
    router.replace('/(tabs)');
  }

  if (completed || intake.status === 'taken') {
    return (
      <SafeAreaView style={styles.successSafeArea}>
        <View style={styles.success}>
          <View accessibilityLabel="Registrado com sucesso" style={styles.successIcon}>
            <Text style={styles.successSymbol}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Registrado!</Text>
          <Text style={styles.successText}>A dose de {intake.medicine.name} foi marcada como tomada.</Text>
          <View accessibilityElementsHidden style={styles.confetti}>
            <Text style={styles.confettiText}>•  +  •  +  •</Text>
          </View>
          <Button onPress={() => router.replace('/(tabs)')}>Voltar ao início</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.alertTop}>
          <Badge tone="danger">LEMBRETE</Badge>
          <MedicinePhoto size={200} uri={intake.medicine.photoUri} />
          <View style={styles.heading}>
            <Text style={styles.title}>Hora de tomar {intake.medicine.name}!</Text>
            <Text style={styles.dosage}>{intake.medicine.dosage}</Text>
            <Text style={styles.time}>Horário: {formatTime(intake.scheduledAt)}</Text>
          </View>
          {intake.snoozeCount > 0 ? <Badge tone="warning">Adiado {intake.snoozeCount} de 3 vezes</Badge> : null}
        </View>

        <View style={styles.actions}>
          <Button loading={busy} onPress={take} style={styles.takeButton} variant="success">Marcar como tomado</Button>
          {intake.snoozeCount < 3 ? (
            <Button disabled={busy} onPress={snooze} variant="secondary">Adiar 10 min</Button>
          ) : (
            <Text accessibilityRole="alert" style={styles.limit}>Você já adiou este lembrete 3 vezes.</Text>
          )}
          <Button disabled={busy} onPress={skip} variant="text">Pular esta dose</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  successSafeArea: { flex: 1, backgroundColor: colors.successSoft },
  content: { flexGrow: 1, width: '100%', maxWidth: 600, alignSelf: 'center', justifyContent: 'space-between', padding: spacing.xl, gap: spacing.xxl },
  alertTop: { flex: 1, minHeight: 430, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  heading: { alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: type.title, lineHeight: 34, fontWeight: '800', textAlign: 'center' },
  dosage: { color: colors.textSecondary, fontSize: type.heading, lineHeight: 28, fontWeight: '600', textAlign: 'center' },
  time: { color: colors.primaryDark, fontSize: type.body, lineHeight: 23, fontWeight: '800' },
  actions: { gap: spacing.md },
  takeButton: { minHeight: 60 },
  limit: { color: colors.danger, fontSize: type.small, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  success: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  successIcon: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  successSymbol: { color: colors.surface, fontSize: 56, lineHeight: 64, fontWeight: '800' },
  successTitle: { color: colors.success, fontSize: 32, lineHeight: 40, fontWeight: '800' },
  successText: { color: colors.textSecondary, fontSize: type.body, lineHeight: 24, textAlign: 'center' },
  confetti: { paddingVertical: spacing.sm },
  confettiText: { color: colors.primary, fontSize: 24, letterSpacing: 5 },
});
