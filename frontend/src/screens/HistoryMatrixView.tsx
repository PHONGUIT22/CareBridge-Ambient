'use client';

import React, { useState, useEffect } from 'react';
import { MedicationPunchCard } from '../components/MedicationPunchCard';
import { useHeatmap } from '../hooks/useHeatmap';
import { pdfService } from '../services/pdfService';
import { mcpClient } from '../services/mcpClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileArrowDown, faCircleCheck, faArrowsRotate, faLock, faCrown } from '@fortawesome/free-solid-svg-icons';

interface HistoryMatrixViewProps {
  refreshTrigger?: number;
  isPro?: boolean;
  onOpenPaywall?: () => void;
}

export function HistoryMatrixView({
  refreshTrigger = 0,
  isPro = false,
  onOpenPaywall,
}: HistoryMatrixViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { medicines, rawLogs, rawVitals, loading, refetch } = useHeatmap();

  useEffect(() => {
    refetch();
  }, [refreshTrigger, refetch]);

  const handleDeleteMedicine = async (medId: string) => {
    try {
      await mcpClient.deleteMedicine(medId);
      await refetch();
    } catch (err) {
      console.error('Failed to delete medicine:', err);
    }
  };

  const handleExportPDF = () => {
    if (!isPro) {
      onOpenPaywall?.();
      return;
    }
    setIsExporting(true);
    try {
      const avgAdherence =
        medicines.length > 0
          ? Math.round(
              medicines.reduce((acc, m) => acc + m.adherenceRate, 0) / medicines.length
            )
          : 94;

      pdfService.generateDoctorReport({
        patientName: 'Eleanor Vance (Age 78)',
        caregiverName: 'Sarah Connor (Daughter)',
        adherenceRate: avgAdherence,
        logs: rawLogs,
        vitals: rawVitals,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-full text-white p-4 font-sans select-none pb-28">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {/* HEADER SECTION */}
        <div className="flex items-start justify-between pt-1">
          <div>
            <span className="text-xs font-mono font-medium text-slate-400">
              Compliance Telemetry Matrix
            </span>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mt-0.5">
              Medication History
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2.5 rounded-xl bg-[#1E2330] hover:bg-[#252B3B] border border-white/[0.08] text-slate-400 hover:text-white transition-all"
              title="Sync latest records"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="text-xs" />
            </button>

            {/* NÚT EXPORT PDF SỬ DỤNG JSPDF */}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-md ${
                isPro
                  ? 'bg-[#FF5733] hover:bg-[#E64D2E] text-white'
                  : 'bg-[#1E2330] hover:bg-[#252B3B] border border-amber-500/40 text-amber-300'
              }`}
              title={isPro ? 'Export PDF Report for Doctor' : 'Doctor PDF Export requires Clinical Pro'}
            >
              <FontAwesomeIcon icon={isPro ? faFileArrowDown : faLock} className="text-xs" />
              <span>{isExporting ? 'Generating PDF...' : isPro ? 'Export Doctor PDF' : 'Doctor PDF (Pro)'}</span>
            </button>
          </div>
        </div>

        {/* FREE TIER NOTICE FOR MATRIX */}
        {!isPro && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2.5 text-amber-300">
              <FontAwesomeIcon icon={faCrown} className="text-amber-400" />
              <span>
                <strong>Free Tier Active:</strong> 7-day adherence visible. Clinical Doctor PDF export is locked.
              </span>
            </div>
            <button
              onClick={onOpenPaywall}
              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-xs transition-colors shrink-0 shadow-sm active:scale-95"
            >
              Unlock Pro
            </button>
          </div>
        )}

        {/* DANH SÁCH CÁC THẺ PUNCH-CARD POPULATED BỞI useHeatmap */}
        <div className="flex flex-col gap-4 mt-2">
          {loading && medicines.length === 0 ? (
            <div className="bg-[#1E2330] border border-white/[0.08] rounded-2xl p-8 text-center text-slate-400 text-xs">
              Loading verified 30-day compliance logs...
            </div>
          ) : (
            medicines.map((med) => (
              <MedicationPunchCard
                key={med.id}
                medicineName={med.name}
                dosage={med.dosage}
                scheduledTime={med.scheduledTime}
                streakDays={med.streakDays}
                completedDoses={med.completedDoses}
                adherenceRate={med.adherenceRate}
                matrixData={med.matrixData}
                onDelete={() => handleDeleteMedicine(med.id)}
              />
            ))
          )}
        </div>

        {/* THÔNG BÁO LÂM SÀNG BẢO MẬT */}
        <div className="bg-[#1E2330] rounded-2xl p-4 border border-white/[0.08] flex items-center gap-3 mt-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <FontAwesomeIcon icon={faCircleCheck} className="text-base" />
          </div>
          <div className="text-xs text-slate-300 leading-relaxed font-normal">
            <strong className="text-white font-medium">Clinical Audit Trail:</strong> 30-day medication adherence and biometric trends are continuously verified and formatted for physician consultation.
          </div>
        </div>
      </div>
    </div>
  );
}