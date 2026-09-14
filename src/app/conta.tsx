import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { colors, radius, spacing, type } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useApp } from '@/context/app-context';
import { useHealthProfile } from '@/context/health-profile-context';
import type { IntakeWithMedicine } from '@/types/models';
import { addDays, formatDateTime } from '@/utils/date';

const ANTHROPOMETRIC_LABELS: Record<string, string> = {
  ageYears: 'Idade',
  weightKg: 'Peso',
  heightCm: 'Altura',
};

function describeAnthropometrics(profile: ReturnType<typeof useHealthProfile>['profile']) {
  if (!profile) return [] as { label: string; value: string }[];
  const items: { label: string; value: string }[] = [];
  if (profile.ageYears !== null) items.push({ label: ANTHROPOMETRIC_LABELS.ageYears, value: `${profile.ageYears} anos` });
  if (profile.weightKg !== null) items.push({ label: ANTHROPOMETRIC_LABELS.weightKg, value: `${profile.weightKg.toFixed(1).replace(/\.0$/, '')} kg` });
  if (profile.heightCm !== null) items.push({ label: ANTHROPOMETRIC_LABELS.heightCm, value: `${profile.heightCm} cm` });
  return items;
}

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const { service, syncStatus, lastSyncedAt, syncNow } = useApp();
  const { profile, loading: healthLoading, error: healthError, refresh, clearCache } = useHealthProfile();
  const [recentIntakes, setRecentIntakes] = useState<IntakeWithMedicine[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }
    let active = true;
    const since = addDays(Date.now(), -30);
    service.listRecentIntakes(since, Date.now()).then((rows) => {
      if (active) setRecentIntakes(rows);
    }).catch(() => {
      if (active) setRecentIntakes([]);
    });
    return () => {
      active = false;
    };
  }, [service, user, lastSyncedAt]);

  async function leave() {
    try {
      await signOut();
      await service.clearUserCache();
      await clearCache();
      router.replace('/(onboarding)');
    } catch (error) {
      Alert.alert('Não foi possível sair', error instanceof Error ? error.message : 'Tente novamente.');
    }
  }

  const anthropometrics = describeAnthropometrics(profile);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.label}>Conta conectada</Text>
          <Text style={styles.email}>{user?.email ?? 'Modo offline'}</Text>
          <Text style={styles.hint}>{user ? 'Seus dados podem ser sincronizados entre aparelhos.' : 'Entre em uma conta para ativar a sincronização e o assistente.'}</Text>
          {user ? (
            <Text style={styles.syncText}>
              {syncStatus === 'syncing'
                ? 'Sincronizando...'
                : syncStatus === 'synced'
                  ? `Sincronizado${lastSyncedAt ? ` em ${formatDateTime(lastSyncedAt)}` : ''}`
                  : syncStatus === 'offline'
                    ? 'Sem conexão. Alterações salvas no aparelho.'
                    : 'A sincronização precisa ser tentada novamente.'}
            </Text>
          ) : null}
        </Card>
        {user ? (
          <Card style={styles.healthCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Perfil de saúde</Text>
                <Text style={styles.hint}>Usado para personalizar as orientações do assistente.</Text>
              </View>
            </View>
            {healthLoading ? (
              <Text style={styles.hint}>Carregando informações...</Text>
            ) : healthError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>{healthError}</Text>
                <Button compact onPress={refresh} variant="secondary">Tentar novamente</Button>
              </>
            ) : (
              <>
                {anthropometrics.length ? (
                  <View style={styles.metricRow}>
                    {anthropometrics.map((item) => (
                      <View key={item.label} style={styles.metricBox}>
                        <Text style={styles.metricLabel}>{item.label}</Text>
                        <Text style={styles.metricValue}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <View style={styles.healthItem}>
                  <Text style={styles.healthLabel}>Condições</Text>
                  <Text style={styles.healthValue}>{profile?.conditions || 'Nenhuma informada'}</Text>
                </View>
                <View style={styles.healthItem}>
                  <Text style={styles.healthLabel}>Alergias</Text>
                  <Text style={styles.healthValue}>{profile?.allergies || 'Nenhuma informada'}</Text>
                </View>
                <View style={styles.healthItem}>
                  <Text style={styles.healthLabel}>Outras informações</Text>
                  <Text style={styles.healthValue}>{profile?.additionalNotes || 'Nenhuma informada'}</Text>
                </View>
                <Button onPress={() => router.push('/saude/editar' as Href)} variant="secondary">Editar perfil de saúde</Button>
              </>
            )}
          </Card>
        ) : null}
        {user ? (
          <Card style={styles.historyCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Medicamentos tomados (últimos 30 dias)</Text>
                <Text style={styles.hint}>Usado para alertar sobre interações, padrões e orientações.</Text>
              </View>
            </View>
            {recentIntakes.length === 0 ? (
              <Text style={styles.hint}>Nenhum medicamento registrado nos últimos 30 dias.</Text>
            ) : (
              <View style={styles.historyList}>
                {recentIntakes.slice(0, 30).map((intake) => (
                  <View key={intake.id} style={styles.historyRow}>
                    <View style={styles.historyText}>
                      <Text style={styles.historyName}>{intake.medicine.name}</Text>
                      <Text style={styles.historyDosage}>{intake.medicine.dosage}</Text>
                    </View>
                    <View style={styles.historyMeta}>
                      <Text style={styles.historyDate}>{formatDateTime(intake.scheduledAt)}</Text>
                      <Text style={[styles.historyStatus, statusStyle(intake.status)]}>{statusLabel(intake.status)}</Text>
                    </View>
                  </View>
                ))}
                {recentIntakes.length > 30 ? (
                  <Text style={styles.hint}>Exibindo os 30 registros mais recentes.</Text>
                ) : null}
              </View>
            )}
          </Card>
        ) : null}
        {user ? <Button loading={syncStatus === 'syncing'} onPress={syncNow} variant="secondary">Sincronizar agora</Button> : null}
        {user ? <Button onPress={leave} variant="danger">Sair da conta</Button> : <Button onPress={() => router.replace('/(onboarding)')}>Entrar ou criar conta</Button>}
      </ScrollView>
    </Screen>
  );
}

function statusLabel(status: IntakeWithMedicine['status']) {
  if (status === 'taken') return 'Tomado';
  if (status === 'skipped') return 'Pulado';
  if (status === 'snoozed') return 'Adiado';
  return 'Pendente';
}

function statusStyle(status: IntakeWithMedicine['status']) {
  if (status === 'taken') return { color: colors.success };
  if (status === 'skipped') return { color: colors.textSecondary };
  if (status === 'snoozed') return { color: colors.warning };
  return { color: colors.primaryDark };
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.huge },
  card: { gap: spacing.sm },
  label: { color: colors.textSecondary, fontSize: type.small, fontWeight: '700' },
  email: { color: colors.text, fontSize: type.heading, fontWeight: '800' },
  hint: { color: colors.textSecondary, fontSize: type.body, lineHeight: 23 },
  syncText: { color: colors.primaryDark, fontSize: type.small, lineHeight: 20, fontWeight: '700' },
  healthCard: { gap: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionHeading: { flex: 1, gap: spacing.xs },
  sectionTitle: { color: colors.text, fontSize: type.heading, lineHeight: 28, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: spacing.md },
  metricBox: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  metricLabel: { color: colors.textSecondary, fontSize: type.caption, lineHeight: 16, fontWeight: '700' },
  metricValue: { color: colors.text, fontSize: type.heading, lineHeight: 28, fontWeight: '800' },
  healthItem: { gap: spacing.xs },
  healthLabel: { color: colors.textSecondary, fontSize: type.small, lineHeight: 20, fontWeight: '700' },
  healthValue: { color: colors.text, fontSize: type.body, lineHeight: 23 },
  error: { color: colors.danger, fontSize: type.small, lineHeight: 20 },
  historyCard: { gap: spacing.md },
  historyList: { gap: spacing.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  historyText: { flex: 1, gap: 2 },
  historyName: { color: colors.text, fontSize: type.body, fontWeight: '800' },
  historyDosage: { color: colors.textSecondary, fontSize: type.small, lineHeight: 20 },
  historyMeta: { alignItems: 'flex-end', gap: 2 },
  historyDate: { color: colors.textSecondary, fontSize: type.caption, lineHeight: 17 },
  historyStatus: { fontSize: type.caption, lineHeight: 16, fontWeight: '700' },
});
