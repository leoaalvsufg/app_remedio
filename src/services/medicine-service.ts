import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import {
  SqliteIntakeRepository,
  SqliteMedicineRepository,
  SqliteScheduleRepository,
} from '@/data/repositories';
import type {
  Intake,
  IntakeWithMedicine,
  Medicine,
  MedicineInput,
  MedicineWithSchedule,
  RemoteChange,
  Schedule,
  SyncEntity,
  SyncMutation,
  SyncOperation,
} from '@/types/models';
import { addDays, endOfDay, startOfDay } from '@/utils/date';
import { createId } from '@/utils/id';
import { generateIntakes, rollingEnd } from './scheduling';

type TransactionExecutor = Pick<SQLiteDatabase, 'runAsync' | 'getFirstAsync'>;

export interface MedicineService {
  listMedicines(): Promise<MedicineWithSchedule[]>;
  getMedicine(id: string): Promise<MedicineWithSchedule | null>;
  createMedicine(input: MedicineInput): Promise<string>;
  updateMedicine(id: string, input: MedicineInput): Promise<void>;
  deleteMedicine(id: string): Promise<void>;
  listDayIntakes(day: number): Promise<IntakeWithMedicine[]>;
  listUpcoming(medicineId: string): Promise<IntakeWithMedicine[]>;
  listHistory(medicineId: string): Promise<IntakeWithMedicine[]>;
  listRecentIntakes(since: number, until: number): Promise<IntakeWithMedicine[]>;
  getIntake(id: string): Promise<IntakeWithMedicine | null>;
  listPendingNotifications(): Promise<IntakeWithMedicine[]>;
  markTaken(id: string): Promise<void>;
  skipIntake(id: string): Promise<void>;
  snoozeIntake(id: string): Promise<string>;
  regenerateRollingWindow(): Promise<void>;
  seedExample(): Promise<void>;
  queueFullSnapshot(): Promise<void>;
  getSyncMutations(): Promise<SyncMutation[]>;
  acknowledgeMutations(ids: string[]): Promise<void>;
  applyRemoteChanges(changes: RemoteChange[]): Promise<void>;
  getSyncCursor(): Promise<number>;
  getCacheOwner(): Promise<string | null>;
  setCacheOwner(userId: string): Promise<void>;
  clearUserCache(): Promise<void>;
  setCloudPhotoPath(medicineId: string, path: string): Promise<void>;
  setRemotePhotoUri(medicineId: string, uri: string): Promise<void>;
  listCloudPhotos(): Promise<{ id: string; cloudPhotoPath: string; photoUri: string | null }[]>;
}

function normalizeInput(input: MedicineInput) {
  return {
    ...input,
    name: input.name.trim(),
    dosage: input.dosage.trim(),
    notes: input.notes.trim(),
    schedule: {
      ...input.schedule,
      times: [...new Set(input.schedule.times)].sort(),
      weekdays: [...new Set(input.schedule.weekdays)].sort((a, b) => a - b),
    },
  };
}

function medicinePayload(medicine: Medicine) {
  return {
    id: medicine.id,
    name: medicine.name,
    dosage: medicine.dosage,
    photoUri: medicine.photoUri,
    cloudPhotoPath: medicine.cloudPhotoPath,
    notes: medicine.notes,
    createdAt: medicine.createdAt,
    updatedAt: medicine.updatedAt,
  };
}

function schedulePayload(schedule: Schedule) {
  return {
    id: schedule.id,
    medicineId: schedule.medicineId,
    type: schedule.type,
    times: schedule.times,
    intervalHours: schedule.intervalHours,
    startTime: schedule.startTime,
    weekdays: schedule.weekdays,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    updatedAt: schedule.updatedAt,
  };
}

