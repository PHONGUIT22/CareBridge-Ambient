'use client';

import React, { useState, useEffect } from 'react';
import { TodayScheduleView } from '../screens/TodayScheduleView';
import { HistoryMatrixView } from '../screens/HistoryMatrixView';
import { AnalyticsView } from '../screens/AnalyticsView';
import { DeskModeView } from '../screens/DeskModeView';
import { AlexaAgentConsole } from '../components/AlexaAgentConsole';
import { TopNavBar } from '../components/TopNavBar';
import { RichCardsContainer } from '../components/RichCardsContainer';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { AuthGate } from '../components/AuthGate';
import { PaywallModal } from '../components/PaywallModal';
import { OnboardingModal } from '../components/OnboardingModal';
import { AlexaAmbientGlow } from '../components/AlexaAmbientGlow';
import { DemoVoiceModal } from '../components/DemoVoiceModal';
import { MockVoiceScenario } from '../services/mockVoiceScenarios';
import {
  AuthSession,
  AmazonRefillOrder,
  ClinicalAdviceResponse,
  GuardianNegotiationCardData,
  RingPackageDetails,
} from '../types';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { useAlexaAgent } from '../hooks/useAlexaAgent';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartPulse,
  faShieldHalved,
  faTableCells,
  faChartLine,
  faClock,
  faMicrophone,
  faCircleNotch,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

