import { getDatabase } from './db.js';

export interface VitalsRecord {
  date: string; // YYYY-MM-DD
  systolic?: number | null;
  diastolic?: number | null;
  bloodSugar?: number | null;
  heartRate?: number | null;
  updatedAt: string;
}

export const VitalsRepo = {
  async getVitalsByDate(dateStr: string): Promise<VitalsRecord | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM daily_vitals WHERE date = ?').get(dateStr) as any;

    if (!row) return null;
    return {
      date: row.date,
      systolic: row.systolic,
      diastolic: row.diastolic,
      bloodSugar: row.blood_sugar,
      heartRate: row.heart_rate,
      updatedAt: row.updated_at,
    };
  },

  async saveVitals(vitals: VitalsRecord): Promise<void> {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO daily_vitals (date, systolic, diastolic, blood_sugar, heart_rate, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        systolic = excluded.systolic,
        diastolic = excluded.diastolic,
        blood_sugar = excluded.blood_sugar,
        heart_rate = excluded.heart_rate,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      vitals.date,
      vitals.systolic ?? null,
      vitals.diastolic ?? null,
      vitals.bloodSugar ?? null,
      vitals.heartRate ?? null,
      new Date().toISOString()
    );
  },

  async getAllVitals(): Promise<VitalsRecord[]> {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM daily_vitals ORDER BY date ASC').all() as any[];

    return rows.map((row) => ({
      date: row.date,
      systolic: row.systolic,
      diastolic: row.diastolic,
      bloodSugar: row.blood_sugar,
      heartRate: row.heart_rate,
      updatedAt: row.updated_at,
    }));
  },
};