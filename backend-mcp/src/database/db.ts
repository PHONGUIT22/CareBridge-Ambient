import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Retrieve current directory path following ES Module standards
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Place SQLite database file in backend-mcp/data directory
const DB_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'carebridge.db');

let dbInstance: DatabaseType | null = null;

/**
 * Initialize Database and Migrate Schema
 */
export function initDB(): DatabaseType {
  if (dbInstance) return dbInstance;

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Initialize better-sqlite3 connection
  dbInstance = new Database(DB_PATH, {
    // verbose: console.log, // Enable for detailed SQL query logging
  });

  // Enable WAL mode and foreign key constraints
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = NORMAL'); // Optimize disk write safety for WAL

  // Create core database tables
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      reminder_times TEXT NOT NULL,
      days_of_week TEXT NOT NULL,
      image_uri TEXT,
      stock_count INTEGER DEFAULT 30,
      type TEXT DEFAULT 'medication',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS intake_logs (
      id TEXT PRIMARY KEY NOT NULL,
      medicine_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'taken', 'skipped')),
      taken_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_vitals (
      date TEXT PRIMARY KEY NOT NULL,
      systolic INTEGER,
      diastolic INTEGER,
      blood_sugar REAL,
      heart_rate INTEGER,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS caregiver_profile (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Optimize indexes for schedule queries and adherence heatmaps
    CREATE UNIQUE INDEX IF NOT EXISTS idx_log_unique ON intake_logs(medicine_id, date, time);
    CREATE INDEX IF NOT EXISTS idx_log_date ON intake_logs(date);
  `);

  // Defensive migration: ensure newer columns exist safely
  migrateTableSafely('medicines', 'image_uri', 'TEXT');
  migrateTableSafely('medicines', 'stock_count', 'INTEGER DEFAULT 30');
  migrateTableSafely('medicines', 'type', "TEXT DEFAULT 'medication'");
  migrateTableSafely('intake_logs', 'notes', 'TEXT');

  console.log(`[SQLite] Database successfully connected at: ${DB_PATH}`);
  return dbInstance;
}

/**
 * Defensive schema migration helper to add missing columns to existing tables
 */
function migrateTableSafely(table: string, column: string, columnDef: string) {
  if (!dbInstance) return;
  const tableInfo = dbInstance.pragma(`table_info(${table})`) as Array<{ name: string }>;
  const hasColumn = tableInfo.some((col) => col.name === column);

  if (!hasColumn) {
    try {
      dbInstance.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${columnDef};`);
    } catch (err) {
      // Column exists or duplicate error ignored
    }
  }
}

/**
 * Singleton Getter for repositories to share database connection
 */
export function getDatabase(): DatabaseType {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Gracefully close database connection on process shutdown
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[SQLite] Database connection closed safely.');
  }
}

// Listen to process exit signals for clean shutdown to prevent database corruption
process.on('exit', () => closeDB());
process.on('SIGINT', () => {
  closeDB();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDB();
  process.exit(0);
});