'use client';

import React, { useState, useEffect } from 'react';
import { MedicationPunchCard } from '../components/MedicationPunchCard';
import { useHeatmap } from '../hooks/useHeatmap';
import { pdfService } from '../services/pdfService';
import { mcpClient } from '../services/mcpClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileArrowDown, faCircleCheck, faArrowsRotate } from '@fortawesome/free-solid-svg-icons';

export function HistoryMatrixView({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
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
            <span className="font-display text-[11px] font-extrabold tracking-widest text-[#00CAFF] uppercase">
              CareBridge Compliance Matrix
            </span>
            <h1 className="font-display text-2xl font-black text-white tracking-tight mt-0.5">
              Medication History
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2.5 rounded-2xl bg-[#131F2C] hover:bg-[#1A2A3C] border border-white/10 text-slate-300 hover:text-white transition-all shadow-sm"
              title="Sync latest records"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="text-xs" />
            </button>

            {/* NÚT EXPORT PDF SỬ DỤNG JSPDF */}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#131F2C] hover:bg-[#1A2A3C] border border-[#00CAFF]/40 text-[#00CAFF] text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(0,202,255,0.2)] active:scale-95 transition-all"
            >
              <FontAwesomeIcon icon={faFileArrowDown} className="text-sm" />
              <span>{isExporting ? 'Generating PDF...' : 'Export Doctor PDF'}</span>
            </button>
          </div>
        </div>

        {/* DANH SÁCH CÁC THẺ PUNCH-CARD POPULATED BỞI useHeatmap */}
        <div className="flex flex-col gap-4 mt-2">
          {loading && medicines.length === 0 ? (
            <div className="alexa-card rounded-2xl p-8 text-center text-slate-400 text-xs">
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
        <div className="bg-[#131F2C] rounded-2xl p-4 border border-white/5 flex items-center gap-3 shadow-md mt-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faCircleCheck} className="text-base" />
          </div>
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-white">Clinical Audit Trail:</strong> 30-day medication adherence and biometric trends are continuously verified and formatted for physician consultation.
          </div>
        </div>
      </div>
    </div>
  );
}