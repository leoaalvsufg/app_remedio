import { router } from 'expo-router';

import { MedicineForm } from '@/components/medicine-form';
import { useApp } from '@/context/app-context';

export default function NewMedicineScreen() {
  const { createMedicine } = useApp();
  return (
    <MedicineForm
      onSubmit={async (input) => {
        const id = await createMedicine(input);
        router.replace({ pathname: '/medicamento/[id]', params: { id } });
      }}
    />
  );
}
