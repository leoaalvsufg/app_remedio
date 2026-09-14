import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MedicinePhoto } from '@/components/medicine-photo';
import { scheduleSummary } from '@/components/medicine-card';
import { Badge, Button, Card, EmptyState, LoadingState, Screen } from '@/components/ui';
import { colors, radius, spacing, type } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { deleteStoredPhoto } from '@/services/photos';
import type { IntakeWithMedicine, MedicineWithSchedule } from '@/types/models';
import { formatDateTime } from '@/utils/date';

type DetailTab = 'history' | 'upcoming';

function statusDisplay(status: IntakeWithMedicine['status']) {
  if (status === 'taken') return { label: 'Tomado', symbol: '✓', tone: 'success' as const };
  if (status === 'skipped') return { label: 'Pulado', symbol: '×', tone: 'neutral' as const };
  if (status === 'snoozed') return { label: 'Adiado', symbol: '↷', tone: 'warning' as const };
  return { label: 'Pendente', symbol: '•', tone: 'primary' as const };
}

function DoseRow({ intake }: { intake: IntakeWithMedicine }) {
  const display = statusDisplay(intake.status);
  return (
    <View style={styles.doseRow}>
      <View style={styles.doseText}>
        <Text style={styles.doseDate}>{formatDateTime(intake.scheduledAt)}</Text>
        {intake.takenAt ? <Text style={styles.takenAt}>Registrado às {formatDateTime(intake.takenAt).split(' ')[1]}</Text> : null}
      </View>
      <Badge tone={display.tone}>{display.symbol} {display.label}</Badge>
    </View>
  );
}

export default function MedicineDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { service, revision, deleteMedicine } = useApp();
  const [medicine, setMedicine] = useState<MedicineWithSchedule | null | undefined>();
  const [history, setHistory] = useState<IntakeWithMedicine[]>([]);
  const [upcoming, setUpcoming] = useState<IntakeWithMedicine[]>([]);
  const [tab, setTab] = useState<DetailTab>('history');

  useEffect(() => {
    let active = true;
    Promise.all([
      service.getMedicine(params.id),
      service.listHistory(params.id),
      service.listUpcoming(params.id),
    ]).then(([medicineResult, historyResult, upcomingResult]) => {
      if (!active) return;
      setMedicine(medicineResult);
      setHistory(historyResult);
      setUpcoming(upcomingResult);
    });
    return () => {
      active = false;
    };
  }, [params.id, revision, service]);

  if (medicine === undefined) return <LoadingState />;
  if (!medicine) {
    return (
      <Screen>
        <EmptyState
          action={<Button onPress={() => router.replace('/(tabs)/medicamentos')}>Ver medicamentos</Button>}
          title="Medicamento não encontrado"
        />
      </Screen>
    );
  }

  function confirmDelete() {
    Alert.alert(
      'Excluir medicamento?',
      `O histórico e os próximos lembretes de ${medicine?.name} serão removidos deste aparelho.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!medicine) return;
            const photo = medicine.photoUri;
            await deleteMedicine(medicine.id);
            deleteStoredPhoto(photo);
            router.replace('/(tabs)/medicamentos');
          },
        },
      ],
    );
  }

  const items = tab === 'history' ? history : upcoming;
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <MedicinePhoto size={240} uri={medicine.photoUri} />
          <View style={styles.identity}>
            <Text style={styles.name}>{medicine.name}</Text>
            <Text style={styles.dosage}>{medicine.dosage}</Text>
          </View>
          <Badge tone="primary">{scheduleSummary(medicine.schedule)}</Badge>
        </View>

        {medicine.notes ? (
          <Card style={styles.notesCard}>
            <Text style={styles.cardTitle}>Observações</Text>
            <Text style={styles.notes}>{medicine.notes}</Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.actionButton}>
            <Button onPress={() => router.push({ pathname: '/medicamento/[id]/editar', params: { id: medicine.id } })} variant="secondary">Editar</Button>
          </View>
          <View style={styles.actionButton}>
            <Button onPress={confirmDelete} variant="danger">Excluir</Button>
          </View>
        </View>

        <View accessibilityRole="tablist" style={styles.tabs}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'history' }} onPress={() => setTab('history')} style={[styles.tab, tab === 'history' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>Histórico</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'upcoming' }} onPress={() => setTab('upcoming')} style={[styles.tab, tab === 'upcoming' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>Próximas doses</Text>
          </Pressable>
        </View>

        <Card style={styles.listCard}>
          {items.length ? items.map((intake, index) => (
            <View key={intake.id}>
              <DoseRow intake={intake} />
              {index < items.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          )) : (
            <View style={styles.emptyList}>
              <Text style={styles.emptyTitle}>{tab === 'history' ? 'Nenhum registro nos últimos 30 dias' : 'Nenhuma próxima dose'}</Text>
              <Text style={styles.emptyText}>{tab === 'history' ? 'As doses tomadas ou puladas aparecerão aqui.' : 'Confira a frequência ou a data final deste medicamento.'}</Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.md },
  identity: { alignItems: 'center', gap: 3 },
  name: { color: colors.text, fontSize: 28, lineHeight: 36, fontWeight: '800', textAlign: 'center' },
  dosage: { color: colors.textSecondary, fontSize: type.body, lineHeight: 23, textAlign: 'center' },
  notesCard: { gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: type.body, lineHeight: 22, fontWeight: '800' },
  notes: { color: colors.textSecondary, fontSize: type.body, lineHeight: 24 },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionButton: { flex: 1 },
  tabs: { flexDirection: 'row', borderRadius: radius.md, backgroundColor: colors.disabledSurface, padding: 4 },
  tab: { flex: 1, minHeight: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.textSecondary, fontSize: type.small, fontWeight: '700' },
  tabTextActive: { color: colors.primaryDark },
  listCard: { padding: 0, overflow: 'hidden' },
  doseRow: { minHeight: 72, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  doseText: { flex: 1, gap: 2 },
  doseDate: { color: colors.text, fontSize: type.body, lineHeight: 22, fontWeight: '700' },
  takenAt: { color: colors.textSecondary, fontSize: type.caption, lineHeight: 17 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg, backgroundColor: colors.border },
  emptyList: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: type.body, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: type.small, lineHeight: 20, textAlign: 'center' },
});
