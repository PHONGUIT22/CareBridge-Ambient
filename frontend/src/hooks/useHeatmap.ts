'use client';

import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { DailyLogItem, VitalsRecord, MedicineRecord } from '../types';
import { PunchMatrixCell } from '../components/MedicationPunchCard';

export interface MedicineHeatmapItem {
  id: string;
  name: string;
  dosage: string;
  scheduledTime: string;
  streakDays: number;
  completedDoses: number;
  totalScheduled: number;
  adherenceRate: number;
  matrixData: PunchMatrixCell[];
}

export function useHeatmap() {
  const [medicines, setMedicines] = useState<MedicineHeatmapItem[]>([]);
  const [rawLogs, setRawLogs] = useState<DailyLogItem[]>([]);
  const [rawVitals, setRawVitals] = useState<VitalsRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmapData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [historyData, medicinesData] = await Promise.all([
        mcpClient.getHistory(),
        mcpClient.getMedicines(),
      ]);

      const logs: DailyLogItem[] = historyData.logs || [];
      const vitals: VitalsRecord[] = historyData.vitals || [];
      const medList: MedicineRecord[] = medicinesData.medicines || [];

      setRawLogs(logs);
      setRawVitals(vitals);

      // Generate 56-day date list (7 days * 8 weeks) ending today
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const dateList: string[] = [];

      for (let i = 56 - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dateList.push(d.toISOString().split('T')[0]);
      }

      // Compute 8-week matrix and stats for every medicine
      const heatmapItems: MedicineHeatmapItem[] = medList.map((med) => {
        const medLogs = logs.filter(
          (l) =>
            l.medicineId === med.id ||
            l.name.toLowerCase().includes(med.name.toLowerCase()) ||
            med.name.toLowerCase().includes(l.name.toLowerCase())
        );

        // 1. Calculate streak days backwards from today
        let streak = 0;
        let streakBroken = false;

        for (let i = dateList.length - 1; i >= 0; i--) {
          const date = dateList[i];
          const logsForDay = medLogs.filter((l) => l.date === date);

          if (logsForDay.length > 0) {
            const hasTaken = logsForDay.some((l) => l.status === 'taken');
            if (hasTaken) {
              if (!streakBroken) streak++;
            } else if (date < todayStr) {
              streakBroken = true;
            }
          } else if (date < todayStr && medLogs.some((l) => l.date < date)) {
            streakBroken = true;
          }
        }

        // 2. Compute completed doses and adherence rate
        const totalScheduled = medLogs.length;
        const completedDoses = medLogs.filter((l) => l.status === 'taken').length;
        const adherenceRate =
          totalScheduled > 0
            ? Math.round((completedDoses / totalScheduled) * 100)
            : 100;

        // 3. Construct 56-cell punch matrix (7 rows x 8 cols)
        const matrixData: PunchMatrixCell[] = dateList.map((dateStr, idx) => {
          const dayIdx = idx % 7;
          const weekIdx = Math.floor(idx / 7);
          const isToday = dateStr === todayStr;
          const dayLogs = medLogs.filter((l) => l.date === dateStr);

          let status: 'taken' | 'missed' | 'empty' | 'today' = 'empty';

          if (isToday) {
            const isTakenToday = dayLogs.some((l) => l.status === 'taken');
            status = isTakenToday ? 'taken' : 'today';
          } else if (dayLogs.length > 0) {
            const isTaken = dayLogs.some((l) => l.status === 'taken');
            status = isTaken ? 'taken' : 'missed';
          } else if (
            dateStr < todayStr &&
            medLogs.some((l) => l.date <= dateStr)
          ) {
            status = 'missed';
          } else {
            status = 'empty';
          }

          return {
            dayIndex: dayIdx,
            weekIndex: weekIdx,
            dateStr,
            status,
          };
        });

        return {
          id: med.id,
          name: med.name,
          dosage: med.dosage,
          scheduledTime: med.reminderTimes?.[0] || '08:00',
          streakDays: Math.max(streak, completedDoses > 0 ? 1 : 0),
          completedDoses,
          totalScheduled,
          adherenceRate,
          matrixData,
        };
      });

      setMedicines(heatmapItems);
    } catch (err: any) {
      console.warn('Failed to compute heatmap:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  return {
    medicines,
    rawLogs,
    rawVitals,
    loading,
    error,
    refetch: fetchHeatmapData,
  };
}
