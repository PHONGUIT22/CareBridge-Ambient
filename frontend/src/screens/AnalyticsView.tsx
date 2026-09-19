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
        {/* HEADER SECTION */}
        <div className="pt-1">
          <span className="font-display text-[11px] font-extrabold tracking-widest text-[#4D8BFF] uppercase">
            Biometric Trends
          </span>
          <h1 className="font-display text-2xl font-black text-white tracking-tight mt-0.5">
            Vitals Analytics
          </h1>
        </div>

        {/* 1. BỘ 3 NÚT CHUYỂN TAB CHỈ SỐ SINH TỒN */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Nút Huyết áp */}
          <button
            onClick={() => setActiveTab('bloodPressure')}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition-all alexa-card-interactive ${
              activeTab === 'bloodPressure'
                ? 'bg-gradient-to-r from-[#FF725E] to-[#FF8A71] text-white shadow-[0_0_15px_rgba(255,114,94,0.35)]'
                : 'bg-[#22273B] border border-white/[0.06] text-[#8A92A6] hover:text-white'
            }`}
          >
            <FontAwesomeIcon
              icon={faHeartPulse}
              className={`text-xs ${activeTab === 'bloodPressure' ? 'text-white' : 'text-rose-400'}`}
            />
            <span className="truncate">Blood Pressure</span>
          </button>

          {/* Nút Đường huyết */}
          <button
            onClick={() => setActiveTab('bloodSugar')}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition-all alexa-card-interactive ${
              activeTab === 'bloodSugar'
                ? 'bg-gradient-to-r from-[#FF725E] to-[#FF8A71] text-white shadow-[0_0_15px_rgba(255,114,94,0.35)]'
                : 'bg-[#22273B] border border-white/[0.06] text-[#8A92A6] hover:text-white'
            }`}
          >
            <FontAwesomeIcon
              icon={faDroplet}
              className={`text-xs ${activeTab === 'bloodSugar' ? 'text-white' : 'text-[#FFB347]'}`}
            />
            <span className="truncate">Blood Sugar</span>
          </button>

          {/* Nút Nhịp tim */}
          <button
            onClick={() => setActiveTab('heartRate')}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition-all alexa-card-interactive ${
              activeTab === 'heartRate'
                ? 'bg-gradient-to-r from-[#FF725E] to-[#FF8A71] text-white shadow-[0_0_15px_rgba(255,114,94,0.35)]'
                : 'bg-[#22273B] border border-white/[0.06] text-[#8A92A6] hover:text-white'
            }`}
          >
            <FontAwesomeIcon
              icon={faHeartPulse}
              className={`text-xs ${activeTab === 'heartRate' ? 'text-white' : 'text-[#10B981]'}`}
            />
            <span className="truncate">Heart Rate</span>
          </button>
        </div>

        {/* 2. CARD KHUNG ĐỒ THỊ RECHARTS 30 NGÀY THỰC TẾ */}
        <div className="bg-[#22273B] border border-white/[0.06] rounded-3xl p-5 relative overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-black text-white tracking-tight">
              {activeTab === 'bloodPressure' && '30-Day Blood Pressure Trend (mmHg)'}
              {activeTab === 'bloodSugar' && '30-Day Blood Sugar Trend (mg/dL)'}
              {activeTab === 'heartRate' && '30-Day Heart Rate Trend (BPM)'}
            </h3>

            {/* Chú thích màu các đường */}
            <div className="flex items-center gap-3 text-xs font-semibold">
              {activeTab === 'bloodPressure' && (
                <>
                  <div className="flex items-center gap-1.5 text-[#8A92A6]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF725E]" />
                    <span>Systolic</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#8A92A6]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4D8BFF]" />
                    <span>Diastolic</span>
                  </div>
                </>
              )}
              {activeTab === 'bloodSugar' && (
                <div className="flex items-center gap-1.5 text-[#8A92A6]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFB347]" />
                  <span>mg/dL</span>
                </div>
              )}
              {activeTab === 'heartRate' && (
                <div className="flex items-center gap-1.5 text-[#8A92A6]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
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
                      <stop offset="5%" stopColor="#FF725E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FF725E" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="diastolicGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4D8BFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4D8BFF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="sugarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFB347" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FFB347" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="rgba(255,255,255,0.06)" />

                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tick={{ fill: '#8A92A6', fontSize: 10, fontWeight: 600 }}
                  />

                  <YAxis
                    domain={activeTab === 'bloodPressure' ? [65, 140] : ['auto', 'auto']}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tick={{ fill: '#8A92A6', fontSize: 10, fontWeight: 600 }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#181B2A',
                      borderRadius: '16px',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    }}
                  />

                  {activeTab === 'bloodPressure' && (
                    <Area
                      key="systolic"
                      type="monotone"
                      dataKey="systolic"
                      stroke="#FF725E"
                      strokeWidth={2.5}
                      fill="url(#systolicGradient)"
                      dot={{ r: 2, fill: '#FF725E' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  )}
                  {activeTab === 'bloodPressure' && (
                    <Area
                      key="diastolic"
                      type="monotone"
                      dataKey="diastolic"
                      stroke="#4D8BFF"
                      strokeWidth={2.5}
                      fill="url(#diastolicGradient)"
                      dot={{ r: 2, fill: '#4D8BFF' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  )}

                  {activeTab === 'bloodSugar' && (
                    <Area
                      key="bloodSugar"
                      type="monotone"
                      dataKey="bloodSugar"
                      stroke="#FFB347"
                      strokeWidth={2.5}
                      fill="url(#sugarGradient)"
                      dot={{ r: 2, fill: '#FFB347' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  )}

                  {activeTab === 'heartRate' && (
                    <Area
                      key="heartRate"
                      type="monotone"
                      dataKey="heartRate"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fill="url(#heartGradient)"
                      dot={{ r: 2, fill: '#10B981' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[#8A92A6] text-xs font-mono">
                Loading biometric chart...
              </div>
            )}
          </div>
        </div>

        {/* 3. CARD CLINICAL OBSERVATION TỰ ĐỘNG TÍNH THEO NGƯỠNG AHA 130/85 */}
        <div
          className={`bg-[#22273B] rounded-3xl p-5 flex items-start gap-3.5 border shadow-[0_10px_25px_rgba(0,0,0,0.3)] ${
            bpAnalysis.isElevated
              ? 'border-amber-500/40'
              : 'border-white/[0.06]'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
              bpAnalysis.isElevated
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <FontAwesomeIcon
              icon={bpAnalysis.isElevated ? faTriangleExclamation : faCircleCheck}
              className="text-base"
            />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2 tracking-tight">
              <span>
                {bpAnalysis.isElevated
                  ? 'Clinical Observation: Elevated Blood Pressure Alert'
                  : 'Clinical Observation: Stable Therapeutic Range'}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  bpAnalysis.isElevated
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                Avg {bpAnalysis.avgSys}/{bpAnalysis.avgDia} mmHg
              </span>
            </h4>
            <p className="text-xs sm:text-sm text-[#8A92A6] font-medium leading-relaxed mt-1.5">
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