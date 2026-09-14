export type ScheduleType = 'fixed_times' | 'interval' | 'weekly';
export type IntakeStatus = 'pending' | 'taken' | 'skipped' | 'snoozed';

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  photoUri: string | null;
  cloudPhotoPath: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Schedule {
  id: string;
  medicineId: string;
  type: ScheduleType;
  times: string[];
  intervalHours: number | null;
  startTime: string | null;
  weekdays: number[];
  startDate: number;
  endDate: number | null;
  updatedAt: number;
}

export interface Intake {
  id: string;
  medicineId: string;
  scheduleId: string;
  scheduledAt: number;
  takenAt: number | null;
  status: IntakeStatus;
  parentIntakeId: string | null;
  snoozeCount: number;
  updatedAt: number;
}

export type SyncEntity = 'medicine' | 'schedule' | 'intake';
export type SyncOperation = 'upsert' | 'delete';

export interface SyncMutation {
  id: string;
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown> | null;
  createdAt: number;
}

export interface RemoteChange {
  seq: number;
  entity: SyncEntity;
  entity_id: string;
  operation: SyncOperation;
  payload: Record<string, unknown> | null;
}

export interface MedicineWithSchedule extends Medicine {
  schedule: Schedule;
}

export interface IntakeWithMedicine extends Intake {
  medicine: Medicine;
}

export interface MedicineInput {
  name: string;
  dosage: string;
  photoUri: string | null;
  notes: string;
  schedule: {
    type: ScheduleType;
    times: string[];
    intervalHours: number | null;
    startTime: string | null;
    weekdays: number[];
    startDate: number;
    endDate: number | null;
  };
}
