import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '@/constants/theme';
import type { IntakeWithMedicine, MedicineWithSchedule, Schedule } from '@/types/models';
import { formatTime, weekdayShort } from '@/utils/date';
import { Badge, Card } from './ui';
import { MedicinePhoto } from './medicine-photo';

export function scheduleSummary(schedule: Schedule) {
  if (schedule.type === 'interval') {
    return `A cada ${schedule.intervalHours} horas, começando às ${schedule.startTime}`;
  }
  const joinedTimes = schedule.times.join(' e ');
  if (schedule.type === 'weekly') {
    return `${schedule.weekdays.map(weekdayShort).join(', ')} às ${joinedTimes}`;
  }
  return `Todos os dias às ${joinedTimes}`;
}

export function scheduleBadge(schedule: Schedule) {
  if (schedule.type === 'interval') return `A cada ${schedule.intervalHours}h`;
  if (schedule.type === 'weekly') return `${schedule.times.length} dose${schedule.times.length === 1 ? '' : 's'} nos dias escolhidos`;
  return `${schedule.times.length} dose${schedule.times.length === 1 ? '' : 's'}/dia`;
}

function intakeDisplay(intake: IntakeWithMedicine) {
  if (intake.status === 'taken') return { label: 'Tomado', tone: 'success' as const, symbol: '✓', overdue: false };
  if (intake.status === 'skipped') return { label: 'Pulado', tone: 'neutral' as const, symbol: '×', overdue: false };
  const overdue = Date.now() - intake.scheduledAt > 30 * 60 * 1000;
  if (overdue) return { label: 'Atrasado', tone: 'danger' as const, symbol: '!', overdue: true };
  return { label: 'Pendente', tone: 'warning' as const, symbol: '•', overdue: false };
}

export function IntakeCard({
  intake,
  onTaken,
  onPress,
}: {
  intake: IntakeWithMedicine;
  onTaken: () => void;
  onPress?: () => void;
}) {
  const display = intakeDisplay(intake);
  const pending = intake.status === 'pending';
  return (
    <Card style={[styles.intakeCard, display.overdue && styles.overdue]}>
      <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={styles.intakeMain}>
        <MedicinePhoto size={56} uri={intake.medicine.photoUri} />
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>{intake.medicine.name}</Text>
          <Text numberOfLines={1} style={styles.dosage}>{intake.medicine.dosage}</Text>
          <View style={styles.meta}>
            <Text style={styles.time}>{formatTime(intake.scheduledAt)}</Text>
            <Badge tone={display.tone}>{display.symbol} {display.label}</Badge>
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`Marcar ${intake.medicine.name} ${intake.medicine.dosage} das ${formatTime(intake.scheduledAt)} como tomado`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: intake.status === 'taken', disabled: !pending }}
        disabled={!pending}
        hitSlop={6}
        onPress={onTaken}
        style={[styles.check, intake.status === 'taken' && styles.checkDone, !pending && intake.status !== 'taken' && styles.checkDisabled]}>
        <Text style={[styles.checkSymbol, intake.status === 'taken' && styles.checkSymbolDone]}>
          {intake.status === 'taken' ? '✓' : ''}
        </Text>
      </Pressable>
    </Card>
  );
}

export function MedicineCard({ medicine, onPress }: { medicine: MedicineWithSchedule; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.medicineCard}>
        <MedicinePhoto size={56} uri={medicine.photoUri} />
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>{medicine.name}</Text>
          <Text numberOfLines={1} style={styles.dosage}>{medicine.dosage}</Text>
          <Badge tone="primary">{scheduleBadge(medicine.schedule)}</Badge>
        </View>
        <Text accessibilityElementsHidden style={styles.chevron}>›</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intakeCard: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  overdue: { borderLeftWidth: 5, borderLeftColor: colors.danger },
  intakeMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  medicineCard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  info: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: colors.text, fontSize: type.body, lineHeight: 22, fontWeight: '800' },
  dosage: { color: colors.textSecondary, fontSize: type.small, lineHeight: 20 },
  meta: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  time: { color: colors.primaryDark, fontSize: type.small, lineHeight: 20, fontWeight: '800' },
  check: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkDisabled: { borderColor: colors.disabled, backgroundColor: colors.disabledSurface },
  checkSymbol: { color: colors.primary, fontSize: 24, lineHeight: 28, fontWeight: '800' },
  checkSymbolDone: { color: colors.surface },
  chevron: { color: colors.textSecondary, fontSize: 32, lineHeight: 36 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.995 }] },
});
