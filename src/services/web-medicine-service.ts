import { supabase } from '@/lib/supabase';
import type {
  Intake,
  IntakeWithMedicine,
  MedicineInput,
  MedicineWithSchedule,
  RemoteChange,
  Schedule,
  SyncMutation,
} from '@/types/models';
import { endOfDay, startOfDay } from '@/utils/date';
import { createId } from '@/utils/id';
import type { MedicineService } from './medicine-service';
import { generateIntakes, rollingEnd } from './scheduling';

interface MedicineRow {
  id: string;
  name: string;
  dosage: string;
  photo_path: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

interface ScheduleRow {
  id: string;
  medicine_id: string;
  type: Schedule['type'];
  times: string[];
  interval_hours: number | null;
  start_time: string | null;
  weekdays: number[];
  start_date: number;
  end_date: number | null;
  updated_at: number;
}

interface IntakeRow {
  id: string;
  medicine_id: string;
  schedule_id: string;
  scheduled_at: number;
  taken_at: number | null;
  status: Intake['status'];
  parent_intake_id: string | null;
  snooze_count: number;
  updated_at: number;
}

function mapSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    medicineId: row.medicine_id,
    type: row.type,
    times: row.times ?? [],
    intervalHours: row.interval_hours,
    startTime: row.start_time,
    weekdays: row.weekdays ?? [],
    startDate: row.start_date,
    endDate: row.end_date,
    updatedAt: row.updated_at,
  };
}

function mapIntake(row: IntakeRow): Intake {
  return {
    id: row.id,
    medicineId: row.medicine_id,
    scheduleId: row.schedule_id,
    scheduledAt: row.scheduled_at,
    takenAt: row.taken_at,
    status: row.status,
    parentIntakeId: row.parent_intake_id,
    snoozeCount: row.snooze_count,
    updatedAt: row.updated_at,
  };
}

function remoteSchedule(userId: string, schedule: Schedule) {
  return {
    id: schedule.id,
    user_id: userId,
    medicine_id: schedule.medicineId,
    type: schedule.type,
    times: schedule.times,
    interval_hours: schedule.intervalHours,
    start_time: schedule.startTime,
    weekdays: schedule.weekdays,
    start_date: schedule.startDate,
    end_date: schedule.endDate,
    created_at: schedule.updatedAt,
    updated_at: schedule.updatedAt,
  };
}

function remoteIntake(userId: string, intake: Intake) {
  return {
    id: intake.id,
    user_id: userId,
    medicine_id: intake.medicineId,
    schedule_id: intake.scheduleId,
    scheduled_at: intake.scheduledAt,
    taken_at: intake.takenAt,
    status: intake.status,
    parent_intake_id: null,
    snooze_count: intake.snoozeCount,
    created_at: Math.min(intake.updatedAt, Date.now()),
    updated_at: intake.updatedAt,
  };
}

export class WebMedicineService implements MedicineService {
  constructor(private userId: string | null) {}

  private requireUser() {
    if (!this.userId) throw new Error('Entre na sua conta para gerenciar medicamentos na web.');
    return this.userId;
  }

  private async photoUrl(path: string | null) {
    if (!path) return null;
    const { data } = await supabase.storage.from('medicine-photos').createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  }