type ScreenTab = 'caregiver' | 'history' | 'analytics' | 'deskClock';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ScreenTab>('caregiver');
  const [isDualMode, setIsDualMode] = useState<boolean>(true);
  const [visualCardOpen, setVisualCardOpen] = useState(false);
  const [selectedMedForCard, setSelectedMedForCard] = useState('Amlodipine (Blood Pressure)');
  const [clinicalAdviceOpen, setClinicalAdviceOpen] = useState(false);
  const [clinicalAdviceData, setClinicalAdviceData] = useState<ClinicalAdviceResponse | null>(null);
  const [amazonOrderCardOpen, setAmazonOrderCardOpen] = useState(false);
  const [amazonOrderData, setAmazonOrderData] = useState<AmazonRefillOrder | null>(null);
  const [ringCardOpen, setRingCardOpen] = useState(false);
  const [ringCardMode, setRingCardMode] = useState<'delivery' | 'emergency' | 'live'>('delivery');
  const [ringPackageData, setRingPackageData] = useState<RingPackageDetails | null>(null);
  const [ringDoorLockStatus, setRingDoorLockStatus] = useState<string>('LOCKED');
  const [ringEmergencyReason, setRingEmergencyReason] = useState<string>('');
  const [guardianCardOpen, setGuardianCardOpen] = useState<boolean>(false);
  const [guardianCardData, setGuardianCardData] = useState<GuardianNegotiationCardData | null>(null);
  const [isDemoVoiceModalOpen, setIsDemoVoiceModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Authentication & Pro State
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('carebridge_auth_session');
      if (savedAuth) {
        setAuthSession(JSON.parse(savedAuth));
      } else {
        setAuthSession({ isAuthenticated: false, user: 'Eleanor Vance (Age 78)', role: 'senior', isPro: false });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn('Could not read auth session from localStorage:', message);
    } finally {
      setIsAuthLoaded(true);
    }
  }, []);

  const handleLogin = (session: AuthSession) => {
    setAuthSession(session);
    addToast({
      type: 'success',
      title: `Welcome, ${session.user}!`,
      message: session.isPro
        ? 'CareBridge Ambient Pro Activated (Unlimited Sync & AWS SNS Alerts).'
        : 'CareBridge Ambient Ready (Evaluator Mode).',
    });
  };

  const handleSignOut = () => {
    localStorage.removeItem('carebridge_auth_session');
    setAuthSession({ isAuthenticated: false, user: 'Eleanor Vance (Age 78)', role: 'senior', isPro: false });
    addToast({ type: 'info', title: 'Signed Out', message: 'Switched back to Authentication Gate.' });
  };

  const handleActivatePro = () => {
    if (!authSession) return;
    const updated = { ...authSession, isPro: true };
    setAuthSession(updated);
    localStorage.setItem('carebridge_auth_session', JSON.stringify(updated));
    setIsPaywallOpen(false);
    addToast({ type: 'success', title: 'CareBridge Pro Unlocked', message: 'Unlimited clinical features active.' });
  };

  const handleResetFreePlan = () => {
    if (!authSession) return;
    const updated = { ...authSession, isPro: false };
    setAuthSession(updated);
    localStorage.setItem('carebridge_auth_session', JSON.stringify(updated));
    setIsPaywallOpen(false);
    addToast({ type: 'info', title: 'Plan Reset to Free Tier', message: 'Evaluation mode active.' });
  };

  const handleOnboardingComplete = (profile: { caregiverName: string; patientName: string; patientAge: number }) => {
    if (!authSession) return;
    const updated: AuthSession = {
      ...authSession,
      isOnboarded: true,
      caregiverName: profile.caregiverName,
      patientName: profile.patientName,
      patientAge: profile.patientAge,
      user: `${profile.patientName} (Age ${profile.patientAge})`,
    };
    setAuthSession(updated);
    localStorage.setItem('carebridge_auth_session', JSON.stringify(updated));
    triggerGlobalRefresh();
    addToast({ type: 'success', title: 'Profile Setup Completed', message: `Dashboard initialized for ${profile.patientName}.` });
  };

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerGlobalRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTriggerVisualCard = (medName: string) => {
    setSelectedMedForCard(medName);
    setVisualCardOpen(true);
  };

  const handleTriggerClinicalAdvice = (data: ClinicalAdviceResponse) => {
    setClinicalAdviceData(data);
    setClinicalAdviceOpen(true);
    const sms = data?.richCard?.smsDispatch || data?.smsDispatch;
    if (sms?.delivered) {
      addToast({
        type: 'warning',
        title: 'Emergency SMS Dispatched',
        message: `Alert dispatched to ${sms.recipient} (${sms.phone}) via AWS SNS.`,
      });
    }

    const isEmergency = data?.urgencyLevel === 'EMERGENCY' || data?.richCard?.urgencyLevel === 'EMERGENCY';
    if (isEmergency) {
      setRingCardMode('emergency');
      setRingDoorLockStatus('UNLOCKED FOR PARAMEDICS');
      setRingEmergencyReason(data?.displayCardTitle || data?.richCard?.title || 'Acute Medical Emergency Alert');
      setTimeout(() => {
        setRingCardOpen(true);
        addToast({ type: 'warning', title: 'Ring Smart Access Overridden', message: 'Front door unlocked automatically for paramedics.' });
      }, 1800);
    }
  };

  const handleTriggerAmazonOrder = (order: AmazonRefillOrder) => {
    setAmazonOrderData(order);
    setAmazonOrderCardOpen(true);
    addToast({
      type: 'success',
      title: 'Amazon Pharmacy Order Placed',
      message: `${order.quantityAdded || 30} tabs of ${order.medicineName} arriving ${order.estimatedDelivery}`,
    });

    setTimeout(() => {
      setRingCardMode('delivery');
      setRingPackageData({
        carrier: 'Amazon Prime Delivery',
        description: `Prescription Refill (${order.medicineName})`,
        orderId: order.orderId,
        deliveryTime: 'Just now',
      });
      setRingDoorLockStatus('LOCKED');
      setRingCardOpen(true);
      speechService.speak('Ring Doorbell: Amazon Pharmacy package delivered at your front porch.');
      addToast({ type: 'info', title: 'Ring Doorbell Motion Detected', message: 'Amazon Prime delivery arrived on front porch.' });
    }, 5000);
  };

  const alexaAgent = useAlexaAgent({
    patientName: authSession?.patientName,
    onDoseLogged: () => triggerGlobalRefresh(),
    onClinicalAdviceTriggered: (advice) => handleTriggerClinicalAdvice(advice),
    onOrderRefillTriggered: (order) => handleTriggerAmazonOrder(order),
    onRingDeviceTriggered: (ringResult) => {
      if (ringResult.action === 'triggerEmergencyDoorUnlock') {
        setRingCardMode('emergency');
        setRingDoorLockStatus('UNLOCKED FOR PARAMEDICS');
        setRingEmergencyReason(ringResult.emergencyReason || 'Emergency Paramedic Access');
      } else {
        setRingCardMode('delivery');
        setRingPackageData(ringResult.packageDetails || null);
        setRingDoorLockStatus(ringResult.doorLockStatus || 'LOCKED');
      }
      setRingCardOpen(true);
    },
    onGuardianNegotiationTriggered: (guardianData) => {
      const payload = (guardianData?.richCard || guardianData) as unknown as GuardianNegotiationCardData;
      setGuardianCardData(payload);
      setGuardianCardOpen(true);
      if (guardianData?.escalationLevel === 'SARAH_CIRCUIT_BREAKER' || payload?.escalationLevel === 'SARAH_CIRCUIT_BREAKER' || guardianData?.sarahNotified) {
        const cName = authSession?.caregiverName || 'Sarah Connor';
        addToast({
          type: 'warning',
          title: `${cName} Circuit-Breaker Triggered`,
          message: `Persistent refusal detected. Urgent AWS SNS alert dispatched to ${cName} (+1 555-0199).`,
        });
      }
    },
  });

  const handleGuardianTakeDose = async (medName?: string) => {
    try {
      await mcpClient.logDoseStatus({
        medicineName: medName || 'Amlodipine (Norvasc) 5mg',
        status: 'taken',
        notes: 'Dose taken after AI Health Guardian negotiation.',
      });
      triggerGlobalRefresh();
      addToast({ type: 'success', title: 'Medication Taken!', message: `${medName || 'Dose'} logged as taken. Great job!` });
    } catch (_) {
      triggerGlobalRefresh();
    }
  };

  const handleGuardianCallSarah = () => {
    const cName = authSession?.caregiverName || 'Sarah Connor';
    addToast({ type: 'info', title: `Connecting ${cName} (+1 555-0199)`, message: `Calling ${cName} at work for clinical skip authorization.` });
  };

  const handleTriggerGuardianRefusal = async (medicineName: string = 'Amlodipine (Norvasc) 5mg') => {
    try {
      const savedPersona = (localStorage.getItem('carebridge_active_guardian') as any) || 'grandson_leo';
      const result = await mcpClient.negotiateAdherence({
        medicineName,
        refusalReason: "I don't want to take my pills right now",
        personaId: savedPersona,
        turnCount: 1,
      });
      setGuardianCardData((result.richCard || result) as unknown as GuardianNegotiationCardData);
      setGuardianCardOpen(true);
      speechService.speak(result.speechResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Failed to negotiate adherence:', message);
    }
  };

  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1E3A8A] flex items-center justify-center text-white shadow-md">
            <FontAwesomeIcon icon={faHeartPulse} className="text-xl" />
          </div>
          <p className="text-xs text-slate-500 font-mono font-medium">Loading CareBridge Ambient OS...</p>
        </div>
      </div>
    );
  }

  if (!authSession?.isAuthenticated) {
    return (
      <>
        <AuthGate onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const isDeskClock = activeTab === 'deskClock';

  return (
    <main className={`min-h-screen font-sans selection:bg-[#2563EB] selection:text-white flex flex-col justify-between transition-colors duration-300 ${isDeskClock ? 'bg-[#050811] text-white' : 'bg-[#F1F5F9] text-slate-900'}`}>
      {/* 1. TOP NAVIGATION & STATUS BAR */}
      <TopNavBar
        isDeskClock={isDeskClock}
        authSession={authSession}
        isDualMode={isDualMode}
        onOpenPaywall={() => setIsPaywallOpen(true)}
        onSignOut={handleSignOut}
        onSetDualMode={setIsDualMode}
        onPreviewRingPorch={() => {
          setRingCardMode('delivery');
          setRingPackageData({
            carrier: 'Amazon Prime Delivery',
            description: 'Prescription Medication Parcel (Atorvastatin 20mg)',
            orderId: '114-7294821-4928103',
            deliveryTime: 'Just now',
          });
          setRingDoorLockStatus('LOCKED');
          setRingCardOpen(true);
        }}
      />

      {/* 2. MAIN WORKSPACE - ENCAPSULATED DEVICE MOCKUP FRAME */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8">
        <div className={`w-full transition-all duration-500 ${isDualMode ? 'max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center' : 'max-w-[440px] mx-auto'}`}>
          <div className={`${isDualMode ? 'lg:col-span-7 xl:col-span-8' : 'w-full'} relative rounded-[32px] p-2 sm:p-2.5 transition-all duration-300 ${isDeskClock ? 'bg-[#0B1528] border border-blue-900/40 shadow-2xl' : 'bg-slate-200/80 border border-slate-300 shadow-xl'}`}>
            <div className={`relative rounded-[24px] overflow-hidden min-h-[720px] max-h-[880px] flex flex-col justify-between transition-colors duration-300 ${isDeskClock ? 'bg-[#050811] border border-slate-800 text-white' : 'bg-[#F8FAFC] border border-slate-200/60 text-slate-900'}`}>
              <div className="w-full flex items-center justify-center pt-2.5 pb-1 relative z-20">
                <div className={`w-20 h-1 rounded-full ${isDeskClock ? 'bg-white/20' : 'bg-slate-300'}`} />
              </div>

              {/* SCROLLABLE VIEW CONTENT */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {activeTab === 'caregiver' && (
                  <TodayScheduleView
                    authSession={authSession}
                    refreshTrigger={refreshTrigger}
                    onDoseToggled={triggerGlobalRefresh}
                    onSwitchToDeskMode={() => setActiveTab('deskClock')}
                    onSwitchToHistory={() => setActiveTab('history')}
                    onOpenPaywall={() => setIsPaywallOpen(true)}
                    onTriggerGuardianRefusal={handleTriggerGuardianRefusal}
                    isPro={Boolean(authSession?.isPro)}
                    caregiverName={authSession?.caregiverName}
                    patientName={authSession?.patientName}
                    patientAge={authSession?.patientAge}
                  />
                )}
                {activeTab === 'history' && (
                  <HistoryMatrixView
                    authSession={authSession}
                    refreshTrigger={refreshTrigger}
                    isPro={Boolean(authSession?.isPro)}
                    onOpenPaywall={() => setIsPaywallOpen(true)}
                    patientName={authSession?.patientName}
                    caregiverName={authSession?.caregiverName}
                    patientAge={authSession?.patientAge}
                  />
                )}
                {activeTab === 'analytics' && <AnalyticsView refreshTrigger={refreshTrigger} />}
                {activeTab === 'deskClock' && (
                  <DeskModeView
                    authSession={authSession}
                    refreshTrigger={refreshTrigger}
                    onSwitchToCaregiver={() => setActiveTab('caregiver')}
                    onTakeDose={triggerGlobalRefresh}
                    onTriggerGuardianRefusal={handleTriggerGuardianRefusal}
                    patientName={authSession?.patientName}
                  />
                )}
              </div>

              {/* 3. FLOATING BOTTOM NAVIGATION BAR */}
              <div className="sticky bottom-4 left-0 right-0 w-full px-4 z-30 pointer-events-auto">
                <nav className={`relative rounded-2xl px-4 py-2 flex items-center justify-between border shadow-lg backdrop-blur-md transition-colors duration-300 ${isDeskClock ? 'bg-[#0B1528]/95 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-200/80 text-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.08)]'}`}>
                  <div className="flex items-center gap-5 pl-1">
                    <button onClick={() => setActiveTab('caregiver')} className={`flex flex-col items-center transition-all ${activeTab === 'caregiver' ? 'text-[#1E3A8A] font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'}`}>
                      <FontAwesomeIcon icon={faShieldHalved} className="text-base" />
                      <span className="text-[11px] mt-1">Caregiver</span>
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center transition-all ${activeTab === 'history' ? 'text-[#1E3A8A] font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'}`}>
                      <FontAwesomeIcon icon={faTableCells} className="text-base" />
                      <span className="text-[11px] mt-1">History Matrix</span>
                    </button>
                  </div>

                  {/* ELEVATED CENTER MIC BUTTON & DEMO VOICE TOGGLE */}
                  <div className="relative -top-4 flex items-center justify-center gap-2">
                    {(alexaAgent.isListening || alexaAgent.isThinking || alexaAgent.isSpeaking || alexaAgent.isPatientSpeaking) && (
                      <div className="absolute -top-11 px-3 py-1.5 rounded-xl bg-white border border-[#2563EB]/40 text-slate-900 text-xs font-semibold shadow-lg backdrop-blur-md whitespace-nowrap flex items-center gap-2 z-30 pointer-events-none animate-fadeIn">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${alexaAgent.isPatientSpeaking ? 'bg-purple-600 animate-ping' : alexaAgent.isThinking ? 'bg-[#2563EB] animate-spin' : alexaAgent.isListening ? 'bg-[#00CAFF] animate-ping' : 'bg-[#00F5FF] animate-pulse'}`} />
                        <span className="max-w-[220px] truncate">
                          {alexaAgent.isPatientSpeaking ? (alexaAgent.patientTranscript ? `Eleanor: "${alexaAgent.patientTranscript}"` : 'Eleanor speaking...') : alexaAgent.isThinking ? 'Analyzing with Bedrock...' : alexaAgent.isSpeaking ? 'Speaking response...' : alexaAgent.transcript ? `"${alexaAgent.transcript}"` : 'Listening to speech...'}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={alexaAgent.toggleListening}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 ${
                        alexaAgent.isListening
                          ? 'bg-[#2563EB] text-white ring-4 ring-[#00CAFF]/70 shadow-[0_0_24px_rgba(0,202,255,0.75)]'
                          : alexaAgent.isThinking
                          ? 'bg-[#2563EB] text-white ring-4 ring-[#00CAFF]/60 shadow-[0_0_20px_rgba(0,202,255,0.6)] animate-pulse'
                          : alexaAgent.isSpeaking
                          ? 'bg-[#00CAFF] text-slate-900 ring-4 ring-[#00CAFF]/50 shadow-[0_0_20px_rgba(0,202,255,0.6)]'
                          : 'bg-[#1E3A8A] hover:bg-[#1E40AF] text-white'
                      }`}
                      title={alexaAgent.isListening ? 'Click to stop listening' : 'Speak with Alexa Ambient assistant'}
                    >
                      <FontAwesomeIcon icon={alexaAgent.isThinking ? faCircleNotch : faMicrophone} className={`text-lg ${alexaAgent.isSpeaking ? 'text-slate-900' : 'text-white'} ${alexaAgent.isThinking ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                      onClick={() => setIsDemoVoiceModalOpen(true)}
                      disabled={alexaAgent.isThinking || alexaAgent.isSpeaking || alexaAgent.isPatientSpeaking}
                      className={`h-10 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                        alexaAgent.isPatientSpeaking ? 'bg-purple-600 text-white border-purple-400 ring-2 ring-purple-300 animate-pulse' : 'bg-white/95 hover:bg-purple-50 text-purple-900 border-purple-200 shadow-sm'
                      }`}
                      title="1-Click Dual-Turn Mock Voice Dialogue Simulator"
                    >
                      <span className="text-sm">🎭</span>
                      <span className="text-[11px] font-mono tracking-tight">Demo Voice</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-5 pr-1">
                    <button onClick={() => setActiveTab('analytics')} className={`flex flex-col items-center transition-all ${activeTab === 'analytics' ? 'text-[#1E3A8A] font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'}`}>
                      <FontAwesomeIcon icon={faChartLine} className="text-base" />
                      <span className="text-[11px] mt-1">Analytics</span>
                    </button>
                    <button onClick={() => setActiveTab('deskClock')} className={`flex flex-col items-center transition-all ${activeTab === 'deskClock' ? (isDeskClock ? 'text-teal-400 font-bold' : 'text-[#1E3A8A] font-bold') : 'text-slate-400 hover:text-slate-600 font-medium'}`}>
                      <FontAwesomeIcon icon={faClock} className="text-base" />
                      <span className="text-[11px] mt-1">Desk Clock</span>
                    </button>
                  </div>
                </nav>
              </div>

              {/* 4. ECHO SHOW 10 ALEXA CYAN AMBIENT GLOW */}
              <AlexaAmbientGlow
                isListening={alexaAgent.isListening}
                isThinking={alexaAgent.isThinking}
                isSpeaking={alexaAgent.isSpeaking}
                isPatientSpeaking={alexaAgent.isPatientSpeaking}
                patientTranscript={alexaAgent.patientTranscript}
                transcript={alexaAgent.transcript}
                onTriggerDemoVoice={() => setIsDemoVoiceModalOpen(true)}
              />
            </div>
          </div>

          {/* DEVICE MOCKUP FRAME 2: ALEXA AGENT CONSOLE (DUAL VIEW) */}
          {isDualMode && (
            <div className={`lg:col-span-5 xl:col-span-4 relative rounded-[32px] p-2 sm:p-2.5 h-[760px] flex flex-col transition-all duration-300 ${isDeskClock ? 'bg-[#0B1528] border border-blue-900/40 shadow-2xl' : 'bg-slate-200/80 border border-slate-300 shadow-xl'}`}>
              <div className="relative rounded-[24px] overflow-hidden bg-white border border-slate-200/80 h-full flex flex-col shadow-md">
                <AlexaAgentConsole
                  voiceAgent={alexaAgent}
                  onTriggerVisualCard={handleTriggerVisualCard}
                  onTriggerClinicalAdvice={handleTriggerClinicalAdvice}
                  onRefreshData={() => {
                    triggerGlobalRefresh();
                    setActiveTab('caregiver');
                  }}
                  patientName={authSession?.patientName}
                  patientAge={authSession?.patientAge}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUICK VOICE FEEDBACK POPUP */}
      {alexaAgent.isListening && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-[#2563EB] px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fadeIn text-slate-900">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-ping" />
          <p className="text-xs font-bold text-slate-900 tracking-wide">
            {alexaAgent.transcript ? `"${alexaAgent.transcript}"` : 'Alexa Ambient listening... Speak in English'}
          </p>
          <button onClick={alexaAgent.toggleListening} className="p-1 rounded-lg text-slate-400 hover:text-slate-800 transition-colors" title="Stop listening">
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>
      )}

      {alexaAgent.isThinking && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-[#2563EB] px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fadeIn text-slate-900">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-spin" />
          <p className="text-xs font-bold text-slate-900 tracking-wide">Synthesizing clinical triage with Bedrock...</p>
        </div>
      )}

      {/* RICH CARD MODALS CONTAINER */}
      <RichCardsContainer
        visualCardOpen={visualCardOpen}
        onCloseVisualCard={() => setVisualCardOpen(false)}
        selectedMedForCard={selectedMedForCard}
        clinicalAdviceOpen={clinicalAdviceOpen}
        onCloseClinicalAdvice={() => setClinicalAdviceOpen(false)}
        clinicalAdviceData={clinicalAdviceData}
        amazonOrderCardOpen={amazonOrderCardOpen}
        onCloseAmazonOrderCard={() => setAmazonOrderCardOpen(false)}
        amazonOrderData={amazonOrderData}
        onTrackOrder={(orderId) => {
          addToast({ type: 'info', title: 'Amazon Logistics', message: `Tracking shipment for Order #${orderId}. Carrier: Amazon Prime Delivery.` });
        }}
        ringCardOpen={ringCardOpen}
        onCloseRingCard={() => setRingCardOpen(false)}
        ringCardMode={ringCardMode}
        ringPackageData={ringPackageData}
        ringDoorLockStatus={ringDoorLockStatus}
        ringEmergencyReason={ringEmergencyReason}
        onRingAcknowledge={() => {
          addToast({ type: 'success', title: 'Medication Package Received', message: 'Prescription parcel brought inside safely.' });
        }}
        onRingUnlockDoor={() => {
          setRingDoorLockStatus('LOCKED');
          addToast({ type: 'info', title: 'Ring Smart Access', message: 'Front door deadbolt restored to locked secure state.' });
        }}
        guardianCardOpen={guardianCardOpen}
        onCloseGuardianCard={() => setGuardianCardOpen(false)}
        guardianCardData={guardianCardData}
        onGuardianTakeDose={handleGuardianTakeDose}
        onGuardianCallSarah={handleGuardianCallSarah}
        patientName={authSession?.patientName}
        patientAge={authSession?.patientAge}
        caregiverName={authSession?.caregiverName}
        isPro={Boolean(authSession?.isPro)}
      />

      {/* PRO PAYWALL MODAL */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onActivatePro={handleActivatePro}
        onResetFreePlan={handleResetFreePlan}
        isPro={Boolean(authSession?.isPro)}
      />

      {/* MANDATORY USER ONBOARDING MODAL */}
      <OnboardingModal
        isOpen={Boolean(authSession?.isAuthenticated && !authSession?.isOnboarded && !authSession?.isDemo)}
        initialEmail={authSession?.email}
        onComplete={handleOnboardingComplete}
      />

      {/* 1-CLICK DUAL-TURN MOCK VOICE DIALOGUE SIMULATOR MODAL */}
      <DemoVoiceModal
        isOpen={isDemoVoiceModalOpen}
        onClose={() => setIsDemoVoiceModalOpen(false)}
        onSelectScenario={async (scenario: MockVoiceScenario) => {
          await alexaAgent.simulateVoiceScenario(scenario);
        }}
        activeScenarioId={alexaAgent.activeScenarioId}
        isBusy={alexaAgent.isThinking || alexaAgent.isSpeaking || alexaAgent.isPatientSpeaking}
      />

      {/* TOAST NOTIFICATION CONTAINER */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* GLOBAL VIEWPORT ALEXA CYAN LIGHT BAR */}
      <div
        className={`fixed bottom-0 left-0 right-0 h-[3.5px] z-50 pointer-events-none transition-all duration-500 ease-out ${
          alexaAgent.isListening || alexaAgent.isThinking || alexaAgent.isSpeaking ? 'opacity-100 alexa-lightbar' : 'opacity-0'
        }`}
      />
    </main>
  );
}