import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 4;

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = result?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medicines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        photo_uri TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY NOT NULL,
        medicine_id TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK(type IN ('fixed_times','interval','weekly')),
        times TEXT,
        interval_hours INTEGER,
        start_time TEXT,
        weekdays TEXT,
        start_date INTEGER NOT NULL,
        end_date INTEGER,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS intakes (
        id TEXT PRIMARY KEY NOT NULL,
        medicine_id TEXT NOT NULL,
        schedule_id TEXT NOT NULL,
        scheduled_at INTEGER NOT NULL,
        taken_at INTEGER,
        status TEXT NOT NULL CHECK(status IN ('pending','taken','skipped','snoozed')) DEFAULT 'pending',
        parent_intake_id TEXT,
        snooze_count INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_intake_id) REFERENCES intakes(id) ON DELETE SET NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_intakes_schedule_time
        ON intakes(schedule_id, scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_intakes_day ON intakes(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_intakes_medicine ON intakes(medicine_id);
    `);
  }

  if (version < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }

  if (version < 3) {
    await db.execAsync(`
      ALTER TABLE medicines ADD COLUMN cloud_photo_path TEXT;
      ALTER TABLE schedules ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE intakes ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;

      UPDATE schedules
      SET updated_at = COALESCE(
        (SELECT updated_at FROM medicines WHERE medicines.id = schedules.medicine_id),
        CAST(strftime('%s', 'now') AS INTEGER) * 1000
      );
      UPDATE intakes
      SET updated_at = COALESCE(taken_at, scheduled_at);

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        entity TEXT NOT NULL CHECK(entity IN ('medicine','schedule','intake')),
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('upsert','delete')),
        payload TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);
    `);
  }

  if (version < 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS health_profile_cache (
        user_id TEXT PRIMARY KEY NOT NULL,
        conditions TEXT NOT NULL DEFAULT '',
        allergies TEXT NOT NULL DEFAULT '',
        additional_notes TEXT NOT NULL DEFAULT '',
        onboarding_completed_at INTEGER,
        updated_at INTEGER NOT NULL,
        dirty INTEGER NOT NULL DEFAULT 0 CHECK(dirty IN (0, 1))
      );
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
