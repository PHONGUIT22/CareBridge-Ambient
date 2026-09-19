'use client';

import React, { useState, useEffect } from 'react';
import { TodayScheduleView } from '../screens/TodayScheduleView';
import { HistoryMatrixView } from '../screens/HistoryMatrixView';
import { AnalyticsView } from '../screens/AnalyticsView';
import { DeskModeView } from '../screens/DeskModeView';
import { AlexaAgentConsole } from '../components/AlexaAgentConsole';
import { PillVisualCard } from '../components/RichCards/PillVisualCard';
import { ClinicalAdviceCard } from '../components/RichCards/ClinicalAdviceCard';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { AuthGate, AuthSession } from '../components/AuthGate';
import { PaywallModal } from '../components/PaywallModal';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartPulse,
  faShieldHalved,
  faTableCells,
  faChartLine,
  faClock,
  faMicrophone,
  faDesktop,
  faMobileScreen,
  faXmark,
  faCrown,
  faRightFromBracket,
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

  // Authentication & Pro Paywall State
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('carebridge_auth');
      if (saved) {
        const parsed: AuthSession = JSON.parse(saved);
        if (parsed?.isAuthenticated) {
          setAuthSession(parsed);
          if (parsed.role === 'senior') {
            setActiveTab('deskClock');
          } else {
            setActiveTab('caregiver');
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    } finally {
      setIsAuthLoaded(true);
    }
  }, []);

  const handleLogin = (session: AuthSession) => {
    setAuthSession(session);
    if (session.role === 'senior') {
      setActiveTab('deskClock');
    } else {
      setActiveTab('caregiver');
    }
    addToast({
      type: 'success',
      title: `Welcome, ${session.user.split(' ')[0]}`,
      message: `Signed in as ${session.role === 'senior' ? 'Senior (Bedside Mode)' : 'Primary Caregiver'}.`,
    });
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem('carebridge_auth');
    } catch (e) {}
    setAuthSession(null);
    addToast({
      type: 'info',
      title: 'Signed Out',
      message: 'Returned to CareBridge Ambient Auth Gate.',
    });
  };

  const handleActivatePro = () => {
    if (authSession) {
      const updated: AuthSession = { ...authSession, isPro: true };
      setAuthSession(updated);
      try {
        localStorage.setItem('carebridge_auth', JSON.stringify(updated));
      } catch (e) {}
    }
    addToast({
      type: 'success',
      title: 'CareBridge Pro Unlocked',
      message: 'Evaluator Pass active! Unlimited slots & AI telemetry enabled.',
    });
  };

  const handleResetFreePlan = () => {
    if (authSession) {
      const updated: AuthSession = { ...authSession, isPro: false };
      setAuthSession(updated);
      try {
        localStorage.setItem('carebridge_auth', JSON.stringify(updated));
      } catch (e) {}
    }
    addToast({
      type: 'info',
      title: 'Reset to Free Plan',
      message: 'Gated restrictions are now active for testing.',
    });
  };

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

  // Khi chưa đọc xong localStorage, hiển thị dark loading skeleton để tránh hydration mismatch
  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen bg-[#151922] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1E2330] border border-[#FF5733]/30 flex items-center justify-center">
            <FontAwesomeIcon icon={faHeartPulse} className="text-[#FF5733]" />
          </div>
          <p className="text-xs text-slate-400 font-mono">Loading CareBridge Ambient OS...</p>
        </div>
      </div>
    );
  }

  // Nếu chưa đăng nhập, hiển thị Authentication Gate & Evaluator Sandbox
  if (!authSession?.isAuthenticated) {
    return (
      <>
        <AuthGate onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-[#151922] text-slate-100 font-sans selection:bg-[#FF5733] selection:text-white flex flex-col justify-between">
      {/* 1. THANH ĐIỀU KHIỂN HACKATHON SIMULATOR TRÊN CÙNG */}
      <header className="bg-[#151922]/95 backdrop-blur-md border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Logo Smart Home Ambient faHeartPulse */}
          <div className="w-8 h-8 rounded-xl bg-[#FF5733] flex items-center justify-center">
            <FontAwesomeIcon icon={faHeartPulse} className="text-white text-sm" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>CareBridge</span>
              <span className="text-[#FF5733] font-mono font-medium text-xs">Ambient OS</span>
            </span>
          </div>
        </div>

        {/* Persona Indicator & Pro Badge & Sign Out Button */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Active Profile Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1E2330] border border-white/[0.08] text-xs">
            <div className="leading-tight flex items-center gap-2">
              <span className="font-medium text-white whitespace-nowrap">
                {authSession.role === 'senior' ? 'Eleanor Vance (Senior Mode)' : 'Sarah Connor (Caregiver)'}
              </span>
              {authSession.isPro && (
                <span className="px-1.5 py-0.5 text-xs font-mono font-semibold rounded bg-[#FF5733]/15 text-[#FF5733] border border-[#FF5733]/30">
                  Pro
                </span>
              )}
            </div>
          </div>

          {/* Pro Badge / Upgrade Button */}
          <button
            onClick={() => setIsPaywallOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              authSession.isPro
                ? 'bg-[#FF5733]/15 border border-[#FF5733]/40 text-[#FF5733]'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="CareBridge Ambient Subscription Status"
          >
            <FontAwesomeIcon icon={faCrown} className="text-xs" />
            <span className="hidden xs:inline">{authSession.isPro ? 'Pro active' : 'Upgrade Pro'}</span>
          </button>

          {/* Switch Profile / Sign Out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2330] hover:bg-[#252B3B] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all active:scale-95"
            title="Switch profile or sign out"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="text-xs" />
            <span className="hidden md:inline">Switch profile</span>
          </button>

          {/* Nút chuyển đổi Echo Show 10 Dual View / Single Frame View */}
          <button
            onClick={() => setIsDualMode(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isDualMode
                ? 'bg-[#FF5733] text-white font-semibold'
                : 'bg-[#1E2330] border border-white/[0.08] text-slate-400 hover:text-white'
            }`}
            title="Echo Show 10 Dual View"
          >
            <FontAwesomeIcon icon={faDesktop} className="text-xs" />
            <span className="hidden lg:inline">Dual frame</span>
          </button>

          <button
            onClick={() => setIsDualMode(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              !isDualMode
                ? 'bg-[#FF5733] text-white font-semibold'
                : 'bg-[#1E2330] border border-white/[0.08] text-slate-400 hover:text-white'
            }`}
            title="Single Device Mobile View"
          >
            <FontAwesomeIcon icon={faMobileScreen} className="text-xs" />
            <span className="hidden lg:inline">Single device</span>
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
            } relative rounded-[32px] p-2 sm:p-2.5 bg-[#1E2330]/40 border border-white/[0.08] shadow-2xl`}
          >
            {/* INNER SCREEN CONTAINER */}
            <div className="relative rounded-[24px] overflow-hidden bg-[#151922] border border-white/[0.08] min-h-[720px] max-h-[850px] flex flex-col justify-between">
              {/* TOP STATUS NOTCH / HARDWARE BAR */}
              <div className="w-full flex items-center justify-center pt-2.5 pb-1 relative z-20">
                <div className="w-20 h-1 rounded-full bg-white/15" />
              </div>

              {/* SCROLLABLE VIEW CONTENT */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {/* TAB 1: CAREGIVER HUB (MÀN HÌNH CHÍNH) */}
                {activeTab === 'caregiver' && (
                  <TodayScheduleView
                    refreshTrigger={refreshTrigger}
                    onDoseToggled={triggerGlobalRefresh}
                    onSwitchToDeskMode={() => setActiveTab('deskClock')}
                    onOpenPaywall={() => setIsPaywallOpen(true)}
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
                <nav className="relative bg-[#1E2330]/95 backdrop-blur-md rounded-2xl px-4 py-2 flex items-center justify-between border border-white/[0.08] shadow-xl">
                  {/* 2 Tab bên trái */}
                  <div className="flex items-center gap-5 pl-1">
                    {/* Tab 1: Caregiver */}
                    <button
                      onClick={() => setActiveTab('caregiver')}
                      className={`flex flex-col items-center transition-all ${
                        activeTab === 'caregiver'
                          ? 'text-[#FF5733] font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faShieldHalved} className="text-base" />
                      <span className="text-xs font-medium mt-1">Caregiver</span>
                    </button>

                    {/* Tab 2: History Matrix */}
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex flex-col items-center transition-all ${
                        activeTab === 'history'
                          ? 'text-[#FF5733] font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faTableCells} className="text-base" />
                      <span className="text-xs font-medium mt-1">History</span>
                    </button>
                  </div>

                  {/* NÚT MICRO ELEVATED Ở TRUNG TÂM THEO STYLE HARDWARE */}
                  <div className="relative -top-4 flex items-center justify-center">
                    {/* Feedback giọng nói trực quan ngay trên Mic */}
                    {voiceQueryFeedback && (
                      <div className="absolute -top-11 px-3 py-1.5 rounded-xl bg-[#1E2330] border border-white/[0.12] text-white text-xs font-medium shadow-lg backdrop-blur-md whitespace-nowrap flex items-center gap-2 z-30 pointer-events-none">
                        <span className="w-2 h-2 rounded-full bg-[#FF5733] animate-ping shrink-0" />
                        <span className="max-w-[220px] truncate">{voiceQueryFeedback}</span>
                      </div>
                    )}

                    <button
                      onClick={handleCenterMicClick}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 ${
                        isVoiceActive
                          ? 'bg-[#FF5733] text-white ring-2 ring-white/40 ring-offset-2 ring-offset-[#151922]'
                          : 'bg-[#FF5733] hover:bg-[#E64D2E] text-white'
                      }`}
                      title="Speak with Alexa Ambient assistant"
                    >
                      <FontAwesomeIcon icon={faMicrophone} className="text-lg text-white" />
                    </button>
                  </div>

                  {/* 2 Tab bên phải */}
                  <div className="flex items-center gap-5 pr-1">
                    {/* Tab 3: Analytics */}
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className={`flex flex-col items-center transition-all ${
                        activeTab === 'analytics'
                          ? 'text-[#FF5733] font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faChartLine} className="text-base" />
                      <span className="text-xs font-medium mt-1">Analytics</span>
                    </button>

                    {/* Tab 4: Desk Clock */}
                    <button
                      onClick={() => setActiveTab('deskClock')}
                      className={`flex flex-col items-center transition-all ${
                        activeTab === 'deskClock'
                          ? 'text-[#FF5733] font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faClock} className="text-base" />
                      <span className="text-xs font-medium mt-1">Desk mode</span>
                    </button>
                  </div>
                </nav>
              </div>
            </div>
          </div>

          {/* DEVICE MOCKUP FRAME 2: ALEXA AGENT CONSOLE (DUAL VIEW) */}
          {isDualMode && (
            <div className="lg:col-span-5 xl:col-span-4 relative rounded-[32px] p-2 sm:p-2.5 bg-[#1E2330]/40 border border-white/[0.08] shadow-2xl h-[760px] flex flex-col">
              <div className="relative rounded-[24px] overflow-hidden bg-[#151922] border border-white/[0.08] h-full flex flex-col">
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1E2330] border border-[#FF5733] px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fadeIn">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5733] animate-ping" />
          <p className="text-xs font-medium text-white tracking-wide">
            {voiceQueryFeedback || 'Alexa Ambient listening... Speak in English'}
          </p>
          <button
            onClick={() => setIsVoiceActive(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
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

      {/* PRO PAYWALL MODAL */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onActivatePro={handleActivatePro}
        onResetFreePlan={handleResetFreePlan}
        isPro={Boolean(authSession?.isPro)}
      />

      {/* TOAST NOTIFICATION CONTAINER (NON-BLOCKING RESILIENT WARNINGS) */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}