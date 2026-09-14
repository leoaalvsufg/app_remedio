import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MedicineForm } from '@/components/medicine-form';
import { Button, LoadingState } from '@/components/ui';
import { colors, spacing, type } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import type { MedicineWithSchedule } from '@/types/models';

export default function EditMedicineScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { service, updateMedicine } = useApp();
  const [medicine, setMedicine] = useState<MedicineWithSchedule | null | undefined>();

  useEffect(() => {
    service.getMedicine(params.id).then(setMedicine);
  }, [params.id, service]);

  if (medicine === undefined) return <LoadingState />;
  if (!medicine) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.title}>Medicamento não encontrado</Text>
        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  return (
    <MedicineForm
      initial={medicine}
      onSubmit={async (input) => {
        await updateMedicine(medicine.id, input);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  title: { color: colors.text, fontSize: type.heading, fontWeight: '700' },
});
