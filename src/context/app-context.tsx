import type { SQLiteDatabase } from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { MedicineInput } from '@/types/models';
import { SqliteMedicineService, type MedicineService } from '@/services/medicine-service';
import {
  notificationsAllowed,
  requestNotificationPermission,
  resyncNotifications,
} from '@/services/notifications';
import { syncWithCloud, type SyncStatus } from '@/services/cloud-sync';
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

function createService(db: SQLiteDatabase) {
  return new SqliteMedicineService(db);
}

export function AppProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const { user, loading: authLoading } = useAuth();
  const service = useMemo(() => createService(db), [db]);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (authLoading) return;
      if (user) {
        setSyncStatus('syncing');
        const result = await syncWithCloud(user.id, service);
        if (!active) return;
        setSyncStatus(result);
        if (result === 'synced') setLastSyncedAt(Date.now());
      } else {
        const owner = await service.getCacheOwner();
        if (owner) await service.clearUserCache();
        if (__DEV__) await service.seedExample();
        setSyncStatus('offline');
      }
      const enabled = await resyncNotifications(service);
      if (!active) return;
      setNotificationsEnabled(enabled);
      setRevision((value) => value + 1);
      setReady(true);
    }
    bootstrap().catch(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [authLoading, service, user]);

  async function synchronize() {
    if (!user) {
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('syncing');
    const result = await syncWithCloud(user.id, service);
    setSyncStatus(result);
    if (result === 'synced') {
      setLastSyncedAt(Date.now());
      setRevision((value) => value + 1);
    }
  }

  async function syncAndRefresh() {
    const enabled = await resyncNotifications(service);
    setNotificationsEnabled(enabled);
    setRevision((value) => value + 1);
    void synchronize();
  }

  async function enableNotifications() {
    const enabled = await requestNotificationPermission();
    setNotificationsEnabled(enabled);
    if (enabled) await syncAndRefresh();
    return enabled;
  }

  async function createMedicine(input: MedicineInput) {
    const id = await service.createMedicine(input);
    await syncAndRefresh();
    setToast('Medicamento salvo.');
    return id;
  }

  async function updateMedicine(id: string, input: MedicineInput) {
    await service.updateMedicine(id, input);
    await syncAndRefresh();
    setToast('Alterações salvas.');
  }

  async function deleteMedicine(id: string) {
    await service.deleteMedicine(id);
    await syncAndRefresh();
    setToast('Medicamento excluído.');
  }

  async function markTaken(id: string) {
    await service.markTaken(id);
    await syncAndRefresh();
    setToast('Registrado!');
  }

  async function skipIntake(id: string) {
    await service.skipIntake(id);
    await syncAndRefresh();
    setToast('Dose marcada como pulada.');
  }

  async function snoozeIntake(id: string) {
    const childId = await service.snoozeIntake(id);
    await syncAndRefresh();
    setToast('Lembrete adiado por 10 minutos.');
    return childId;
  }

  const dismissToast = useCallback(() => setToast(null), []);

  const value: AppContextValue = {
    service,
    ready,
    revision,
    notificationsEnabled,
    syncStatus,
    lastSyncedAt,
    toast,
    showToast: setToast,
    dismissToast,
    enableNotifications,
    createMedicine,
    updateMedicine,
    deleteMedicine,
    markTaken,
    skipIntake,
    snoozeIntake,
    syncNow: synchronize,
    refresh: () => setRevision((value) => value + 1),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp precisa ser usado dentro de AppProvider.');
  return value;
}

export async function getCurrentNotificationPermission() {
  return notificationsAllowed();
}
