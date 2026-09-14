'use client';

import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { DailyLogItem, VitalsRecord, LogStatus } from '../types';

export function useMedicines() {
  const [schedule, setSchedule] = useState<DailyLogItem[]>([]);
  const [vitals, setVitals] = useState<VitalsRecord | null>(null);
  const [caregiverName, setCaregiverName] = useState<string>('Sarah Connor (Daughter)');
  const [adherenceRate, setAdherenceRate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mcpClient.getTodayData();
      if (data.schedule) {
        setSchedule(data.schedule);
      }
      if (data.vitals) {
        setVitals(data.vitals);
      }
      if (data.caregiver?.name) {
        setCaregiverName(data.caregiver.name);
      }
      if (data.adherenceRate !== undefined) {
        setAdherenceRate(data.adherenceRate);
      }
      setIsOnline(true);
      return data;
    } catch (error) {
      console.warn('Backend MCP unreachable, using offline fallback');
      setIsOnline(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  /**
   * Reactive toggle with immediate optimistic UI flip and graceful rollback
   */
  const toggleDoseStatus = useCallback(
    async (logId: string, currentStatus: string) => {
      const isNowTaken = currentStatus !== 'taken';
      const nowTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      // Lưu snapshot để rollback khi gặp sự cố backend
      let previousSchedule: DailyLogItem[] = [];
      let previousAdherence = 0;

      // 1. Instant optimistic update locally (0ms perceived latency)
      setSchedule((prev) => {
        previousSchedule = prev;
        const prevTaken = prev.filter((s) => s.status === 'taken').length;
        previousAdherence = prev.length > 0 ? Math.round((prevTaken / prev.length) * 100) : 0;

        const updated = prev.map((item) => {
          if (item.logId === logId) {
            return {
              ...item,
              status: (isNowTaken ? 'taken' : 'pending') as LogStatus,
              isTaken: isNowTaken,
              takenAt: isNowTaken ? nowTime : undefined,
              stockCount:
                item.stockCount !== undefined
                  ? isNowTaken
                    ? Math.max(0, item.stockCount - 1)
                    : item.stockCount + 1
                  : 30,
            };
          }
          return item;
        });

        // Recalculate adherence rate immediately
        const takenCount = updated.filter((s) => s.status === 'taken').length;
        const total = updated.length;
        if (total > 0) {
          setAdherenceRate(Math.round((takenCount / total) * 100));
        }

        return updated;
      });

      // 2. Sync with backend SQLite
      try {
        await mcpClient.toggleDose(logId, currentStatus);
        setIsOnline(true);
      } catch (err: any) {
        console.warn('Backend sync failed, rolling back optimistic state gracefully:', err.message);
        setSchedule(previousSchedule);
        setAdherenceRate(previousAdherence);
        setIsOnline(false);
        throw err;
      }
    },
    []
  );

  const saveNote = useCallback(async (logId: string, notes: string) => {
    setSchedule((prev) =>
      prev.map((item) => (item.logId === logId ? { ...item, notes } : item))
    );

    try {
      await mcpClient.saveDoseNote(logId, notes);
    } catch (err) {
      console.warn('Failed to persist note.');
    }
  }, []);

  const recordVitals = useCallback(async (newVitals: Partial<VitalsRecord>) => {
    setVitals((prev) => ({
      date: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      ...prev,
      ...newVitals,
    }));

    try {
      await mcpClient.recordVitals(newVitals);
      const fresh = await mcpClient.getTodayData();
      if (fresh?.vitals) setVitals(fresh.vitals);
    } catch (err) {
      console.warn('Failed to persist vitals.');
    }
  }, []);

  const mutate = useCallback(
    (updater: (prev: DailyLogItem[]) => DailyLogItem[]) => {
      setSchedule((prev) => {
        const next = updater(prev);
        const taken = next.filter((s) => s.status === 'taken').length;
        if (next.length > 0) {
          setAdherenceRate(Math.round((taken / next.length) * 100));
        }
        return next;
      });
    },
    []
  );

  return {
    schedule,
    vitals,
    caregiverName,
    adherenceRate,
    loading,
    isOnline,
    toggleDoseStatus,
    toggleDose: toggleDoseStatus, // Alias
    saveNote,
    recordVitals,
    refetch: fetchSchedule,
    mutate,
  };
}
