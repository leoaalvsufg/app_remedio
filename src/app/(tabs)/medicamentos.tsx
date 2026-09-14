import { router } from 'expo-router';
import { useDeferredValue, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { MedicineCard } from '@/components/medicine-card';
import { NotificationBanner } from '@/components/notification-banner';
import { EmptyState, Fab, LoadingState, Screen } from '@/components/ui';
import { colors, radius, spacing, type } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import type { MedicineWithSchedule } from '@/types/models';

export default function MedicinesScreen() {
  const { service, revision } = useApp();
  const [medicines, setMedicines] = useState<MedicineWithSchedule[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase('pt-BR'));

  useEffect(() => {
    let active = true;
    service.listMedicines().then((result) => {
      if (active) {
        setMedicines(result);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [revision, service]);

  const filtered = medicines.filter((medicine) =>
    `${medicine.name} ${medicine.dosage}`.toLocaleLowerCase('pt-BR').includes(deferredSearch),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <NotificationBanner />
        <View style={styles.searchWrap}>
          <TextInput
            accessibilityLabel="Buscar medicamento"
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Buscar medicamento"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            style={styles.search}
            value={search}
          />
        </View>
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            description={search ? 'Tente buscar por outro nome ou dosagem.' : 'Use o botão + para cadastrar o primeiro.'}
            title={search ? 'Nenhum resultado encontrado' : 'Nenhum medicamento cadastrado'}
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((medicine) => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                onPress={() => router.push({ pathname: '/medicamento/[id]', params: { id: medicine.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <Fab onPress={() => router.push('/medicamento/novo')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 112, gap: spacing.lg },
  searchWrap: { backgroundColor: colors.surface, borderRadius: radius.md },
  search: { minHeight: 52, paddingHorizontal: spacing.lg, color: colors.text, fontSize: type.body },
  list: { gap: spacing.md },
});
