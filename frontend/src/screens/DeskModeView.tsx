'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SeniorClock } from '../components/SeniorClock';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { DailyLogItem } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVolumeHigh,
  faCheck,
  faCapsules,
  faShieldHalved,
  faChevronRight,
  faHeartPulse,
} from '@fortawesome/free-solid-svg-icons';
import confetti from 'canvas-confetti';

interface DeskModeViewProps {
  onSwitchToCaregiver?: () => void;
  onTakeDose?: (logId: string) => void;
  refreshTrigger?: number;
}

export function DeskModeView({
  onSwitchToCaregiver,
  onTakeDose,
  refreshTrigger = 0,
}: DeskModeViewProps) {
  const [schedule, setSchedule] = useState<DailyLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mcpClient.getTodayData();
      if (data?.schedule) {
        setSchedule(data.schedule);
      }
    } catch (e) {
      console.warn('DeskModeView: failed to fetch today schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [refreshTrigger, fetchSchedule]);

  // Tự động tìm cữ thuốc kế tiếp cần uống dựa theo thời gian thực (Next pending dose based on current time)
  const upcomingDose = useMemo(() => {
    const pendingList = schedule.filter((s) => s.status === 'pending');
    if (pendingList.length === 0) return null;

    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Tìm cữ thuốc pending sắp đến gần nhất (ưu tiên cữ chưa quá giờ hoặc cữ trễ gần nhất)
    const sorted = [...pendingList].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    const nextAfterNow = sorted.find((s) => s.scheduledTime >= currentHourMin);

    return nextAfterNow || sorted[0];
  }, [schedule]);

  const totalDoses = schedule.length || 1;
  const completedDoses = schedule.filter((s) => s.status === 'taken').length;
  const progressPercent = Math.round((completedDoses / totalDoses) * 100);

  const handleSpeakMedicine = () => {
    if (!upcomingDose) return;
    const textToSpeak = `Alexa reminder. Time for your scheduled medication: ${upcomingDose.name}, ${upcomingDose.dosage}.`;
    speechService.speak(textToSpeak);
  };

  const handleTakePill = async () => {
    if (!upcomingDose) return;

    confetti({
      particleCount: 100,
      spread: 75,
      origin: { y: 0.75 },
      colors: ['#00CAFF', '#10B981', '#38BDF8', '#F59E0B'],
    });

    const takingLogId = upcomingDose.logId;
    const medName = upcomingDose.name;

    // Cập nhật trạng thái lạc quan ngay lập tức
    setSchedule((prev) =>
      prev.map((item) =>
        item.logId === takingLogId
          ? { ...item, status: 'taken', isTaken: true, takenAt: new Date().toLocaleTimeString() }
          : item
      )
    );

    speechService.speak(`Great job! I've marked your ${medName} as taken.`);

    try {
      await mcpClient.toggleDose(takingLogId, 'pending');
      await fetchSchedule();
    } catch (err) {
      console.warn('Persisted toggle locally');
    }

    if (onTakeDose) {
      onTakeDose(takingLogId);
    }
  };

  return (
    <div className="min-h-full text-white flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden font-sans">
      {/* 1. TOP STATUS BAR */}
      <div className="flex items-center justify-between w-full max-w-lg mx-auto pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E2330] border border-white/[0.08] text-slate-300 text-xs font-medium shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>Ambient Nightstand</span>
        </div>

        <button
          onClick={onSwitchToCaregiver}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1E2330] hover:bg-[#252B3B] text-slate-300 hover:text-white text-xs font-medium transition-colors border border-white/[0.08] shadow-sm"
        >
          <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-[#FF5733]" />
          <span>Caregiver Hub</span>
          <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
        </button>
      </div>

      {/* 2. SENIOR CLOCK */}
      <div className="my-auto py-6">
        <SeniorClock />
      </div>

      {/* 3. UPCOMING DOSE CARD & ACTION BUTTON */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4 pb-4">
        {/* Compliance Progress Track */}
        <div className="bg-[#1E2330] rounded-2xl p-3.5 border border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium mb-2">
            <span className="text-slate-300">Today&apos;s adherence</span>
            <span className="text-white font-mono tabular-nums font-bold">
              {completedDoses} / {totalDoses} doses ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF5733] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Next Dose Card or Completed Notice */}
        {upcomingDose ? (
          <div className="bg-[#1E2330] rounded-2xl p-5 border border-[#FF5733] shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#151922] border border-white/[0.08] flex items-center justify-center text-[#FF5733] shrink-0">
                  <FontAwesomeIcon icon={faCapsules} className="text-lg" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#FF5733]">
                    Upcoming dose at {upcomingDose.scheduledTime}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white mt-0.5 tracking-[-0.01em]">
                    {upcomingDose.name}
                  </h2>
                  <p className="text-xs text-slate-300 font-normal leading-relaxed">{upcomingDose.dosage}</p>
                </div>
              </div>

              {/* Alexa TTS Read-Aloud Button */}
              <button
                onClick={handleSpeakMedicine}
                className="w-11 h-11 rounded-xl bg-[#151922] hover:bg-[#252B3B] text-slate-300 hover:text-white border border-white/[0.08] flex items-center justify-center transition-colors active:scale-95 shrink-0 shadow-sm"
                title="Hear Alexa read medication name"
              >
                <FontAwesomeIcon icon={faVolumeHigh} className="text-base" />
              </button>
            </div>

            {/* Tactile Signal Coral Button */}
            <button
              onClick={handleTakePill}
              className="w-full py-4 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] text-white font-semibold text-base tracking-normal flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] transition-all"
            >
              <FontAwesomeIcon icon={faCheck} className="text-lg" />
              <span>I Took My Pill</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#1E2330] rounded-2xl p-6 text-center border border-white/[0.08] shadow-sm">
            <FontAwesomeIcon
              icon={faHeartPulse}
              className="text-3xl text-[#FF5733] mx-auto mb-2"
            />
            <h3 className="text-base font-semibold text-white tracking-[-0.01em]">All Medications Completed</h3>
            <p className="text-xs text-slate-300 mt-1 font-normal leading-relaxed">
              All {schedule.length} scheduled doses for today are logged. Rest well!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}