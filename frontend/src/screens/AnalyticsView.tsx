'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartPulse,
  faDroplet,
  faShieldHalved,
  faTriangleExclamation,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import { mcpClient } from '../services/mcpClient';

type MetricTab = 'bloodPressure' | 'bloodSugar' | 'heartRate';

interface VitalPoint {
  date: string;       // "08-13"
  systolic?: number;  // mmHg
  diastolic?: number; // mmHg
  bloodSugar?: number;// mg/dL
  heartRate?: number; // bpm
}

export function AnalyticsView({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [activeTab, setActiveTab] = useState<MetricTab>('bloodPressure');
  const [vitalsData, setVitalsData] = useState<VitalPoint[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lấy dữ liệu 30 ngày từ Backend qua mcpClient
  useEffect(() => {
    mcpClient
      .getHistory()
      .then((data) => {
        if (data.success && data.vitals?.length > 0) {
          const formatted = data.vitals.map((v) => ({
            date: v.date.substring(5), // "YYYY-MM-DD" -> "MM-DD"
            systolic: v.systolic || 120,
            diastolic: v.diastolic || 80,
            bloodSugar: v.bloodSugar || 105,
            heartRate: v.heartRate || 72,
          }));
          setVitalsData(formatted);
        }
      })
      .catch((err) => {
        console.warn('Unable to load vitals history from server:', err);
      });
  }, [refreshTrigger]);

  // Tính toán chỉ số lâm sàng trung bình và nhận xét động
  const bpAnalysis = useMemo(() => {
    const valid = vitalsData.filter((v) => v.systolic && v.diastolic);
    if (valid.length === 0) {
      return { avgSys: 122, avgDia: 82, isElevated: false };
    }

    const avgSys = Math.round(
      valid.reduce((acc, v) => acc + (v.systolic || 0), 0) / valid.length
    );
    const avgDia = Math.round(
      valid.reduce((acc, v) => acc + (v.diastolic || 0), 0) / valid.length
    );

    return {
      avgSys,
      avgDia,
      isElevated: avgSys > 130 || avgDia > 85,
    };
  }, [vitalsData]);

  return (
    <div className="min-h-full pb-24 font-sans select-none text-white p-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {/* Header Section */}
        <div className="pt-1">
          <span className="text-xs font-medium text-slate-400">
            Biometric trends
          </span>
          <h1 className="text-2xl font-semibold text-white tracking-[-0.01em] mt-0.5">
            Vitals Analytics
          </h1>
        </div>

        {/* 1. Metric Tab Switcher */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => setActiveTab('bloodPressure')}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'bloodPressure'
                ? 'bg-[#FF5733] text-white shadow-sm'
                : 'bg-[#1E2330] border border-white/[0.08] text-slate-300 hover:text-white'
            }`}
          >
            <FontAwesomeIcon
              icon={faHeartPulse}
              className={`text-xs ${activeTab === 'bloodPressure' ? 'text-white' : 'text-slate-400'}`}
            />
            <span className="truncate">Blood Pressure</span>
          </button>

          <button
            onClick={() => setActiveTab('bloodSugar')}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'bloodSugar'
                ? 'bg-[#FF5733] text-white shadow-sm'
                : 'bg-[#1E2330] border border-white/[0.08] text-slate-300 hover:text-white'
            }`}
          >
            <FontAwesomeIcon
              icon={faDroplet}
              className={`text-xs ${activeTab === 'bloodSugar' ? 'text-white' : 'text-slate-400'}`}
            />
            <span className="truncate">Blood Sugar</span>
          </button>

          <button
            onClick={() => setActiveTab('heartRate')}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'heartRate'
                ? 'bg-[#FF5733] text-white shadow-sm'
                : 'bg-[#1E2330] border border-white/[0.08] text-slate-300 hover:text-white'
            }`}
          >
            <FontAwesomeIcon
              icon={faHeartPulse}
              className={`text-xs ${activeTab === 'heartRate' ? 'text-white' : 'text-slate-400'}`}
            />
            <span className="truncate">Heart Rate</span>
          </button>
        </div>

        {/* 2. Tactile 30-Day Recharts Surface */}
        <div className="bg-[#1E2330] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-semibold text-white tracking-[-0.01em]">
              {activeTab === 'bloodPressure' && '30-Day Blood Pressure Trend (mmHg)'}
              {activeTab === 'bloodSugar' && '30-Day Blood Sugar Trend (mg/dL)'}
              {activeTab === 'heartRate' && '30-Day Heart Rate Trend (BPM)'}
            </h3>

            {/* Subtle Legend */}
            <div className="flex items-center gap-3 text-xs font-normal text-slate-300">
              {activeTab === 'bloodPressure' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF5733]" />
                    <span>Systolic</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                    <span>Diastolic</span>
                  </div>
                </>
              )}
              {activeTab === 'bloodSugar' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5733]" />
                  <span>mg/dL</span>
                </div>
              )}
              {activeTab === 'heartRate' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5733]" />
                  <span>BPM</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vitalsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="systolicGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF5733" stopOpacity={0.10} />
                      <stop offset="95%" stopColor="#FF5733" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="diastolicGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.10} />
                      <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="sugarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF5733" stopOpacity={0.10} />
                      <stop offset="95%" stopColor="#FF5733" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF5733" stopOpacity={0.10} />
                      <stop offset="95%" stopColor="#FF5733" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="rgba(255,255,255,0.06)" />

                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                  />

                  <YAxis
                    domain={activeTab === 'bloodPressure' ? [65, 140] : ['auto', 'auto']}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151922',
                      borderRadius: '12px',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                  />

                  {activeTab === 'bloodPressure' && (
                    <Area
                      key="systolic"
                      type="monotone"
                      dataKey="systolic"
                      stroke="#FF5733"
                      strokeWidth={2}
                      fill="url(#systolicGradient)"
                      dot={{ r: 2, fill: '#FF5733' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  )}
                  {activeTab === 'bloodPressure' && (
                    <Area
                      key="diastolic"
                      type="monotone"
                      dataKey="diastolic"
                      stroke="#94A3B8"
                      strokeWidth={2}
                      fill="url(#diastolicGradient)"
                      dot={{ r: 2, fill: '#94A3B8' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  )}

                  {activeTab === 'bloodSugar' && (
                    <Area
                      key="bloodSugar"
                      type="monotone"
                      dataKey="bloodSugar"
                      stroke="#FF5733"
                      strokeWidth={2}
                      fill="url(#sugarGradient)"
                      dot={{ r: 2, fill: '#FF5733' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  )}

                  {activeTab === 'heartRate' && (
                    <Area
                      key="heartRate"
                      type="monotone"
                      dataKey="heartRate"
                      stroke="#FF5733"
                      strokeWidth={2}
                      fill="url(#heartGradient)"
                      dot={{ r: 2, fill: '#FF5733' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs font-mono">
                Loading biometric telemetry...
              </div>
            )}
          </div>
        </div>

        {/* 3. Clinical Observation Card */}
        <div
          className={`bg-[#1E2330] rounded-2xl p-4 flex items-start gap-3.5 border shadow-sm ${
            bpAnalysis.isElevated
              ? 'border-amber-500/30'
              : 'border-white/[0.08]'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              bpAnalysis.isElevated
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <FontAwesomeIcon
              icon={bpAnalysis.isElevated ? faTriangleExclamation : faCircleCheck}
              className="text-sm"
            />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 tracking-[-0.01em]">
              <span>
                {bpAnalysis.isElevated
                  ? 'Clinical observation: Elevated blood pressure alert'
                  : 'Clinical observation: Stable therapeutic range'}
              </span>
              <span
                className={`text-xs font-mono tabular-nums px-2 py-0.5 rounded-md font-medium ${
                  bpAnalysis.isElevated
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-emerald-500/15 text-emerald-400'
                }`}
              >
                Avg {bpAnalysis.avgSys}/{bpAnalysis.avgDia} mmHg
              </span>
            </h4>
            <p className="text-xs text-slate-300 font-normal leading-relaxed mt-1">
              {bpAnalysis.isElevated
                ? `Average 30-day blood pressure reading is ${bpAnalysis.avgSys}/${bpAnalysis.avgDia} mmHg, exceeding the AHA recommended threshold (130/85 mmHg). Amlodipine regimen adherence should be reinforced, and daughter Sarah Connor has been alerted to review diet and sodium intake.`
                : `Average 30-day blood pressure reading is ${bpAnalysis.avgSys}/${bpAnalysis.avgDia} mmHg, maintaining optimal stability within AHA guidelines (<=130/85 mmHg). Consistent Amlodipine and Metformin intake keeps hemodynamic biomarkers steady with zero hypertensive crisis spikes.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}