  private async persistPhoto(medicineId: string, uri: string | null) {
    if (!uri || uri.startsWith('http')) return null;
    const userId = this.requireUser();
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Não foi possível preparar a foto.');
    const path = `${userId}/${medicineId}.jpg`;
    const { error } = await supabase.storage
      .from('medicine-photos')
      .upload(path, await response.arrayBuffer(), { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    return path;
  }

  async listMedicines() {
    if (!this.userId) return [];
    const [{ data: medicines, error: medicinesError }, { data: schedules, error: schedulesError }] = await Promise.all([
      supabase.from('medicines').select('id,name,dosage,photo_path,notes,created_at,updated_at').order('name'),
      supabase.from('schedules').select('id,medicine_id,type,times,interval_hours,start_time,weekdays,start_date,end_date,updated_at'),
    ]);
    if (medicinesError || schedulesError) throw medicinesError ?? schedulesError;
    const schedulesByMedicine = new Map(
      ((schedules ?? []) as ScheduleRow[]).map((row) => [row.medicine_id, mapSchedule(row)]),
    );
    const result = await Promise.all(((medicines ?? []) as MedicineRow[]).map(async (row) => {
      const schedule = schedulesByMedicine.get(row.id);
      if (!schedule) return null;
      return {
        id: row.id,
        name: row.name,
        dosage: row.dosage,
        photoUri: await this.photoUrl(row.photo_path),
        cloudPhotoPath: row.photo_path,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        schedule,
      } satisfies MedicineWithSchedule;
    }));
    return result.filter((item): item is MedicineWithSchedule => item !== null);
  }

  async getMedicine(id: string) {
    return (await this.listMedicines()).find((medicine) => medicine.id === id) ?? null;
  }

  async createMedicine(input: MedicineInput) {
    const userId = this.requireUser();
    const now = Date.now();
    const medicineId = createId();
    const schedule: Schedule = {
      id: createId(),
      medicineId,
      ...input.schedule,
      updatedAt: now,
    };
    const photoPath = await this.persistPhoto(medicineId, input.photoUri);
    const { error: medicineError } = await supabase.from('medicines').insert({
      id: medicineId,
      user_id: userId,
      name: input.name.trim(),
      dosage: input.dosage.trim(),
      photo_path: photoPath,
      notes: input.notes.trim() || null,
      created_at: now,
      updated_at: now,
    });
    if (medicineError) throw medicineError;
    const { error: scheduleError } = await supabase.from('schedules').insert(remoteSchedule(userId, schedule));
    if (scheduleError) {
      await supabase.from('medicines').delete().eq('id', medicineId);
      throw scheduleError;
    }
    await this.regenerateRollingWindow();
    return medicineId;
  }

  async updateMedicine(id: string, input: MedicineInput) {
    const userId = this.requireUser();
    const existing = await this.getMedicine(id);
    if (!existing) throw new Error('Medicamento não encontrado.');
    const now = Date.now();
    let photoPath = existing.cloudPhotoPath;
    if (!input.photoUri) photoPath = null;
    else if (input.photoUri !== existing.photoUri) photoPath = await this.persistPhoto(id, input.photoUri);
    const { error: medicineError } = await supabase.from('medicines').update({
      name: input.name.trim(),
      dosage: input.dosage.trim(),
      photo_path: photoPath,
      notes: input.notes.trim() || null,
    }).eq('id', id).eq('user_id', userId);
    if (medicineError) throw medicineError;
    const schedule: Schedule = { id: existing.schedule.id, medicineId: id, ...input.schedule, updatedAt: now };
    const { error: scheduleError } = await supabase.from('schedules').update(remoteSchedule(userId, schedule)).eq('id', schedule.id).eq('user_id', userId);
    if (scheduleError) throw scheduleError;
    await supabase.from('intakes').delete().eq('medicine_id', id).eq('status', 'pending').gte('scheduled_at', now);
    await this.regenerateRollingWindow();
  }

  async deleteMedicine(id: string) {
    const userId = this.requireUser();
    const medicine = await this.getMedicine(id);
    if (medicine?.cloudPhotoPath) await supabase.storage.from('medicine-photos').remove([medicine.cloudPhotoPath]);
    const { error } = await supabase.from('medicines').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  private async intakeRows(from?: number, to?: number, medicineId?: string) {
    if (!this.userId) return [];
    let query = supabase.from('intakes').select('id,medicine_id,schedule_id,scheduled_at,taken_at,status,parent_intake_id,snooze_count,updated_at');
    if (from !== undefined) query = query.gte('scheduled_at', from);
    if (to !== undefined) query = query.lte('scheduled_at', to);
    if (medicineId) query = query.eq('medicine_id', medicineId);
    const { data, error } = await query.order('scheduled_at');
    if (error) throw error;
    return (data ?? []) as IntakeRow[];
  }

  private async attachMedicines(rows: IntakeRow[]) {
    const medicines = await this.listMedicines();
    const byId = new Map(medicines.map((medicine) => [medicine.id, medicine]));
    return rows.flatMap((row) => {
      const medicine = byId.get(row.medicine_id);
      return medicine ? [{ ...mapIntake(row), medicine } satisfies IntakeWithMedicine] : [];
    });
  }

  async listDayIntakes(day: number) {
    const rows = await this.intakeRows(startOfDay(day), endOfDay(day));
    return this.attachMedicines(rows.filter((row) => row.status !== 'snoozed'));
  }

  async listUpcoming(medicineId: string) {
    const rows = await this.intakeRows(Date.now(), rollingEnd(), medicineId);
    return this.attachMedicines(rows.filter((row) => row.status === 'pending'));
  }

  async listHistory(medicineId: string) {
    const rows = await this.intakeRows(Date.now() - 30 * 24 * 60 * 60 * 1000, Date.now(), medicineId);
    return this.attachMedicines(rows.filter((row) => row.status !== 'pending').reverse());
  }

  async listRecentIntakes(since: number, until: number) {
    const rows = await this.intakeRows(since, until);
    return this.attachMedicines(rows.filter((row) => row.status !== 'pending' && row.status !== 'snoozed').reverse());
  }

  async getIntake(id: string) {
    const { data, error } = await supabase.from('intakes').select('id,medicine_id,schedule_id,scheduled_at,taken_at,status,parent_intake_id,snooze_count,updated_at').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return (await this.attachMedicines([data as IntakeRow]))[0] ?? null;
  }

  async listPendingNotifications() {
    return [];
  }

  async markTaken(id: string) {
    const { error } = await supabase.from('intakes').update({ status: 'taken', taken_at: Date.now() }).eq('id', id).eq('status', 'pending');
    if (error) throw error;
  }

  async skipIntake(id: string) {
    const { error } = await supabase.from('intakes').update({ status: 'skipped', taken_at: null }).eq('id', id).eq('status', 'pending');
    if (error) throw error;
  }

  async snoozeIntake(id: string) {
    const userId = this.requireUser();
    const current = await this.getIntake(id);
    if (!current || current.status !== 'pending') throw new Error('Esta dose já foi registrada.');
    if (current.snoozeCount >= 3) throw new Error('O limite de 3 adiamentos foi atingido.');
    const child: Intake = {
      ...current,
      id: createId(),
      scheduledAt: Date.now() + 10 * 60 * 1000,
      takenAt: null,
      status: 'pending',
      parentIntakeId: null,
      snoozeCount: current.snoozeCount + 1,
      updatedAt: Date.now(),
    };
    await supabase.from('intakes').update({ status: 'snoozed' }).eq('id', id);
    const { error } = await supabase.from('intakes').insert(remoteIntake(userId, child));
    if (error) throw error;
    return child.id;
  }

  async regenerateRollingWindow() {
    if (!this.userId) return;
    const userId = this.userId;
    const medicines = await this.listMedicines();
    const existing = await this.intakeRows(startOfDay(Date.now()), rollingEnd());
    const keys = new Set(existing.map((row) => `${row.schedule_id}:${row.scheduled_at}`));
    const missing = medicines.flatMap((medicine) =>
      generateIntakes(medicine.schedule, startOfDay(Date.now()), rollingEnd())
        .filter((intake) => !keys.has(`${intake.scheduleId}:${intake.scheduledAt}`)),
    );
    if (!missing.length) return;
    const { error } = await supabase.from('intakes').insert(missing.map((intake) => remoteIntake(userId, intake)));
    if (error) throw error;
  }

  async seedExample() {}
  async queueFullSnapshot() {}
  async getSyncMutations(): Promise<SyncMutation[]> { return []; }
  async acknowledgeMutations(_ids: string[]) {}
  async applyRemoteChanges(_changes: RemoteChange[]) {}
  async getSyncCursor() { return 0; }
  async getCacheOwner() { return this.userId; }
  async setCacheOwner(_userId: string) {}
  async clearUserCache() {}
  async setCloudPhotoPath(_medicineId: string, _path: string) {}
  async setRemotePhotoUri(_medicineId: string, _uri: string) {}
  async listCloudPhotos() { return []; }
}
