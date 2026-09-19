import { getDatabase } from './db.js';
import { MedicineRepo } from './medicineRepo.js';
import { VitalsRepo } from './vitalsRepo.js';

export async function seedDemoData(force: boolean = false): Promise<void> {
  const db = getDatabase();

  // Kiểm tra xem đã có dữ liệu thuốc chưa
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM medicines').get() as { count: number };
  if (existingCount.count > 0 && !force) {
    console.log('[Seed] Cơ sở dữ liệu đã có dữ liệu, bỏ qua bước seeder.');
    return;
  }

  console.log('[Seed] Bắt đầu khởi tạo dữ liệu lâm sàng mẫu 30 ngày...');

  // 1. Xoá sạch dữ liệu cũ nếu force = true
  if (force) {
    db.exec(`
      DELETE FROM intake_logs;
      DELETE FROM daily_vitals;
      DELETE FROM medicines;
      DELETE FROM caregiver_profile;
    `);
  }

  // 2. Thêm danh mục thuốc mẫu thực tế cho người cao tuổi
  const sampleMedicines = [
    {
      id: 'med_amlodipine',
      name: 'Amlodipine (Norvasc)',
      dosage: '5mg - 1 Tablet',
      reminderTimes: ['08:00'],
      daysOfWeek: ['ALL'],
      stockCount: 24,
      type: 'medication' as const,
    },
    {
      id: 'med_metformin',
      name: 'Metformin HCl',
      dosage: '500mg - Oral',
      reminderTimes: ['08:00', '18:00'],
      daysOfWeek: ['ALL'],
      stockCount: 42,
      type: 'medication' as const,
    },
    {
      id: 'med_atorvastatin',
      name: 'Atorvastatin (Lipitor)',
      dosage: '20mg - Evening',
      reminderTimes: ['20:00'],
      daysOfWeek: ['ALL'],
      stockCount: 4,
      type: 'medication' as const,
    },
    {
      id: 'med_aspirin',
      name: 'Baby Aspirin Cardio',
      dosage: '81mg - Chewable',
      reminderTimes: ['12:00'],
      daysOfWeek: ['ALL'],
      stockCount: 30,
      type: 'medication' as const,
    },
  ];

  for (const med of sampleMedicines) {
    await MedicineRepo.addMedicine(med);
  }

  // Khởi tạo thông tin người chăm sóc
  db.prepare(`
    INSERT OR REPLACE INTO caregiver_profile (id, name, email, updated_at)
    VALUES ('primary', 'Sarah Connor (Daughter)', 'sarah.connor@gmail.com', ?)
  `).run(new Date().toISOString());

  // 3. Sinh 30 ngày chỉ số sinh tồn (Vitals) & Nhật ký uống thuốc (Logs)
  const today = new Date();
  const notesLibrary = [
    'Took after breakfast with full glass of water.',
    'Slight morning dizziness reported, passed after 15 mins.',
    'Blood pressure steady today.',
    'Feeling energetic after walking in the garden.',
    'Slight fatigue in the evening.',
    'Taken on time.',
  ];

  const seedTransaction = db.transaction(() => {
    const insertLogStmt = db.prepare(`
      INSERT OR REPLACE INTO intake_logs (id, medicine_id, date, time, status, taken_at, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // --- SINH CHỈ SỐ SINH TỒN THEO SÓNG SIN TỰ NHIÊN ---
      // Tạo đường cong huyết áp và đường huyết có độ dao động sinh lý học
      const systolic = Math.round(124 + 9 * Math.sin(i * 0.35) + (Math.random() * 4 - 2));
      const diastolic = Math.round(80 + 5 * Math.sin(i * 0.35 + 0.5) + (Math.random() * 3 - 1.5));
      const bloodSugar = Number((105 + 14 * Math.sin(i * 0.28) + (Math.random() * 6 - 3)).toFixed(1));
      const heartRate = Math.round(72 + 6 * Math.sin(i * 0.45) + (Math.random() * 4 - 2));

      VitalsRepo.saveVitals({
        date: dateStr,
        systolic,
        diastolic,
        bloodSugar,
        heartRate,
        updatedAt: d.toISOString(),
      });

      // --- SINH LOG UỐNG THUỐC ---
      for (const med of sampleMedicines) {
        for (const time of med.reminderTimes) {
          const logId = `log_${dateStr}_${med.id}_${time.replace(':', '')}`;
          const isToday = i === 0;

          let status: 'taken' | 'pending' | 'skipped' = 'taken';
          let takenAt: string | null = time;
          let note: string | null = null;

          if (isToday) {
            // Hôm nay: cữ sáng đã uống, cữ chiều/tối để pending
            const currentHour = today.getHours();
            const logHour = parseInt(time.split(':')[0], 10);
            if (logHour > currentHour) {
              status = 'pending';
              takenAt = null;
            }
          } else {
            // Quá khứ: tỷ lệ tuân thủ 92% (thỉnh thoảng skipped)
            const randomVal = Math.random();
            if (randomVal > 0.92) {
              status = 'skipped';
              takenAt = null;
              note = 'Forgot dose while visiting relatives.';
            } else {
              // 30% trường hợp có ghi chú lâm sàng ngẫu nhiên
              if (Math.random() > 0.7) {
                note = notesLibrary[Math.floor(Math.random() * notesLibrary.length)];
              }
            }
          }

          insertLogStmt.run(
            logId,
            med.id,
            dateStr,
            time,
            status,
            takenAt,
            note,
            d.toISOString()
          );
        }
      }
    }
  });

  seedTransaction();
  console.log('>>> [Seed Hoàn tất] Đã tạo 4 loại thuốc, 30 ngày chỉ số sinh tồn và lịch sử tuân thủ mẫu!');
}