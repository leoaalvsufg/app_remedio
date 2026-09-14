import NetInfo from '@react-native-community/netinfo';

import { supabase } from '@/lib/supabase';
import type { RemoteChange, SyncMutation } from '@/types/models';
import type { MedicineService } from './medicine-service';

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

let activeSync: Promise<SyncStatus> | null = null;

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const value = error as { code?: unknown; message?: unknown };
    return [value.code, value.message].filter((item) => typeof item === 'string').join(': ') || 'erro desconhecido';
  }
  return 'erro desconhecido';
}

function remoteMedicine(userId: string, payload: Record<string, unknown>, photoPath: string | null) {
  return {
    id: String(payload.id),
    user_id: userId,
    name: String(payload.name ?? ''),
    dosage: String(payload.dosage ?? ''),
    photo_path: photoPath,
    notes: payload.notes ?? null,
    created_at: Number(payload.createdAt),
    updated_at: Number(payload.updatedAt),
  };
}

function remoteSchedule(userId: string, payload: Record<string, unknown>) {
  const updatedAt = Number(payload.updatedAt);
  return {
    id: String(payload.id),
    user_id: userId,
    medicine_id: String(payload.medicineId),
    type: String(payload.type),
    times: Array.isArray(payload.times) ? payload.times : [],
    interval_hours: payload.intervalHours ?? null,
    start_time: payload.startTime ?? null,
    weekdays: Array.isArray(payload.weekdays) ? payload.weekdays : [],
    start_date: Number(payload.startDate),
    end_date: payload.endDate ?? null,
    created_at: Math.min(updatedAt, Date.now()),
    updated_at: updatedAt,
  };
}

function remoteIntake(userId: string, payload: Record<string, unknown>) {
  const updatedAt = Number(payload.updatedAt);
  return {
    id: String(payload.id),
    user_id: userId,
    medicine_id: String(payload.medicineId),
    schedule_id: String(payload.scheduleId),
    scheduled_at: Number(payload.scheduledAt),
    taken_at: payload.takenAt ?? null,
    status: String(payload.status),
    parent_intake_id: null,
    snooze_count: Number(payload.snoozeCount ?? 0),
    created_at: Math.min(updatedAt, Date.now()),
    updated_at: updatedAt,
  };
}

async function uploadMedicinePhoto(
  userId: string,
  mutation: SyncMutation,
  service: MedicineService,
) {
  const payload = mutation.payload;
  if (!payload) return null;
  const currentPath = typeof payload.cloudPhotoPath === 'string' ? payload.cloudPhotoPath : null;
  const photoUri = typeof payload.photoUri === 'string' ? payload.photoUri : null;
  if (!photoUri || photoUri.startsWith('http')) return currentPath;

  const extension = photoUri.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${userId}/${mutation.entityId}.${extension}`;
  const response = await fetch(photoUri);
  if (!response.ok) throw new Error('Não foi possível preparar a foto para sincronização.');
  const bytes = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from('medicine-photos')
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  await service.setCloudPhotoPath(mutation.entityId, path);
  return path;
}

async function pushMutation(userId: string, mutation: SyncMutation, service: MedicineService) {
  if (mutation.operation === 'delete') {
    if (mutation.entity === 'medicine') {
      const { data } = await supabase
        .from('medicines')
        .select('photo_path')
        .eq('id', mutation.entityId)
        .eq('user_id', userId)
        .maybeSingle();
      if (data?.photo_path) await supabase.storage.from('medicine-photos').remove([data.photo_path]);
    }
    const table = mutation.entity === 'medicine' ? 'medicines' : mutation.entity === 'schedule' ? 'schedules' : 'intakes';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', mutation.entityId)
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }

  if (!mutation.payload) return;
  if (mutation.entity === 'medicine') {
    const photoPath = await uploadMedicinePhoto(userId, mutation, service);
    const { error } = await supabase
      .from('medicines')
      .upsert(remoteMedicine(userId, mutation.payload, photoPath), { onConflict: 'id' });
    if (error) throw error;
  } else if (mutation.entity === 'schedule') {
    const { error } = await supabase
      .from('schedules')
      .upsert(remoteSchedule(userId, mutation.payload), { onConflict: 'id' });
    if (error) throw error;
  } else {
    const row = remoteIntake(userId, mutation.payload);
    const { data: existing, error: lookupError } = await supabase
      .from('intakes')
      .select('id')
      .eq('user_id', userId)
      .eq('schedule_id', row.schedule_id)
      .eq('scheduled_at', row.scheduled_at)
      .maybeSingle();
    if (lookupError) throw lookupError;
    const query = existing?.id
      ? supabase
          .from('intakes')
          .update({
            taken_at: row.taken_at,
            status: row.status,
            snooze_count: row.snooze_count,
            updated_at: row.updated_at,
          })
          .eq('id', existing.id)
          .eq('user_id', userId)
      : supabase.from('intakes').insert(row);
    const { error } = await query;
    if (error) throw error;
  }
}

async function pullChanges(userId: string, service: MedicineService) {
  let hasMore = true;
  while (hasMore) {
    const cursor = await service.getSyncCursor();
    const { data, error } = await supabase
      .from('sync_changes')
      .select('seq,entity,entity_id,operation,payload')
      .eq('user_id', userId)
      .gt('seq', cursor)
      .order('seq', { ascending: true })
      .limit(250);
    if (error) throw error;
    const changes = (data ?? []) as RemoteChange[];
    await service.applyRemoteChanges(changes);
    hasMore = changes.length === 250;
  }
}

async function refreshSignedPhotoUrls(service: MedicineService) {
  const photos = await service.listCloudPhotos();
  for (const photo of photos) {
    if (photo.photoUri?.startsWith('file:')) continue;
    const { data, error } = await supabase.storage
      .from('medicine-photos')
      .createSignedUrl(photo.cloudPhotoPath, 60 * 60);
    if (!error && data?.signedUrl) await service.setRemotePhotoUri(photo.id, data.signedUrl);
  }
}

async function performSync(userId: string, service: MedicineService): Promise<SyncStatus> {
  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) return 'offline';

  const owner = await service.getCacheOwner();
  if (owner && owner !== userId) await service.clearUserCache();
  if (owner !== userId) {
    await service.queueFullSnapshot();
    await service.setCacheOwner(userId);
  }

  let mutations = await service.getSyncMutations();
  if (mutations.some((mutation) => mutation.entity === 'intake' && mutation.operation === 'upsert')) {
    await service.queueFullSnapshot();
    mutations = await service.getSyncMutations();
  }
  for (const mutation of mutations) {
    await pushMutation(userId, mutation, service);
    await service.acknowledgeMutations([mutation.id]);
  }
  await pullChanges(userId, service);
  await refreshSignedPhotoUrls(service);
  await service.regenerateRollingWindow();
  return 'synced';
}

export function syncWithCloud(userId: string, service: MedicineService) {
  if (activeSync) return activeSync;
  activeSync = performSync(userId, service)
    .catch((error: unknown) => {
      console.warn(
        'Falha na sincronização:',
        safeErrorMessage(error),
      );
      return 'error' as const;
    })
    .finally(() => {
      activeSync = null;
    });
  return activeSync;
}
