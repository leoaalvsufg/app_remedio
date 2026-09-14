import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { MedicineInput } from '@/types/models';
import type { MedicineService } from '@/services/medicine-service';
import { WebMedicineService } from '@/services/web-medicine-service';
import type { SyncStatus } from '@/services/cloud-sync';
import { useAuth } from './auth-context';

interface AppContextValue {
  service: MedicineService;
  ready: boolean;
  revision: number;
  notificationsEnabled: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  toast: string | null;
  showToast(message: string): void;
  dismissToast(): void;
  enableNotifications(): Promise<boolean>;
  createMedicine(input: MedicineInput): Promise<string>;
  updateMedicine(id: string, input: MedicineInput): Promise<void>;
  deleteMedicine(id: string): Promise<void>;
  markTaken(id: string): Promise<void>;
  skipIntake(id: string): Promise<void>;
  snoozeIntake(id: string): Promise<string>;
  syncNow(): Promise<void>;
  refresh(): void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const { user, loading: authLoading } = useAuth();
  const service = useMemo(() => new WebMedicineService(user?.id ?? null), [user?.id]);
  const [revision, setRevision] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    service.regenerateRollingWindow().then(() => {
      setLastSyncedAt(Date.now());
      setRevision((value) => value + 1);
    }).catch(() => {});
  }, [service, user]);

  async function mutate(action: () => Promise<void>, message: string) {
    await action();
    setRevision((value) => value + 1);
    setLastSyncedAt(Date.now());
    setToast(message);
  }

  const dismissToast = useCallback(() => setToast(null), []);

  const value: AppContextValue = {
    service,
    ready: !authLoading,
    revision,
    notificationsEnabled: false,
    syncStatus: user ? 'synced' : 'offline',
    lastSyncedAt,
    toast,
    showToast: setToast,
    dismissToast,
    enableNotifications: async () => false,
    createMedicine: async (input) => {
      const id = await service.createMedicine(input);
      setRevision((current) => current + 1);
      setLastSyncedAt(Date.now());
      setToast('Medicamento salvo.');
      return id;
    },
    updateMedicine: (id, input) => mutate(() => service.updateMedicine(id, input), 'Alterações salvas.'),
    deleteMedicine: (id) => mutate(() => service.deleteMedicine(id), 'Medicamento excluído.'),
    markTaken: (id) => mutate(() => service.markTaken(id), 'Registrado!'),
    skipIntake: (id) => mutate(() => service.skipIntake(id), 'Dose marcada como pulada.'),
    snoozeIntake: async (id) => {
      const childId = await service.snoozeIntake(id);
      setRevision((current) => current + 1);
      setToast('Lembrete adiado por 10 minutos.');
      return childId;
    },
    syncNow: async () => {
      await service.regenerateRollingWindow();
      setLastSyncedAt(Date.now());
      setRevision((current) => current + 1);
    },
    refresh: () => setRevision((current) => current + 1),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp precisa ser usado dentro de AppProvider.');
  return value;
}

export async function getCurrentNotificationPermission() {
  return false;
}
