import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IntakeCard } from '@/components/medicine-card';
import { NotificationBanner } from '@/components/notification-banner';
import { Button, Card, EmptyState, Fab, LoadingState, Screen } from '@/components/ui';
import { colors, radius, spacing, type } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { triggerAlarm } from '@/services/alarm-sound';
import type { IntakeWithMedicine } from '@/types/models';
import { addDays, formatLongDate, isToday, startOfDay } from '@/utils/date';

export default function DashboardScreen() {
  const { service, revision, markTaken, refresh, showToast } = useApp();
  const [today] = useState(() => startOfDay(Date.now()));
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [intakes, setIntakes] = useState<IntakeWithMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    service.listDayIntakes(day).then((result) => {
      if (active) {
        setIntakes(result);
        setLoading(false);
        setRefreshing(false);
      }
    });
    return () => {
      active = false;
    };
  }, [day, revision, service]);

  const taken = intakes.filter((item) => item.status === 'taken').length;
  const progress = intakes.length ? taken / intakes.length : 0;
  const minDay = addDays(today, -7);
  const maxDay = addDays(today, 7);

  function changeDay(offset: number) {
    const next = addDays(day, offset);
    if (next >= minDay && next <= maxDay) {
      setLoading(true);
      setDay(next);
    }
  }

  function testAlarm() {
    triggerAlarm();
    const next = intakes[0] ?? null;
    if (next) {
      router.push({ pathname: '/alerta/[intakeId]', params: { intakeId: next.id } });
    } else {
      showToast('Nenhum medicamento para alarmar.');
    }
  }

  function testToast() {
    showToast(`Toast de teste às ${new Date().toLocaleTimeString('pt-BR')}`);
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh(); }} tintColor={colors.primary} />}>
        <NotificationBanner />
        <View style={styles.dateHeader}>
          <Pressable accessibilityLabel="Dia anterior" accessibilityRole="button" disabled={day <= minDay} onPress={() => changeDay(-1)} style={[styles.dateButton, day <= minDay && styles.disabled]}>
            <Text style={styles.dateButtonText}>‹</Text>
          </Pressable>
          <View style={styles.dateTextWrap}>
            <Text style={styles.date}>{formatLongDate(day)}</Text>
            <Text style={styles.dateHint}>{isToday(day) ? 'Hoje' : 'Toque nas setas para mudar o dia'}</Text>
          </View>
          <Pressable accessibilityLabel="Próximo dia" accessibilityRole="button" disabled={day >= maxDay} onPress={() => changeDay(1)} style={[styles.dateButton, day >= maxDay && styles.disabled]}>
            <Text style={styles.dateButtonText}>›</Text>
          </Pressable>
        </View>

        {intakes.length > 0 ? (
          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progresso do dia</Text>
              <Text style={styles.progressCount}>{taken} de {intakes.length} tomados</Text>
            </View>
            <View accessibilityLabel={`${Math.round(progress * 100)} por cento concluído`} accessibilityRole="progressbar" style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </Card>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : intakes.length === 0 ? (
          <EmptyState
            action={<Button onPress={() => router.push('/medicamento/novo')}>Adicionar medicamento</Button>}
            description="Cadastre um medicamento para organizar seus próximos horários."
            title="Nenhum medicamento hoje"
          />
        ) : (
          <View style={styles.list}>
            {intakes.map((intake) => (
              <IntakeCard
                intake={intake}
                key={intake.id}
                onPress={() => router.push({ pathname: '/medicamento/[id]', params: { id: intake.medicineId } })}
                onTaken={() => markTaken(intake.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      {__DEV__ ? (
        <View style={styles.devRow}>
          <Button compact variant="secondary" onPress={testAlarm}>Testar alarme</Button>
          <Button compact variant="text" onPress={testToast}>Testar toast</Button>
        </View>
      ) : null}
      <Fab onPress={() => router.push('/medicamento/novo')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 112, gap: spacing.lg },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dateButtonText: { color: colors.primary, fontSize: 36, lineHeight: 40, fontWeight: '400' },
  disabled: { opacity: 0.35 },
  dateTextWrap: { flex: 1, alignItems: 'center', gap: 2 },
  date: { color: colors.text, fontSize: 18, lineHeight: 25, fontWeight: '800', textAlign: 'center' },
  dateHint: { color: colors.textSecondary, fontSize: type.caption, lineHeight: 17, textAlign: 'center' },
  progressCard: { gap: spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  progressLabel: { color: colors.text, fontSize: type.body, fontWeight: '700' },
  progressCount: { color: colors.textSecondary, fontSize: type.small, fontWeight: '600' },
  progressTrack: { height: 12, backgroundColor: colors.disabledSurface, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: radius.pill },
  list: { gap: spacing.md },
  devRow: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 88,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
});