function intakePayload(intake: Intake) {
  return {
    id: intake.id,
    medicineId: intake.medicineId,
    scheduleId: intake.scheduleId,
    scheduledAt: intake.scheduledAt,
    takenAt: intake.takenAt,
    status: intake.status,
    parentIntakeId: intake.parentIntakeId,
    snoozeCount: intake.snoozeCount,
    updatedAt: intake.updatedAt,
  };
}

function nullableString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class SqliteMedicineService implements MedicineService {
  private medicines: SqliteMedicineRepository;
  private schedules: SqliteScheduleRepository;
  private intakes: SqliteIntakeRepository;

  constructor(private db: SQLiteDatabase) {
    this.medicines = new SqliteMedicineRepository(db);
    this.schedules = new SqliteScheduleRepository(db);
    this.intakes = new SqliteIntakeRepository(db);
  }

  private runIsolatedTransaction(task: (transaction: TransactionExecutor) => Promise<void>) {
    if (Platform.OS === 'web') {
      return this.db.withTransactionAsync(() => task(this.db));
    }
    return this.db.withExclusiveTransactionAsync((transaction) => task(transaction));
  }

  listMedicines() {
    return this.medicines.list();
  }

  getMedicine(id: string) {
    return this.medicines.get(id);
  }

  async createMedicine(rawInput: MedicineInput) {
    const input = normalizeInput(rawInput);
    const now = Date.now();
    const medicineId = createId();
    const schedule: Schedule = { id: createId(), medicineId, ...input.schedule, updatedAt: now };
    const generated = generateIntakes(
      schedule,
      Math.max(startOfDay(now), schedule.startDate),
      rollingEnd(now),
    );

    await this.db.withTransactionAsync(async () => {
      await this.medicines.insert({
        id: medicineId,
        name: input.name,
        dosage: input.dosage,
        photoUri: input.photoUri,
        cloudPhotoPath: null,
        notes: input.notes || null,
        createdAt: now,
        updatedAt: now,
      });
      await this.schedules.insert(schedule);
      await this.intakes.insertMany(generated);
    });
    const medicine = await this.medicines.get(medicineId);
    if (medicine) {
      await this.enqueue('medicine', medicine.id, 'upsert', medicinePayload(medicine));
      await this.enqueue('schedule', schedule.id, 'upsert', schedulePayload(schedule));
    }
    return medicineId;
  }

  async updateMedicine(id: string, rawInput: MedicineInput) {
    const input = normalizeInput(rawInput);
    const existing = await this.medicines.get(id);
    if (!existing) throw new Error('Medicamento não encontrado.');
    const now = Date.now();
    const schedule: Schedule = {
      id: existing.schedule.id,
      medicineId: id,
      ...input.schedule,
      updatedAt: now,
    };

    await this.db.withTransactionAsync(async () => {
      await this.medicines.update({
        ...existing,
        name: input.name,
        dosage: input.dosage,
        photoUri: input.photoUri,
        notes: input.notes || null,
        updatedAt: now,
      });
      await this.intakes.deleteFuturePending(id, now);
      await this.schedules.update(schedule);
      await this.intakes.insertMany(generateIntakes(schedule, Math.max(now, schedule.startDate), rollingEnd(now)));
    });
    const medicine = await this.medicines.get(id);
    if (medicine) {
      await this.enqueue('medicine', id, 'upsert', medicinePayload(medicine));
      await this.enqueue('schedule', schedule.id, 'upsert', schedulePayload(schedule));
    }
  }

  async deleteMedicine(id: string) {
    await this.db.withTransactionAsync(async () => {
      await this.enqueue('medicine', id, 'delete', null);
      await this.medicines.delete(id);
    });
  }

  listDayIntakes(day: number) {
    return this.intakes.listForRange(startOfDay(day), endOfDay(day));
  }

  listUpcoming(medicineId: string) {
    return this.intakes.listUpcoming(medicineId, Date.now());
  }

  listHistory(medicineId: string) {
    return this.intakes.listHistory(medicineId, addDays(Date.now(), -30));
  }

  async listRecentIntakes(since: number, until: number) {
    const rows = await this.intakes.listForRange(since, until);
    return rows.filter((row) => row.status !== 'pending' && row.status !== 'snoozed');
  }

  getIntake(id: string) {
    return this.intakes.get(id);
  }

  listPendingNotifications() {
    return this.intakes.listPending(Date.now() + 1000, rollingEnd());
  }

  async markTaken(id: string) {
    await this.intakes.updateStatus(id, 'taken', Date.now());
    const intake = await this.intakes.get(id);
    if (intake) await this.enqueue('intake', id, 'upsert', intakePayload(intake));
  }

  async skipIntake(id: string) {
    await this.intakes.updateStatus(id, 'skipped');
    const intake = await this.intakes.get(id);
    if (intake) await this.enqueue('intake', id, 'upsert', intakePayload(intake));
  }

  async snoozeIntake(id: string) {
    const intake = await this.intakes.get(id);
    if (!intake) throw new Error('Dose não encontrada.');
    if (intake.status !== 'pending') throw new Error('Esta dose já foi registrada.');
    if (intake.snoozeCount >= 3) throw new Error('O limite de 3 adiamentos foi atingido.');

    const childId = createId();
    await this.db.withTransactionAsync(async () => {
      await this.intakes.updateStatus(id, 'snoozed');
      await this.intakes.insertMany([
        {
          id: childId,
          medicineId: intake.medicineId,
          scheduleId: intake.scheduleId,
          scheduledAt: Date.now() + 10 * 60 * 1000,
          takenAt: null,
          status: 'pending',
          parentIntakeId: intake.parentIntakeId ?? intake.id,
          snoozeCount: intake.snoozeCount + 1,
          updatedAt: Date.now(),
        },
      ]);
    });
    const snoozed = await this.intakes.get(id);
    if (snoozed) await this.enqueue('intake', id, 'upsert', intakePayload(snoozed));
    return childId;
  }

  async regenerateRollingWindow() {
    const schedules = await this.schedules.list();
    const from = startOfDay(Date.now());
    const to = rollingEnd();
    await this.db.withTransactionAsync(async () => {
      for (const schedule of schedules) {
        await this.intakes.insertMany(generateIntakes(schedule, Math.max(from, schedule.startDate), to));
      }
    });
  }

  async queueFullSnapshot() {
    const medicines = await this.medicines.list();
    for (const medicine of medicines) {
      await this.enqueue('medicine', medicine.id, 'upsert', medicinePayload(medicine));
      await this.enqueue(
        'schedule',
        medicine.schedule.id,
        'upsert',
        schedulePayload(medicine.schedule),
      );
    }
    const history = await this.intakes.listAllNonPending();
    for (const intake of history) {
      await this.enqueue('intake', intake.id, 'upsert', intakePayload(intake));
    }
  }

  async getSyncMutations() {
    await this.db.execAsync(`
      DELETE FROM sync_queue
      WHERE operation = 'upsert'
        AND (
          (entity = 'medicine' AND NOT EXISTS (
            SELECT 1 FROM medicines WHERE medicines.id = sync_queue.entity_id
          ))
          OR (entity = 'schedule' AND NOT EXISTS (
            SELECT 1 FROM schedules
            INNER JOIN medicines ON medicines.id = schedules.medicine_id
            WHERE schedules.id = sync_queue.entity_id
          ))
          OR (entity = 'intake' AND NOT EXISTS (
            SELECT 1 FROM intakes
            INNER JOIN medicines ON medicines.id = intakes.medicine_id
            INNER JOIN schedules ON schedules.id = intakes.schedule_id
            WHERE intakes.id = sync_queue.entity_id
          ))
        );
    `);
    const rows = await this.db.getAllAsync<{
      id: string;
      entity: SyncEntity;
      entity_id: string;
      operation: SyncOperation;
      payload: string | null;
      created_at: number;
    }>(
      `SELECT * FROM sync_queue
       ORDER BY
         CASE entity WHEN 'medicine' THEN 0 WHEN 'schedule' THEN 1 ELSE 2 END,
         created_at,
         id`,
    );
    return rows.map((row) => ({
      id: row.id,
      entity: row.entity,
      entityId: row.entity_id,
      operation: row.operation,
      payload: row.payload ? JSON.parse(row.payload) : null,
      createdAt: row.created_at,
    }));
  }

  async acknowledgeMutations(ids: string[]) {
    if (!ids.length) return;
    const placeholders = ids.map(() => '?').join(',');
    await this.db.runAsync(`DELETE FROM sync_queue WHERE id IN (${placeholders})`, ...ids);
  }

  async applyRemoteChanges(changes: RemoteChange[]) {
    if (!changes.length) return;
    await this.runIsolatedTransaction(async (transaction) => {
      for (const change of changes) {
        if (change.operation === 'delete') {
          if (change.entity === 'medicine') {
            await transaction.runAsync('DELETE FROM medicines WHERE id = ?', change.entity_id);
          } else if (change.entity === 'schedule') {
            await transaction.runAsync('DELETE FROM schedules WHERE id = ?', change.entity_id);
          } else {
            await transaction.runAsync('DELETE FROM intakes WHERE id = ?', change.entity_id);
          }
          continue;
        }

        const payload = change.payload;
        if (!payload) continue;
        if (change.entity === 'medicine') {
          await transaction.runAsync(
            `INSERT INTO medicines
             (id, name, dosage, photo_uri, cloud_photo_path, notes, created_at, updated_at)
             VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               dosage = excluded.dosage,
               cloud_photo_path = excluded.cloud_photo_path,
               notes = excluded.notes,
               created_at = excluded.created_at,
               updated_at = excluded.updated_at
             WHERE excluded.updated_at >= medicines.updated_at`,
            String(payload.id ?? change.entity_id),
            String(payload.name ?? ''),
            String(payload.dosage ?? ''),
            nullableString(payload.photo_path),
            nullableString(payload.notes),
            numeric(payload.created_at),
            numeric(payload.updated_at),
          );
        } else if (change.entity === 'schedule') {
          await transaction.runAsync(
            `INSERT INTO schedules
             (id, medicine_id, type, times, interval_hours, start_time, weekdays,
              start_date, end_date, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               medicine_id = excluded.medicine_id,
               type = excluded.type,
               times = excluded.times,
               interval_hours = excluded.interval_hours,
               start_time = excluded.start_time,
               weekdays = excluded.weekdays,
               start_date = excluded.start_date,
               end_date = excluded.end_date,
               updated_at = excluded.updated_at
             WHERE excluded.updated_at >= schedules.updated_at`,
            String(payload.id ?? change.entity_id),
            String(payload.medicine_id ?? ''),
            String(payload.type ?? 'fixed_times'),
            JSON.stringify(Array.isArray(payload.times) ? payload.times : []),
            payload.interval_hours === null ? null : numeric(payload.interval_hours),
            nullableString(payload.start_time),
            JSON.stringify(Array.isArray(payload.weekdays) ? payload.weekdays : []),
            numeric(payload.start_date),
            payload.end_date === null ? null : numeric(payload.end_date),
            numeric(payload.updated_at),
          );
        } else {
          const remoteScheduleId = String(payload.schedule_id ?? '');
          const remoteScheduledAt = numeric(payload.scheduled_at);
          const matching = await transaction.getFirstAsync<{ id: string }>(
            `SELECT id FROM intakes WHERE schedule_id = ? AND scheduled_at = ?`,
            remoteScheduleId,
            remoteScheduledAt,
          );
          await transaction.runAsync(
            `INSERT INTO intakes
             (id, medicine_id, schedule_id, scheduled_at, taken_at, status,
              parent_intake_id, snooze_count, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               medicine_id = excluded.medicine_id,
               schedule_id = excluded.schedule_id,
               scheduled_at = excluded.scheduled_at,
               taken_at = excluded.taken_at,
               status = excluded.status,
               parent_intake_id = excluded.parent_intake_id,
               snooze_count = excluded.snooze_count,
               updated_at = excluded.updated_at
             WHERE excluded.updated_at >= intakes.updated_at`,
            matching?.id ?? String(payload.id ?? change.entity_id),
            String(payload.medicine_id ?? ''),
            remoteScheduleId,
            remoteScheduledAt,
            payload.taken_at === null ? null : numeric(payload.taken_at),
            String(payload.status ?? 'pending'),
            null,
            numeric(payload.snooze_count),
            numeric(payload.updated_at),
          );
        }
      }
      const cursor = Math.max(...changes.map((change) => change.seq));
      await transaction.runAsync(
        `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('sync_cursor', ?)`,
        String(cursor),
      );
    });
  }

  async getSyncCursor() {
    const row = await this.db.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = 'sync_cursor'`,
    );
    return numeric(row?.value);
  }

  async getCacheOwner() {
    const row = await this.db.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = 'cache_owner'`,
    );
    return row?.value ?? null;
  }

  async setCacheOwner(userId: string) {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('cache_owner', ?)`,
      userId,
    );
  }

  async clearUserCache() {
    await this.runIsolatedTransaction(async (transaction) => {
      await transaction.runAsync('DELETE FROM medicines');
      await transaction.runAsync('DELETE FROM sync_queue');
      await transaction.runAsync(`DELETE FROM app_meta WHERE key IN ('cache_owner', 'sync_cursor')`);
    });
  }

  async setCloudPhotoPath(medicineId: string, path: string) {
    await this.db.runAsync('UPDATE medicines SET cloud_photo_path = ? WHERE id = ?', path, medicineId);
  }

  async setRemotePhotoUri(medicineId: string, uri: string) {
    await this.db.runAsync(
      `UPDATE medicines SET photo_uri = ?
       WHERE id = ? AND (photo_uri IS NULL OR photo_uri LIKE 'http%')`,
      uri,
      medicineId,
    );
  }

  async listCloudPhotos() {
    const rows = await this.db.getAllAsync<{
      id: string;
      cloud_photo_path: string;
      photo_uri: string | null;
    }>(
      `SELECT id, cloud_photo_path, photo_uri FROM medicines
       WHERE cloud_photo_path IS NOT NULL`,
    );
    return rows.map((row) => ({
      id: row.id,
      cloudPhotoPath: row.cloud_photo_path,
      photoUri: row.photo_uri,
    }));
  }

  private async enqueue(
    entity: SyncEntity,
    entityId: string,
    operation: SyncOperation,
    payload: Record<string, unknown> | null,
  ) {
    await this.db.runAsync(
      'DELETE FROM sync_queue WHERE entity = ? AND entity_id = ?',
      entity,
      entityId,
    );
    await this.db.runAsync(
      `INSERT INTO sync_queue (id, entity, entity_id, operation, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      createId(),
      entity,
      entityId,
      operation,
      payload ? JSON.stringify(payload) : null,
      Date.now(),
    );
  }

  async seedExample() {
    const seeded = await this.db.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = 'example_seeded'`,
    );
    if (seeded) return;
    await this.db.runAsync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('example_seeded', 'true')`,
    );
    if ((await this.medicines.count()) > 0) return;
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    const time = `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`;
    await this.createMedicine({
      name: 'Vitamina D',
      dosage: '1 cápsula',
      notes: 'Tomar junto com uma refeição.',
      photoUri: null,
      schedule: {
        type: 'fixed_times',
        times: [time],
        intervalHours: null,
        startTime: null,
        weekdays: [],
        startDate: startOfDay(Date.now()),
        endDate: null,
      },
    });
  }
}
