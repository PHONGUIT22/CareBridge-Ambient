// backend-mcp/src/types/index.ts

export type LogStatus = 'pending' | 'taken' | 'skipped';

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

export interface DailyLogItem {
  logId: string;
  medicineId: string;
  name: string;
  dosage: string;
  scheduledTime: string;
  date: string;
  status: LogStatus;
  isTaken: boolean;
  takenAt?: string;
  notes?: string;
  imageUri?: string;
  stockCount?: number;
  type?: 'medication' | 'routine';
}

export interface VitalsRecord {
  date: string;
  systolic?: number | null;
  diastolic?: number | null;
  bloodSugar?: number | null;
  heartRate?: number | null;
  updatedAt: string;
}

export interface CaregiverProfile {
  name: string;
  email: string;
  phone?: string;
}