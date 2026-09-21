import { getDatabase } from './db.js';
import { MedicineRepo } from './medicineRepo.js';
import { VitalsRepo } from './vitalsRepo.js';

export async function seedDemoData(force: boolean = false): Promise<void> {
  const db = getDatabase();

  // Check if medication records already exist
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM medicines').get() as { count: number };
  if (existingCount.count > 0 && !force) {
    console.log('[Seed] Database already contains records, skipping seeder.');
    return;
  }

  console.log('[Seed] Initializing 30-day clinical sample dataset...');

  // 1. Clear existing data if force = true
  if (force) {
    db.exec(`
      DELETE FROM intake_logs;
      DELETE FROM daily_vitals;
      DELETE FROM medicines;
      DELETE FROM caregiver_profile;
    `);
  }

  // 2. Add realistic geriatric medication regimen
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

  // Initialize designated family caregiver profile
  db.prepare(`
    INSERT OR REPLACE INTO caregiver_profile (id, name, email, updated_at)
    VALUES ('primary', 'Sarah Connor (Daughter)', 'sarah.connor@gmail.com', ?)
  `).run(new Date().toISOString());

  // 3. Generate 30 days of daily vitals and medication intake logs
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

      // --- GENERATE VITALS USING REALISTIC BIOMETRIC SINE-WAVE CURVES ---
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

      // --- GENERATE MEDICATION INTAKE LOGS ---
      for (const med of sampleMedicines) {
        for (const time of med.reminderTimes) {
          const logId = `log_${dateStr}_${med.id}_${time.replace(':', '')}`;
          const isToday = i === 0;

          let status: 'taken' | 'pending' | 'skipped' = 'taken';
          let takenAt: string | null = time;
          let note: string | null = null;

          if (isToday) {
            // Today: morning doses taken, afternoon/evening doses pending
            const currentHour = today.getHours();
            const logHour = parseInt(time.split(':')[0], 10);
            if (logHour > currentHour) {
              status = 'pending';
              takenAt = null;
            }
          } else {
            // Past history: ~92% adherence rate (occasional skipped dose)
            const randomVal = Math.random();
            if (randomVal > 0.92) {
              status = 'skipped';
              takenAt = null;
              note = 'Forgot dose while visiting relatives.';
            } else {
              // 30% chance of random clinical note
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
  console.log('>>> [Seed Complete] Created 4 medications, 30 days of biometric vitals and sample adherence logs!');
}