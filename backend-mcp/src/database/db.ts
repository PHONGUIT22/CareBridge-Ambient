import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Lấy đường dẫn thư mục hiện tại theo chuẩn ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đặt file database tại thư mục gốc backend-mcp (hoặc tuỳ chỉnh)
const DB_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'carebridge.db');

let dbInstance: DatabaseType | null = null;

/**
 * Khởi tạo Database và Migrate Schema
 */
export function initDB(): DatabaseType {
  if (dbInstance) return dbInstance;

  // Đảm bảo thư mục chứa database tồn tại
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Khởi tạo connection với better-sqlite3
  dbInstance = new Database(DB_PATH, {
    // verbose: console.log, // Bật nếu muốn debug toàn bộ câu lệnh SQL
  });

  // Bật chế độ WAL mode và ràng buộc Foreign Keys
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = NORMAL'); // Tối ưu tốc độ ghi đĩa an toàn cho WAL

  // Tạo toàn bộ các bảng cốt lõi
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

    -- Tối ưu Index cho tốc độ truy vấn lịch uống và heatmap
    CREATE UNIQUE INDEX IF NOT EXISTS idx_log_unique ON intake_logs(medicine_id, date, time);
    CREATE INDEX IF NOT EXISTS idx_log_date ON intake_logs(date);
  `);

  // Cơ chế an toàn tự bổ sung cột (Defensive migration)
  migrateTableSafely('medicines', 'image_uri', 'TEXT');
  migrateTableSafely('medicines', 'stock_count', 'INTEGER DEFAULT 30');
  migrateTableSafely('medicines', 'type', "TEXT DEFAULT 'medication'");
  migrateTableSafely('intake_logs', 'notes', 'TEXT');

  console.log(`[SQLite] Database kết nối thành công tại: ${DB_PATH}`);
  return dbInstance;
}

/**
 * Hàm hỗ trợ tự động bổ sung cột nếu bảng đã tồn tại từ trước mà chưa có cột mới
 */
function migrateTableSafely(table: string, column: string, columnDef: string) {
  if (!dbInstance) return;
  const tableInfo = dbInstance.pragma(`table_info(${table})`) as Array<{ name: string }>;
  const hasColumn = tableInfo.some((col) => col.name === column);

  if (!hasColumn) {
    try {
      dbInstance.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${columnDef};`);
    } catch (err) {
      // Đã có cột hoặc bỏ qua lỗi trùng
    }
  }
}

/**
 * Singleton Getter để các Repositories lấy database dùng chung
 */
export function getDatabase(): DatabaseType {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Đóng kết nối an toàn khi tắt server
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[SQLite] Đã đóng kết nối cơ sở dữ liệu an toàn.');
  }
}

// Lắng nghe sự kiện tắt tiến trình để đóng DB sạch sẽ, tránh corrupt file
process.on('exit', () => closeDB());
process.on('SIGINT', () => {
  closeDB();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDB();
  process.exit(0);
});