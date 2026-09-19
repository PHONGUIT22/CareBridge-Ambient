'use client';

import React, { useState } from 'react';
import { TodayScheduleView } from '../screens/TodayScheduleView';
import { HistoryMatrixView } from '../screens/HistoryMatrixView';
import { AnalyticsView } from '../screens/AnalyticsView';
import { DeskModeView } from '../screens/DeskModeView';
import { AlexaAgentConsole } from '../components/AlexaAgentConsole';
import { PillVisualCard } from '../components/RichCards/PillVisualCard';
import { ClinicalAdviceCard } from '../components/RichCards/ClinicalAdviceCard';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouseMedical,
  faShieldHalved,
  faTableCells,
  faChartLine,
  faClock,
  faMicrophone,
  faDesktop,
  faMobileScreen,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

type ScreenTab = 'caregiver' | 'history' | 'analytics' | 'deskClock';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ScreenTab>('caregiver');
  const [isDualMode, setIsDualMode] = useState<boolean>(true); // Chế độ Echo Show 10 chia đôi màn hình
  const [visualCardOpen, setVisualCardOpen] = useState(false);
  const [selectedMedForCard, setSelectedMedForCard] = useState('Amlodipine (Blood Pressure)');
  const [clinicalAdviceOpen, setClinicalAdviceOpen] = useState(false);
  const [clinicalAdviceData, setClinicalAdviceData] = useState<any>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceQueryFeedback, setVoiceQueryFeedback] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerGlobalRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Kích hoạt Visual Card từ Alexa
  const handleTriggerVisualCard = (medName: string) => {
    setSelectedMedForCard(medName);
    setVisualCardOpen(true);
  };

  // Kích hoạt Clinical Advice Card từ Alexa
  const handleTriggerClinicalAdvice = (data: any) => {
    setClinicalAdviceData(data);
    setClinicalAdviceOpen(true);
  };

  // Kích hoạt giọng nói trực tiếp từ nút Mic nổi ở giữa Bottom Bar
  const handleCenterMicClick = () => {
    setIsVoiceActive((prev) => !prev);
    if (!isVoiceActive) {
      setVoiceQueryFeedback('Listening to voice query...');
      if (typeof window !== 'undefined') {
        const SpeechRec =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec();
          rec.lang = 'en-US';
          rec.start();
          rec.onresult = async (e: any) => {
            let finalTranscript = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
              if (e.results[i].isFinal) {
                finalTranscript += e.results[i][0].transcript;
              }
            }
            const speech = (finalTranscript || e.results[0][0].transcript || '').trim();
            if (!speech) return;
            setVoiceQueryFeedback(`"${speech}"`);

            const lower = speech.toLowerCase();
            try {
              // 1. Check Dose Action Intent: took, taken, swallowed, had my, just take, skipped
              const isDoseAction =
                lower.includes('took') ||
                lower.includes('taken') ||
                lower.includes('swallowed') ||
                lower.includes('had my') ||
                lower.includes('just take') ||
                lower.includes('skipped');

              // 2. Check Schedule Intent: schedule, upcoming, what medicine, what pill, when do i take, calendar
              const isScheduleAction =
                lower.includes('schedule') ||
                lower.includes('upcoming') ||
                lower.includes('what medicine') ||
                lower.includes('what pill') ||
                lower.includes('when do i take') ||
                lower.includes('calendar');

              if (isDoseAction) {
                let med = undefined;
                if (lower.includes('amlodipine')) med = 'Amlodipine (Norvasc)';
                else if (lower.includes('aspirin')) med = 'Baby Aspirin Cardio';
                else if (lower.includes('metformin')) med = 'Metformin HCl';
                else if (lower.includes('atorvastatin') || lower.includes('lipitor'))
                  med = 'Atorvastatin (Lipitor)';

                const status: 'taken' | 'skipped' = lower.includes('skipped') ? 'skipped' : 'taken';
                const res = await mcpClient.logDoseStatus({ medicineName: med, status });
                const reply =
                  res.speechText ||
                  (status === 'skipped'
                    ? `Recorded ${med || 'your medication'} as skipped. Caregiver has been notified.`
                    : `Recorded ${med || 'your medication'} as taken. Caregiver Sarah has been notified.`);
                speechService.speak(reply);
                triggerGlobalRefresh();
              } else if (isScheduleAction) {
                const todayData = await mcpClient.getTodayData();
                const pending = todayData.schedule.filter((s) => s.status === 'pending');
                const reply =
                  pending.length > 0
                    ? `You have ${todayData.schedule.length} doses scheduled today. Next is ${pending[0].name} at ${pending[0].scheduledTime}.`
                    : `All ${todayData.schedule.length} scheduled doses for today are completed! Your adherence rate is ${todayData.adherenceRate}%.`;
                speechService.speak(reply);
              } else {
                // DEFAULT / FALLBACK INTENT (All other queries -> AWS Bedrock Claude Haiku 4.5)
                const res = await mcpClient.askClinicalAdvisor(speech);
                setClinicalAdviceData(res);
                setClinicalAdviceOpen(true);
                const reply =
                  res.speechResponse ||
                  res.actionAdvice ||
                  res.assessment ||
                  'I have processed your request. Please review the guidance on screen.';
                speechService.speak(reply);
              }
            } catch (err) {
              console.warn('Voice command fallback:', err);
            }

            setTimeout(() => {
              setIsVoiceActive(false);
              setVoiceQueryFeedback(null);
            }, 3000);
          };
          rec.onerror = () => setIsVoiceActive(false);
          rec.onend = () => setIsVoiceActive(false);
        }
      }
    } else {
      setVoiceQueryFeedback(null);
    }
  };

  return (
    <main className="min-h-screen text-slate-100 font-sans selection:bg-[#FF725E] selection:text-white flex flex-col justify-between">
      {/* 1. THANH ĐIỀU KHIỂN HACKATHON SIMULATOR TRÊN CÙNG */}
      <header className="bg-[#181B2A]/90 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          {/* Logo Smart Home Ambient faHouseMedical */}
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-[#FF725E] to-[#FF8A71] flex items-center justify-center shadow-[0_0_15px_rgba(255,114,94,0.35)]">
            <FontAwesomeIcon icon={faHouseMedical} className="text-white text-sm" />
          </div>
          <div>
            <span className="font-display font-black text-sm tracking-tight text-white uppercase flex items-center gap-1.5">
              <span>CareBridge</span>
              <span className="text-[#FF725E] font-display font-bold text-xs">Ambient OS</span>
            </span>
          </div>
        </div>

        {/* Nút chuyển đổi Echo Show 10 Dual View / Single Frame View */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDualMode(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isDualMode
                ? 'bg-gradient-to-r from-[#FF725E] to-[#FF8A71] text-white shadow-[0_0_15px_rgba(255,114,94,0.35)]'
                : 'bg-[#22273B] border border-white/[0.06] text-[#8A92A6] hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faDesktop} className="text-xs" />
            <span className="hidden sm:inline">Dual Frame</span>
          </button>

          <button
            onClick={() => setIsDualMode(false)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !isDualMode
                ? 'bg-gradient-to-r from-[#FF725E] to-[#FF8A71] text-white shadow-[0_0_15px_rgba(255,114,94,0.35)]'
                : 'bg-[#22273B] border border-white/[0.06] text-[#8A92A6] hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faMobileScreen} className="text-xs" />
            <span className="hidden sm:inline">Single Device (430px)</span>
          </button>
        </div>
      </header>

      {/* 2. KHÔNG GIAN BỐ CỤC CHÍNH - ENCAPSULATED DEVICE MOCKUP FRAME */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8">
        <div
          className={`w-full transition-all duration-500 ${
            isDualMode
              ? 'max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center'
              : 'max-w-[430px] mx-auto'
          }`}
        >
          {/* DEVICE MOCKUP FRAME 1: MAIN DISPLAY SCREEN */}
          <div
            className={`${
              isDualMode ? 'lg:col-span-7 xl:col-span-8' : 'w-full'
            } relative rounded-[36px] p-2 sm:p-2.5 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-white/[0.08] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-white/[0.08]`}
          >
            {/* INNER SCREEN CONTAINER */}
            <div className="relative rounded-[28px] overflow-hidden bg-[#181B2A] border border-white/[0.06] shadow-inner min-h-[720px] max-h-[850px] flex flex-col justify-between">
              {/* TOP STATUS NOTCH / AMBIENT GLOW BAR */}
              <div className="w-full flex items-center justify-center pt-2.5 pb-1 relative z-20">
                <div className="w-24 h-1.5 rounded-full bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
              </div>

              {/* SCROLLABLE VIEW CONTENT */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {/* TAB 1: CAREGIVER HUB (MÀN HÌNH CHÍNH) */}
                {activeTab === 'caregiver' && (
                  <TodayScheduleView
                    refreshTrigger={refreshTrigger}
                    onDoseToggled={triggerGlobalRefresh}
                    onSwitchToDeskMode={() => setActiveTab('deskClock')}
                    onOpenPaywall={() =>
                      alert('CareBridge Pro: Đã mở khoá Không giới hạn Thẻ thuốc và Báo cáo Y Tế Bác Sĩ!')
                    }
                  />
                )}

                {/* TAB 2: HISTORY MATRIX PUNCH-CARD */}
                {activeTab === 'history' && <HistoryMatrixView refreshTrigger={refreshTrigger} />}

                {/* TAB 3: ANALYTICS CHỈ SỐ SINH TỒN */}
                {activeTab === 'analytics' && <AnalyticsView refreshTrigger={refreshTrigger} />}

                {/* TAB 4: ĐỒNG HỒ ĐẦU GIƯỜNG BAN ĐÊM (DESK CLOCK) */}
                {activeTab === 'deskClock' && (
                  <DeskModeView
                    refreshTrigger={refreshTrigger}
                    onSwitchToCaregiver={() => setActiveTab('caregiver')}
                    onTakeDose={triggerGlobalRefresh}
                  />
                )}
              </div>

              {/* 3. FLOATING BOTTOM NAVIGATION BAR VỚI NÚT MICRO ELEVATED Ở TRUNG TÂM */}
              <div className="sticky bottom-4 left-0 right-0 w-full px-4 z-30 pointer-events-auto">
                <nav className="relative bg-[#1E2235]/95 backdrop-blur-xl rounded-full px-3 py-2 flex items-center justify-between shadow-[0_15px_35px_rgba(0,0,0,0.6)] border border-white/10">
                  {/* 2 Tab bên trái */}
                  <div className="flex items-center gap-4 pl-2">
                    {/* Tab 1: Caregiver */}
                    <button
                      onClick={() => setActiveTab('caregiver')}
                      className={`flex flex-col items-center transition-all ${
                        activeTab === 'caregiver'
                          ? 'text-[#FF725E] scale-105 drop-shadow-[0_0_8px_rgba(255,114,94,0.6)]'
                          : 'text-[#8A92A6] hover:text-white'
                      }`}
                    >
                      <FontAwesomeIcon icon={faShieldHalved} className="text-base" />
                      <span className="text-[9px] font-bold mt-1 tracking-tight">Caregiver</span>
                    </button>

                    {/* Tab 2: History Matrix */}
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex flex-col items-center transition-all ${
                        activeTab === 'history'
                          ? 'text-[#FF725E] scale-105 drop-shadow-[0_0_8px_rgba(255,114,94,0.6)]'
                          : 'text-[#8A92A6] hover:text-white'
                      }`}
                    >
                      <FontAwesomeIcon icon={faTableCells} className="text-base" />
                      <span className="text-[9px] font-bold mt-1 tracking-tight">History</span>
                    </button>
                  </div>

                  {/* NÚT MICRO ELEVATED Ở TRUNG TÂM THEO STYLE SMART HOME */}
                  <div className="relative -top-5 flex items-center justify-center">
                    {/* Feedback giọng nói trực quan ngay trên Mic Orb */}
                    {voiceQueryFeedback && (
                      <div className="absolute -top-11 px-3.5 py-1.5 rounded-full bg-[#1E2235]/95 border border-[#FF725E]/50 text-white text-[11px] font-display font-semibold shadow-[0_0_20px_rgba(255,114,94,0.3)] backdrop-blur-md whitespace-nowrap flex items-center gap-2 z-30 pointer-events-none transition-all">
                        <span className="w-2 h-2 rounded-full bg-[#FF725E] animate-ping shrink-0" />
                        <span className="max-w-[220px] truncate">{voiceQueryFeedback}</span>
                      </div>
                    )}

                    {/* Vòng hào quang lan tỏa khi đang nghe */}
                    {isVoiceActive && (
                      <div className="absolute w-20 h-20 rounded-full bg-[#FF725E]/40 blur-md animate-ping" />
                    )}

                    <button
                      onClick={handleCenterMicClick}
                      style={{
                        boxShadow: isVoiceActive
                          ? '0 0 35px rgba(255, 114, 94, 0.85)'
                          : '0 8px 25px rgba(255, 114, 94, 0.45)',
                      }}
                      className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
                        isVoiceActive
                          ? 'bg-gradient-to-tr from-[#FF725E] to-[#FFA08C] text-white scale-110 shadow-[0_8px_25px_rgba(255,114,94,0.45)] animate-pulse'
                          : 'bg-gradient-to-tr from-[#FF725E] to-[#FFA08C] text-white border-2 border-white/20 hover:scale-105 shadow-[0_8px_25px_rgba(255,114,94,0.45)]'
                      }`}
                      title="Nhấn để nói với trợ lý Alexa Ambient"
                    >
                      <FontAwesomeIcon icon={faMicrophone} className="text-xl text-white" />
                    </button>
                  </div>

                  {/* 2 Tab bên phải */}
                  <div className="flex items-center gap-4 pr-2">
                    {/* Tab 3: Analytics */}
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className={`flex flex-col items-center transition-all ${
                        activeTab === 'analytics'
                          ? 'text-[#FF725E] scale-105 drop-shadow-[0_0_8px_rgba(255,114,94,0.6)]'
                          : 'text-[#8A92A6] hover:text-white'
                      }`}
                    >
                      <FontAwesomeIcon icon={faChartLine} className="text-base" />
                      <span className="text-[9px] font-bold mt-1 tracking-tight">Analytics</span>
                    </button>

                    {/* Tab 4: Desk Clock */}
                    <button
                      onClick={() => setActiveTab('deskClock')}
                      className={`flex flex-col items-center transition-all ${
                        activeTab === 'deskClock'
                          ? 'text-[#FF725E] scale-105 drop-shadow-[0_0_8px_rgba(255,114,94,0.6)]'
                          : 'text-[#8A92A6] hover:text-white'
                      }`}
                    >
                      <FontAwesomeIcon icon={faClock} className="text-base" />
                      <span className="text-[9px] font-bold mt-1 tracking-tight">Desk Mode</span>
                    </button>
                  </div>
                </nav>
              </div>
            </div>
          </div>

          {/* DEVICE MOCKUP FRAME 2: ALEXA AGENT CONSOLE (DUAL VIEW) */}
          {isDualMode && (
            <div className="lg:col-span-5 xl:col-span-4 relative rounded-[36px] p-2 sm:p-2.5 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-white/[0.08] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-white/[0.08] h-[760px] flex flex-col">
              <div className="relative rounded-[28px] overflow-hidden bg-[#181B2A] border border-white/[0.06] shadow-inner h-full flex flex-col">
                <AlexaAgentConsole
                  onTriggerVisualCard={handleTriggerVisualCard}
                  onTriggerClinicalAdvice={handleTriggerClinicalAdvice}
                  onRefreshData={() => {
                    triggerGlobalRefresh();
                    setActiveTab('caregiver');
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POPUP PHẢN HỒI GIỌNG NÓI NHANH KHI BẤM NÚT MIC Ở TRUNG TÂM */}
      {isVoiceActive && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#22273B]/95 border-2 border-[#FF725E] px-6 py-3.5 rounded-2xl shadow-[0_0_35px_rgba(255,114,94,0.35)] backdrop-blur-xl flex items-center gap-3 animate-fadeIn">
          <span className="w-3 h-3 rounded-full bg-[#FF725E] animate-ping" />
          <p className="text-xs font-black text-white tracking-wide">
            {voiceQueryFeedback || 'Alexa Ambient Listening... Speak in English'}
          </p>
          <button
            onClick={() => setIsVoiceActive(false)}
            className="p-1 rounded-lg text-[#8A92A6] hover:text-white"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>
      )}

      {/* RICH CARD NHẬN DIỆN VIÊN THUỐC PHÓNG TO KHI CẦN */}
      <PillVisualCard
        isOpen={visualCardOpen}
        onClose={() => setVisualCardOpen(false)}
        medicineName={selectedMedForCard}
      />

      {/* RICH CARD CỐ VẤN Y TẾ LÂM SÀNG CLAUDE BEDROCK */}
      <ClinicalAdviceCard
        isOpen={clinicalAdviceOpen}
        onClose={() => setClinicalAdviceOpen(false)}
        title={
          clinicalAdviceData?.richCard?.title ||
          clinicalAdviceData?.displayCardTitle ||
          'Clinical Triage Assessment'
        }
        actionAdvice={
          clinicalAdviceData?.richCard?.actionAdvice ||
          clinicalAdviceData?.actionAdvice ||
          clinicalAdviceData?.richCard?.advice ||
          clinicalAdviceData?.speechResponse ||
          'Please sit down immediately and drink a glass of warm water.'
        }
        urgencyLevel={
          clinicalAdviceData?.richCard?.urgencyLevel ||
          clinicalAdviceData?.urgencyLevel ||
          'MEDIUM'
        }
        clinicalExplanation={
          clinicalAdviceData?.richCard?.clinicalExplanation ||
          clinicalAdviceData?.clinicalExplanation ||
          clinicalAdviceData?.assessment ||
          'Transient orthostatic hypotension may occur shortly after taking anti-hypertensive medication.'
        }
      />
      {/* TOAST NOTIFICATION CONTAINER (NON-BLOCKING RESILIENT WARNINGS) */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}