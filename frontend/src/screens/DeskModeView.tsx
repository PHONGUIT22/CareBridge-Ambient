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
  faBan,
  faHeartPulse,
  faClock,
  faCloudSun,
  faLock,
  faTemperatureHalf,
  faMoon,
  faSun,
} from '@fortawesome/free-solid-svg-icons';
import confetti from 'canvas-confetti';
import { GuardianSelector } from '../components/GuardianSelector';
import { soundFxService } from '../services/soundFxService';
import { isFutureDose } from '../components/MedicineCard';
import { AuthSession } from '../components/AuthGate';

interface DeskModeViewProps {
  authSession?: AuthSession | null;
  onSwitchToCaregiver?: () => void;
  onTakeDose?: (logId: string) => void;
  onTriggerGuardianRefusal?: (medicineName: string) => void;
  refreshTrigger?: number;
  patientName?: string;
}

export function DeskModeView({
  authSession,
  onSwitchToCaregiver,
  onTakeDose,
  onTriggerGuardianRefusal,
  refreshTrigger = 0,
  patientName,
}: DeskModeViewProps) {
  const effectivePatientName = authSession?.patientName || patientName;
  const [schedule, setSchedule] = useState<DailyLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isNightDimmer, setIsNightDimmer] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const contextualGreeting = useMemo(() => {
    const hour = new Date().getHours();
    const firstName = effectivePatientName ? effectivePatientName.split(' ')[0] : 'Eleanor';
    if (hour >= 5 && hour < 12) return `Good morning, ${firstName}`;
    if (hour >= 12 && hour < 17) return `Good afternoon, ${firstName}`;
    if (hour >= 17 && hour < 21) return `Good evening, ${firstName}`;
    return `Rest peacefully, ${firstName}`;
  }, [effectivePatientName]);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mcpClient.getSchedule();
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

  // Find next pending dose
  const upcomingDose = useMemo(() => {
    const pendingList = schedule.filter((s) => s.status === 'pending');
    if (pendingList.length === 0) return null;

    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const sorted = [...pendingList].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    const nextAfterNow = sorted.find((s) => s.scheduledTime >= currentHourMin);

    return nextAfterNow || sorted[0];
  }, [schedule]);

  const isUpcomingFuture = useMemo(() => {
    if (!upcomingDose) return false;
    return isFutureDose(upcomingDose.date, upcomingDose.scheduledTime) && upcomingDose.status === 'pending';
  }, [upcomingDose]);

  const totalDoses = schedule.length || 4;
  const completedDoses = schedule.filter((s) => s.status === 'taken').length;
  const progressPercent = Math.round((completedDoses / totalDoses) * 100);

  const handleSpeakMedicine = () => {
    if (!upcomingDose) return;
    const textToSpeak = `Alexa reminder. Time for your scheduled medication: ${upcomingDose.name}, ${upcomingDose.dosage}.`;
    speechService.speak(textToSpeak);
  };

  const handleTakePill = async () => {
    if (!upcomingDose) return;

    setShowConfetti(true);
    soundFxService.playPillClick();
    soundFxService.playCelebrationChord();

    try {
      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.75 },
        colors: ['#00CAFF', '#10B981', '#38BDF8', '#F59E0B'],
      });
    } catch (_) {}

    const takingLogId = upcomingDose.logId;
    const medName = upcomingDose.name;
    const wasFuture = isUpcomingFuture;

    setSchedule((prev) =>
      prev.map((item) =>
        item.logId === takingLogId
          ? { ...item, status: 'taken', isTaken: true, takenAt: new Date().toLocaleTimeString() }
          : item
      )
    );

    if (wasFuture) {
      speechService.speak(
        `Great job! I've marked your scheduled ${upcomingDose.scheduledTime} dose of ${medName} as taken early.`
      );
    } else {
      speechService.speak(`Great job! I've marked your ${medName} as taken.`);
    }

    try {
      await mcpClient.toggleDose(takingLogId, 'pending');
      await fetchSchedule();
    } catch (err) {
      console.warn('Persisted toggle locally');
    }

    if (onTakeDose) {
      onTakeDose(takingLogId);
    }

    setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
  };

  return (
    <div
      className={`min-h-full flex flex-col justify-between p-4 sm:p-6 select-none font-sans pb-28 transition-colors duration-500 relative ${
        isNightDimmer
          ? 'bg-[#020306] text-amber-100/90'
          : 'bg-[#050811] text-white'
      }`}
    >
      {/* Floating Celebration Toast on Dose Taken */}
      {showConfetti && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce">
          <div className="px-4 py-2 rounded-full bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 border border-emerald-300">
            <FontAwesomeIcon icon={faCheck} className="text-white" />
            <span>Dose Recorded! Great job!</span>
          </div>
        </div>
      )}

      {/* 1. TOP STATUS BAR (MATCHES image/8.png) */}
      <div className="flex items-center justify-between w-full max-w-lg mx-auto pt-1 gap-2 flex-wrap">
        {/* Senior Nightstand Mode Chip */}
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm border transition-colors ${
            isNightDimmer
              ? 'bg-amber-950/40 border-amber-900/60 text-amber-400'
              : 'bg-slate-900 border-slate-800 text-teal-400'
          }`}
        >
          <span className={`w-2 h-2 rounded-full animate-pulse ${isNightDimmer ? 'bg-amber-400' : 'bg-teal-400'}`} />
          <span>SENIOR NIGHTSTAND • {effectivePatientName ? effectivePatientName.toUpperCase() : 'PATIENT'}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Bedside Night Dimmer Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsNightDimmer(!isNightDimmer)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer active:scale-95 ${
              isNightDimmer
                ? 'bg-amber-950/60 text-amber-300 border-amber-700 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
            title="Toggle Bedside OLED Night Dimmer mode"
          >
            <FontAwesomeIcon icon={isNightDimmer ? faSun : faMoon} className={`text-xs ${isNightDimmer ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden xs:inline">{isNightDimmer ? 'Dimmer ON' : 'Night Dimmer'}</span>
          </button>

          {/* Caregiver Hub Button */}
          <button
            onClick={onSwitchToCaregiver}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-800 shadow-sm cursor-pointer"
          >
            <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-sky-400" />
            <span>Caregiver</span>
            <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
          </button>
        </div>
      </div>

      {/* 2. CONTEXTUAL GREETING & GIANT HARDWARE CLOCK */}
      <div className="my-auto py-6 flex flex-col items-center justify-center text-center">
        <p className={`text-sm sm:text-base font-medium tracking-wide mb-1 transition-colors ${
          isNightDimmer ? 'text-amber-400/90 font-mono' : 'text-sky-300/90 font-mono'
        }`}>
          {contextualGreeting}
        </p>
        <div className={isNightDimmer ? 'brightness-75 contrast-125' : ''}>
          <SeniorClock />
        </div>
      </div>

      {/* 3. ADHERENCE & UPCOMING DOSE CARDS (MATCHES image/8.png) */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
        {/* AMBIENT WEATHER & SECURITY GLANCE WIDGETS */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Weather & Indoor Climate */}
          <div className="bg-[#0B1528] rounded-2xl p-3 border border-blue-900/40 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-sm shrink-0 border border-sky-500/30">
              <FontAwesomeIcon icon={faCloudSun} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold text-xs">72°F</span>
                <span className="text-[10px] text-slate-400 truncate">Seattle, WA</span>
              </div>
              <p className="text-[10px] text-sky-300 font-mono mt-0.5 truncate">
                Partly Cloudy • Hum 45%
              </p>
            </div>
          </div>

          {/* Ring Smart Home & Security Glance */}
          <div className="bg-[#0B1528] rounded-2xl p-3 border border-blue-900/40 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm shrink-0 border border-emerald-500/30">
              <FontAwesomeIcon icon={faLock} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold text-xs">Front Door</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-emerald-300 font-mono mt-0.5 truncate">
                Ring Locked • AC: 70°F
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Progress Track Card (image/8.png) */}
        <div className="bg-[#0B1528] rounded-2xl p-4 border border-blue-900/40 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-slate-400 tracking-wider uppercase font-mono text-[11px]">
              TODAY&apos;S ADHERENCE
            </span>
            <span className="text-sky-400 font-mono tabular-nums">
              {completedDoses} / {totalDoses} Doses
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#10B981] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Active Health Guardian Persona Selector */}
        <div className="bg-[#0B1528] rounded-2xl p-3 border border-blue-900/40 shadow-sm">
          <GuardianSelector compact />
        </div>

        {/* Next Dose Card (image/8.png) */}
        {upcomingDose ? (
          <div className="border-2 border-blue-600/50 bg-[#0B1528] rounded-[24px] p-5 sm:p-6 shadow-xl relative">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <FontAwesomeIcon icon={faCapsules} className="text-xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                    UPCOMING DOSE AT {upcomingDose.scheduledTime}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5 tracking-tight">
                    {upcomingDose.name}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{upcomingDose.dosage} • Take 1 pill</p>
                </div>
              </div>

              {/* Alexa Audio Speaker Button */}
              <button
                onClick={handleSpeakMedicine}
                className="w-11 h-11 rounded-2xl bg-blue-600/30 text-sky-400 border border-blue-500/40 hover:bg-blue-600/50 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                title="Hear Alexa read medication reminder"
              >
                <FontAwesomeIcon icon={faVolumeHigh} className="text-base" />
              </button>
            </div>

            {/* Giant Action Button: I TOOK MY PILL or TAKE DOSE (EARLY) */}
            {isUpcomingFuture ? (
              <button
                type="button"
                onClick={handleTakePill}
                className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 hover:from-amber-600 hover:via-emerald-700 hover:to-teal-700 text-white font-black tracking-wide flex flex-col items-center justify-center gap-1 shadow-[0_4px_25px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all cursor-pointer border border-amber-300/40"
                title={`Take dose early (Scheduled for ${upcomingDose.scheduledTime})`}
              >
                <div className="flex items-center justify-center gap-2.5 text-lg sm:text-xl">
                  <FontAwesomeIcon icon={faCheck} className="stroke-[3]" />
                  <span>TAKE DOSE (EARLY)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/25 text-amber-100 text-xs font-semibold tracking-normal border border-amber-300/30">
                  <FontAwesomeIcon icon={faClock} className="text-[10px] text-amber-200" />
                  <span>Scheduled for {upcomingDose.scheduledTime} • Early Take</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTakePill}
                className="w-full py-4 sm:py-5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-black text-lg sm:text-xl tracking-wide flex items-center justify-center gap-3 shadow-[0_4px_25px_rgba(16,185,129,0.45)] active:scale-[0.98] transition-all cursor-pointer"
                title="Mark dose as taken"
              >
                <FontAwesomeIcon icon={faCheck} className="text-xl stroke-[3]" />
                <span>I TOOK MY PILL</span>
              </button>
            )}

            {/* Skip Dose Guardian Negotiation Button */}
            <button
              type="button"
              onClick={() => onTriggerGuardianRefusal?.(upcomingDose.name)}
              className="w-full mt-3 py-2.5 rounded-xl bg-transparent hover:bg-rose-500/10 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 border border-rose-500/30 active:scale-[0.98] transition-all"
              title="Trigger AI Health Guardian refusal negotiation flow"
            >
              <FontAwesomeIcon icon={faBan} className="text-xs text-rose-400" />
              <span>I don&apos;t want to take this pill (Skip Dose)</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#0B1528] rounded-[24px] p-6 text-center border border-blue-900/40 shadow-sm">
            <FontAwesomeIcon
              icon={faHeartPulse}
              className="text-3xl text-emerald-400 mx-auto mb-2"
            />
            <h3 className="text-base font-bold text-white tracking-tight">All Medications Completed</h3>
            <p className="text-xs text-slate-400 mt-1 font-normal">
              All {schedule.length} scheduled doses for today are logged. Rest well!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}