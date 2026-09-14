import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Intake,
  IntakeStatus,
  IntakeWithMedicine,
  Medicine,
  MedicineWithSchedule,
  Schedule,
} from '@/types/models';

interface MedicineRow {
  id: string;
  name: string;
  dosage: string;
  photo_uri: string | null;
  cloud_photo_path: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

interface ScheduleRow {
  schedule_id: string;
  medicine_id: string;
  schedule_type: Schedule['type'];
  times: string | null;
  interval_hours: number | null;
  start_time: string | null;
  weekdays: string | null;
  start_date: number;
  end_date: number | null;
  schedule_updated_at: number;
}

interface IntakeRow {
  intake_id: string;
  medicine_id: string;
  schedule_id: string;
  scheduled_at: number;
  taken_at: number | null;
  status: IntakeStatus;
  parent_intake_id: string | null;
  snooze_count: number;
  intake_updated_at: number;
}

type IntakeMedicineRow = IntakeRow & MedicineRow;

function mapMedicine(row: MedicineRow): Medicine {
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage,
    photoUri: row.photo_uri,
    cloudPhotoPath: row.cloud_photo_path,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.schedule_id,
    medicineId: row.medicine_id,
    type: row.schedule_type,
    times: row.times ? JSON.parse(row.times) : [],
    intervalHours: row.interval_hours,
    startTime: row.start_time,
    weekdays: row.weekdays ? JSON.parse(row.weekdays) : [],
    startDate: row.start_date,
    endDate: row.end_date,
    updatedAt: row.schedule_updated_at,
  };
}

function mapIntake(row: IntakeRow): Intake {
  return {
    id: row.intake_id,
    medicineId: row.medicine_id,
    scheduleId: row.schedule_id,
    scheduledAt: row.scheduled_at,
    takenAt: row.taken_at,
    status: row.status,
    parentIntakeId: row.parent_intake_id,
    snoozeCount: row.snooze_count,
    updatedAt: row.intake_updated_at,
  };
}

const medicineScheduleSelect = `
  SELECT m.*, s.id AS schedule_id, s.medicine_id, s.type AS schedule_type,
    s.times, s.interval_hours, s.start_time, s.weekdays, s.start_date, s.end_date,
    s.updated_at AS schedule_updated_at
  FROM medicines m INNER JOIN schedules s ON s.medicine_id = m.id
`;

const intakeMedicineSelect = `
  SELECT i.id AS intake_id, i.medicine_id, i.schedule_id, i.scheduled_at,
    i.taken_at, i.status, i.parent_intake_id, i.snooze_count,
    i.updated_at AS intake_updated_at, m.*
  FROM intakes i INNER JOIN medicines m ON m.id = i.medicine_id
`;

export interface MedicineRepository {
  list(): Promise<MedicineWithSchedule[]>;
  get(id: string): Promise<MedicineWithSchedule | null>;
  insert(medicine: Medicine): Promise<void>;
  update(medicine: Medicine): Promise<void>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}

export class SqliteMedicineRepository implements MedicineRepository {
  constructor(private db: SQLiteDatabase) {}

  async list() {
    const rows = await this.db.getAllAsync<MedicineRow & ScheduleRow>(
      `${medicineScheduleSelect} ORDER BY m.name COLLATE NOCASE`,
    );
    return rows.map((row) => ({ ...mapMedicine(row), schedule: mapSchedule(row) }));
  }

  async get(id: string) {
    const row = await this.db.getFirstAsync<MedicineRow & ScheduleRow>(
      `${medicineScheduleSelect} WHERE m.id = ?`,
      id,
    );
    return row ? { ...mapMedicine(row), schedule: mapSchedule(row) } : null;
  }

  async insert(medicine: Medicine) {
    await this.db.runAsync(
      `INSERT INTO medicines (id, name, dosage, photo_uri, cloud_photo_path, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      medicine.id,
      medicine.name,
      medicine.dosage,
      medicine.photoUri,
      medicine.cloudPhotoPath,
      medicine.notes,
      medicine.createdAt,
      medicine.updatedAt,
    );
  }

  async update(medicine: Medicine) {
    await this.db.runAsync(
      `UPDATE medicines SET name = ?, dosage = ?, photo_uri = ?, cloud_photo_path = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      medicine.name,
      medicine.dosage,
      medicine.photoUri,
      medicine.cloudPhotoPath,
      medicine.notes,
      medicine.updatedAt,
      medicine.id,
    );
  }

  async delete(id: string) {
    await this.db.runAsync('DELETE FROM medicines WHERE id = ?', id);
  }

  async count() {
    const row = await this.db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM medicines');
    return row?.total ?? 0;
  }
}

export interface ScheduleRepository {
  insert(schedule: Schedule): Promise<void>;
  update(schedule: Schedule): Promise<void>;
  list(): Promise<Schedule[]>;
}

export class SqliteScheduleRepository implements ScheduleRepository {
  constructor(private db: SQLiteDatabase) {}

