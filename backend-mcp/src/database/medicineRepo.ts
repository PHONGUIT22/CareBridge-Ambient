import { getDatabase } from './db.js';

export interface MedicineInput {
  id?: string;
  name: string;
  dosage: string;
  reminderTimes: string[]; // e.g. ["08:00", "12:00", "20:00"]
  daysOfWeek: string[];    // e.g. ["MON", "WED", "FRI"] or ["ALL"]
  imageUri?: string | null;
  stockCount?: number;
  type?: 'medication' | 'routine';
}

export interface MedicineRecord {
  id: string;
  name: string;
  dosage: string;
  reminderTimes: string[];
  daysOfWeek: string[];
  stockCount: number;
  imageUri?: string;
  type?: 'medication' | 'routine';
  createdAt: string;
}

export const MedicineRepo = {
  async addMedicine(input: MedicineInput): Promise<string> {
    const db = getDatabase();
    const id = input.id || `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO medicines (id, name, dosage, reminder_times, days_of_week, image_uri, stock_count, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.name.trim(),
      input.dosage.trim(),
      JSON.stringify(input.reminderTimes),
      JSON.stringify(input.daysOfWeek),
      input.imageUri || null,
      input.stockCount ?? 30,
      input.type || 'medication',
      createdAt
    );

    return id;
  },

  async updateMedicine(id: string, input: MedicineInput): Promise<void> {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE medicines 
      SET name = ?, dosage = ?, reminder_times = ?, days_of_week = ?, image_uri = ?, type = COALESCE(?, type)
      WHERE id = ?
    `);

    stmt.run(
      input.name.trim(),
      input.dosage.trim(),
      JSON.stringify(input.reminderTimes),
      JSON.stringify(input.daysOfWeek),
      input.imageUri || null,
      input.type || null,
      id
    );
  },

  /**
   * Tăng giảm số lượng viên thuốc tồn kho (+1 khi huỷ uống, -1 khi đã uống)
   */
  async updateStock(medicineId: string, delta: number): Promise<number> {
    const db = getDatabase();
    const updateStmt = db.prepare(`
      UPDATE medicines 
      SET stock_count = MAX(0, COALESCE(stock_count, 30) + ?) 
      WHERE id = ?
    `);
    updateStmt.run(delta, medicineId);

    const selectStmt = db.prepare('SELECT stock_count FROM medicines WHERE id = ?');
    const row = selectStmt.get(medicineId) as { stock_count: number } | undefined;
    return row?.stock_count ?? 0;
  },

  async refillMedicine(medicineId: string, refillAmount: number = 30): Promise<void> {
    const db = getDatabase();
    db.prepare(`
      UPDATE medicines 
      SET stock_count = COALESCE(stock_count, 0) + ? 
      WHERE id = ?
    `).run(refillAmount, medicineId);
  },

  async getAllMedicines(): Promise<MedicineRecord[]> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM medicines ORDER BY created_at DESC');
    const rows = stmt.all() as Array<{
      id: string;
      name: string;
      dosage: string;
      reminder_times: string;
      days_of_week: string;
      image_uri: string | null;
      stock_count: number | null;
      type: string | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      dosage: row.dosage,
      reminderTimes: JSON.parse(row.reminder_times || '[]'),
      daysOfWeek: JSON.parse(row.days_of_week || '[]'),
      imageUri: row.image_uri || undefined,
      stockCount: row.stock_count ?? 30,
      type: (row.type as 'medication' | 'routine') || 'medication',
      createdAt: row.created_at,
    }));
  },

  async getMedicineById(id: string): Promise<MedicineRecord | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM medicines WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      dosage: row.dosage,
      reminderTimes: JSON.parse(row.reminder_times || '[]'),
      daysOfWeek: JSON.parse(row.days_of_week || '[]'),
      imageUri: row.image_uri || undefined,
      stockCount: row.stock_count ?? 30,
      type: row.type || 'medication',
      createdAt: row.created_at,
    };
  },

  async deleteMedicine(id: string): Promise<void> {
    const db = getDatabase();
    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM intake_logs WHERE medicine_id = ?').run(id);
      db.prepare('DELETE FROM medicines WHERE id = ?').run(id);
    });
    deleteTx();
  },

  async findByName(query: string): Promise<MedicineRecord | null> {
    const all = await this.getAllMedicines();
    const q = query.toLowerCase().trim();
    return (
      all.find(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          q.includes(m.name.toLowerCase().split(' ')[0])
      ) || null
    );
  },
};