import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MedicinePhoto } from '@/components/medicine-photo';
import { Badge, Button, Card, LoadingState } from '@/components/ui';
import { colors, spacing, type } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import type { IntakeWithMedicine } from '@/types/models';
import { formatTime } from '@/utils/date';
import { parseIntakeIds } from '@/utils/notification-data';

export default function GroupAlertScreen() {
  const params = useLocalSearchParams<{ intakeIds: string }>();
  const { service, revision, markTaken, skipIntake, snoozeIntake } = useApp();
  const [intakes, setIntakes] = useState<IntakeWithMedicine[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const ids = parseIntakeIds(params.intakeIds);
    Promise.all(ids.map((id) => service.getIntake(id))).then((result) => {
      if (active) setIntakes(result.filter((item): item is IntakeWithMedicine => item !== null));
    });
    return () => {
      active = false;
    };
  }, [params.intakeIds, revision, service]);

  if (!intakes) return <LoadingState />;
  const pending = intakes.filter((intake) => intake.status === 'pending');

  async function run(intakeId: string, action: 'take' | 'snooze' | 'skip') {
    setBusyId(intakeId);
    try {
      if (action === 'take') await markTaken(intakeId);
      else if (action === 'snooze') await snoozeIntake(intakeId);
      else await skipIntake(intakeId);
    } finally {
      setBusyId(null);
    }
  }

  if (!pending.length) {
    return (
      <SafeAreaView style={styles.successSafeArea}>
        <View style={styles.completed}>
          <View style={styles.successIcon}><Text style={styles.successSymbol}>✓</Text></View>
          <Text style={styles.title}>Tudo registrado!</Text>
          <Text style={styles.subtitle}>Você concluiu os medicamentos deste horário.</Text>
          <Button onPress={() => router.replace('/(tabs)')}>Voltar ao início</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Badge tone="danger">LEMBRETE CONJUNTO</Badge>
          <Text style={styles.title}>{pending.length} medicamento{pending.length === 1 ? '' : 's'} neste período</Text>
          <Text style={styles.subtitle}>Registre cada um separadamente. Você pode tomar, adiar ou pular apenas o medicamento desejado.</Text>
        </View>

        <View style={styles.list}>
          {intakes.map((intake) => {
            const isPending = intake.status === 'pending';
            const busy = busyId === intake.id;
            return (
              <Card key={intake.id} style={!isPending && styles.resolvedCard}>
                <View style={styles.medicineRow}>
                  <MedicinePhoto size={64} uri={intake.medicine.photoUri} />
                  <View style={styles.medicineInfo}>
                    <Text style={styles.name}>{intake.medicine.name}</Text>
                    <Text style={styles.dosage}>{intake.medicine.dosage}</Text>
                    <Text style={styles.time}>{formatTime(intake.scheduledAt)}</Text>
                  </View>
                  {!isPending ? <Badge tone={intake.status === 'taken' ? 'success' : 'neutral'}>{intake.status === 'taken' ? 'Tomado' : intake.status === 'snoozed' ? 'Adiado' : 'Pulado'}</Badge> : null}
                </View>
                {isPending ? (
                  <View style={styles.actions}>
                    <Button compact loading={busy} disabled={busyId !== null} onPress={() => run(intake.id, 'take')} variant="success">Tomado</Button>
                    {intake.snoozeCount < 3 ? <Button compact disabled={busyId !== null} onPress={() => run(intake.id, 'snooze')} variant="secondary">Adiar 10 min</Button> : null}
                    <Button compact disabled={busyId !== null} onPress={() => run(intake.id, 'skip')} variant="text">Pular</Button>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  successSafeArea: { flex: 1, backgroundColor: colors.successSoft },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.xl },
  heading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  title: { color: colors.text, fontSize: type.title, lineHeight: 34, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontSize: type.body, lineHeight: 24, textAlign: 'center' },
  list: { gap: spacing.md },
  resolvedCard: { opacity: 0.72 },
  medicineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  medicineInfo: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: type.heading, lineHeight: 27, fontWeight: '800' },
  dosage: { color: colors.textSecondary, fontSize: type.body, lineHeight: 22 },
  time: { color: colors.primaryDark, fontSize: type.small, lineHeight: 20, fontWeight: '800' },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  completed: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  successIcon: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  successSymbol: { color: colors.surface, fontSize: 56, lineHeight: 64, fontWeight: '800' },
});
