export type LogStatus = 'pending' | 'taken' | 'skipped';

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

export interface VitalRecord {
  date: string;
  systolic?: number | null;
  diastolic?: number | null;
  bloodSugar?: number | null;
  heartRate?: number | null;
  updatedAt?: string;
}

export type VitalsRecord = VitalRecord;

export interface CaregiverProfile {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  notificationPreferences?: {
    smsOnMissedDose?: boolean;
    smsOnDizziness?: boolean;
    dailyDigest?: boolean;
  };
}

export interface TodayDataResponse {
  success: boolean;
  date: string;
  adherenceRate: number;
  schedule: DailyLogItem[];
  vitals: VitalRecord | null;
  caregiver: CaregiverProfile | null;
  error?: string;
}

export interface HistoryDataResponse {
  success: boolean;
  logs: DailyLogItem[];
  vitals: VitalRecord[];
  error?: string;
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

export interface MedicinesResponse {
  success: boolean;
  medicines: MedicineRecord[];
  error?: string;
}

export interface DoseActionResponse {
  success: boolean;
  logId?: string;
  medicineName?: string;
  newStatus?: LogStatus;
  notes?: string | null;
  speechText?: string;
  message?: string;
  remainingStock?: number | null;
  lowStockAlert?: {
    medicineName: string;
    remainingStock: number;
    price: string;
    refillSuggested: boolean;
    suggestedAction: string;
  } | null;
  error?: string;
}

export interface SMSDispatchInfo {
  delivered: boolean;
  recipient: string;
  phone: string;
  timestamp: string;
  messageId: string;
  simulated?: boolean;
}

export interface ClinicalAdviceResponse {
  success: boolean;
  query?: string;
  assessment?: string;
  speechResponse: string;
  actionAdvice?: string;
  clinicalExplanation?: string;
  displayCardTitle?: string;
  urgencyLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  recommendedAction?: string;
  smsDispatch?: SMSDispatchInfo | null;
  richCard?: {
    type?: string;
    title: string;
    actionAdvice: string;
    advice?: string;
    clinicalExplanation?: string;
    urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
    recommendedAction?: string;
    smsDispatch?: SMSDispatchInfo;
  };
  bedrockModelUsed?: string;
  error?: string;
}

export interface AmazonRefillOrder {
  success: boolean;
  orderId: string;
  medicineName: string;
  dosage: string;
  quantityAdded: number;
  previousStock: number;
  newStockCount: number;
  estimatedDelivery: string;
  totalPrice: string;
  pharmacyName: string;
  shippingMethod: string;
  speechText: string;
  richCard?: {
    type: string;
    orderId: string;
    medicineName: string;
    dosage: string;
    quantity: number;
    totalPrice: string;
    estimatedDelivery: string;
    shippingMethod: string;
    pharmacyName: string;
    newStockCount: number;
  };
  error?: string;
}