  async insert(schedule: Schedule) {
    await this.db.runAsync(
      `INSERT INTO schedules
       (id, medicine_id, type, times, interval_hours, start_time, weekdays, start_date, end_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      schedule.id,
      schedule.medicineId,
      schedule.type,
      JSON.stringify(schedule.times),
      schedule.intervalHours,
      schedule.startTime,
      JSON.stringify(schedule.weekdays),
      schedule.startDate,
      schedule.endDate,
      schedule.updatedAt,
    );
  }

  async update(schedule: Schedule) {
    await this.db.runAsync(
      `UPDATE schedules SET type = ?, times = ?, interval_hours = ?, start_time = ?,
       weekdays = ?, start_date = ?, end_date = ?, updated_at = ? WHERE id = ?`,
      schedule.type,
      JSON.stringify(schedule.times),
      schedule.intervalHours,
      schedule.startTime,
      JSON.stringify(schedule.weekdays),
      schedule.startDate,
      schedule.endDate,
      schedule.updatedAt,
      schedule.id,
    );
  }

  async list() {
    const rows = await this.db.getAllAsync<ScheduleRow>(
      `SELECT id AS schedule_id, medicine_id, type AS schedule_type, times,
       interval_hours, start_time, weekdays, start_date, end_date,
       updated_at AS schedule_updated_at FROM schedules`,
    );
    return rows.map(mapSchedule);
  }
}

export interface IntakeRepository {
  insertMany(intakes: Intake[]): Promise<void>;
  get(id: string): Promise<IntakeWithMedicine | null>;
  listForRange(from: number, to: number): Promise<IntakeWithMedicine[]>;
  listUpcoming(medicineId: string, from: number, limit?: number): Promise<IntakeWithMedicine[]>;
  listHistory(medicineId: string, from: number): Promise<IntakeWithMedicine[]>;
  listPending(from: number, to: number): Promise<IntakeWithMedicine[]>;
  listAllNonPending(): Promise<Intake[]>;
  deleteFuturePending(medicineId: string, from: number): Promise<void>;
  updateStatus(id: string, status: IntakeStatus, takenAt?: number | null): Promise<void>;
}

export class SqliteIntakeRepository implements IntakeRepository {
  constructor(private db: SQLiteDatabase) {}

  async insertMany(intakes: Intake[]) {
    for (const intake of intakes) {
      await this.db.runAsync(
        `INSERT OR IGNORE INTO intakes
         (id, medicine_id, schedule_id, scheduled_at, taken_at, status, parent_intake_id, snooze_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        intake.id,
        intake.medicineId,
        intake.scheduleId,
        intake.scheduledAt,
        intake.takenAt,
        intake.status,
        intake.parentIntakeId,
        intake.snoozeCount,
        intake.updatedAt,
      );
    }
  }

  async get(id: string) {
    const row = await this.db.getFirstAsync<IntakeMedicineRow>(
      `${intakeMedicineSelect} WHERE i.id = ?`,
      id,
    );
    return row ? { ...mapIntake(row), medicine: mapMedicine(row) } : null;
  }

  async listForRange(from: number, to: number) {
    const rows = await this.db.getAllAsync<IntakeMedicineRow>(
      `${intakeMedicineSelect}
       WHERE i.scheduled_at BETWEEN ? AND ? AND i.status <> 'snoozed'
       ORDER BY i.scheduled_at, m.name COLLATE NOCASE`,
      from,
      to,
    );
    return rows.map((row) => ({ ...mapIntake(row), medicine: mapMedicine(row) }));
  }

  async listUpcoming(medicineId: string, from: number, limit = 30) {
    const rows = await this.db.getAllAsync<IntakeMedicineRow>(
      `${intakeMedicineSelect}
       WHERE i.medicine_id = ? AND i.scheduled_at >= ? AND i.status = 'pending'
       ORDER BY i.scheduled_at LIMIT ?`,
      medicineId,
      from,
      limit,
    );
    return rows.map((row) => ({ ...mapIntake(row), medicine: mapMedicine(row) }));
  }

  async listHistory(medicineId: string, from: number) {
    const rows = await this.db.getAllAsync<IntakeMedicineRow>(
      `${intakeMedicineSelect}
       WHERE i.medicine_id = ? AND i.scheduled_at >= ? AND i.status <> 'pending'
       ORDER BY i.scheduled_at DESC`,
      medicineId,
      from,
    );
    return rows.map((row) => ({ ...mapIntake(row), medicine: mapMedicine(row) }));
  }

  async listPending(from: number, to: number) {
    const rows = await this.db.getAllAsync<IntakeMedicineRow>(
      `${intakeMedicineSelect}
       WHERE i.scheduled_at BETWEEN ? AND ? AND i.status = 'pending'
       ORDER BY i.scheduled_at`,
      from,
      to,
    );
    return rows.map((row) => ({ ...mapIntake(row), medicine: mapMedicine(row) }));
  }

  async listAllNonPending() {
    const rows = await this.db.getAllAsync<IntakeRow>(
      `SELECT id AS intake_id, medicine_id, schedule_id, scheduled_at, taken_at,
       status, parent_intake_id, snooze_count, updated_at AS intake_updated_at
       FROM intakes
       WHERE status <> 'pending'
         AND EXISTS (SELECT 1 FROM medicines WHERE medicines.id = intakes.medicine_id)
         AND EXISTS (SELECT 1 FROM schedules WHERE schedules.id = intakes.schedule_id)
       ORDER BY updated_at`,
    );
    return rows.map(mapIntake);
  }

  async deleteFuturePending(medicineId: string, from: number) {
    await this.db.runAsync(
      `DELETE FROM intakes WHERE medicine_id = ? AND scheduled_at >= ? AND status = 'pending'`,
      medicineId,
      from,
    );
  }

  async updateStatus(id: string, status: IntakeStatus, takenAt: number | null = null) {
    await this.db.runAsync(
      `UPDATE intakes SET status = ?, taken_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'`,
      status,
      takenAt,
      Date.now(),
      id,
    );
  }
}
