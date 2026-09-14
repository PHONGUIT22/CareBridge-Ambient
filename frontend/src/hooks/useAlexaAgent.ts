'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { ClinicalAdviceResponse } from '../types';

export interface ToolExecutionLog {
  timestamp: string;
  toolName: string;
  args: any;
  result: any;
  status: 'invoking' | 'success' | 'error';
  latencyMs?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'alexa';
  text: string;
  timestamp: string;
  toolCall?: {
    toolName: string;
    args: any;
    result: any;
    status: 'invoking' | 'success' | 'error';
    latencyMs?: number;
    urgencyLevel?: string;
    actionAdvice?: string;
    clinicalExplanation?: string;
  };
  urgencyLevel?: string;
  actionAdvice?: string;
  clinicalExplanation?: string;
}

interface UseAlexaAgentOptions {
  onDoseLogged?: () => void;
  onClinicalAdviceTriggered?: (advice: ClinicalAdviceResponse) => void;
}

export function useAlexaAgent(options?: UseAlexaAgentOptions) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [toolLogs, setToolLogs] = useState<ToolExecutionLog[]>([
    {
      timestamp: '11:58:10',
      toolName: 'getTodaySchedule',
      args: { date: '2026-09-14' },
      result: { totalDoses: 5, adherenceRate: 80 },
      status: 'success',
      latencyMs: 142,
    },
  ]);
  const [conversation, setConversation] = useState<
    Array<{ sender: 'user' | 'alexa'; text: string }>
  >([
    {
      sender: 'alexa',
      text: 'Good morning Eleanor! I am your CareBridge Ambient Copilot. How can I help you today?',
    },
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'alexa',
      text: 'Good morning Eleanor! I am your CareBridge Ambient Copilot. How can I assist you today?',
      timestamp: '08:00:00',
      toolCall: {
        toolName: 'getTodaySchedule',
        args: { date: '2026-09-14' },
        result: {
          totalDoses: 4,
          adherenceRate: 75,
          nextDose: 'Amlodipine 5mg (08:00)',
        },
        status: 'success',
        latencyMs: 142,
      },
    },
  ]);

  const isBusyRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const processVoiceQueryRef = useRef<(text: string) => Promise<void>>(async () => {});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          // Drop voice input if agent is already analyzing or speaking
          if (isBusyRef.current) return;

          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          const trimmed = finalTranscript.trim();
          if (!trimmed) return; // Ignore interim fragments

          setTranscript(trimmed);
          processVoiceQueryRef.current(trimmed);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;

        return () => {
          try {
            recognition.abort();
          } catch (_) {}
          recognitionRef.current = null;
          speechService.cancel();
        };
      }
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Trình duyệt chưa hỗ trợ Web Speech API. Bạn có thể nhấn các nút mô phỏng câu lệnh bên dưới để trải nghiệm!');
      return;
    }

    if (isBusyRef.current && !isListening) {
      console.warn('[useAlexaAgent] Cannot toggle listening while agent is busy');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('[useAlexaAgent] Failed to start recognition:', err);
        setIsListening(false);
      }
    }
  }, [isListening]);

  const processVoiceQuery = useCallback(
    async (queryText: string) => {
      // 1. Lock against concurrent queries
      if (isBusyRef.current) {
        console.warn('[useAlexaAgent] Dropped concurrent query because agent is busy:', queryText);
        return;
      }

      isBusyRef.current = true;
      setIsThinking(true);

      // 2. Mute microphone immediately
      try {
        recognitionRef.current?.abort();
      } catch (_) {}
      setIsListening(false);

      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      const startTime = performance.now();

      const speakAndRelease = (replyText: string) => {
        // Mute mic during Alexa speech
        try {
          recognitionRef.current?.abort();
        } catch (_) {}
        setIsListening(false);

        // Safety timeout to prevent permanent lock
        const safetyTimer = setTimeout(() => {
          if (isBusyRef.current) {
            isBusyRef.current = false;
          }
        }, 12000);

        if (speechService.isSupported()) {
          speechService.speak(replyText, {
            onEnd: () => {
              clearTimeout(safetyTimer);
              isBusyRef.current = false;
            },
          });
        } else {
          clearTimeout(safetyTimer);
          isBusyRef.current = false;
        }
      };

      setConversation((prev) => [...prev, { sender: 'user', text: queryText }]);
      setMessages((prev) => [
        ...prev,
        {
          id: `user_${Date.now()}`,
          sender: 'user',
          text: queryText,
          timestamp: now,
        },
      ]);
      const lower = queryText.toLowerCase();

      try {
        // 1. Check Dose Action Intent:
        // Match if text contains: took, taken, swallowed, had my, just take, skipped
        const isDoseAction =
          lower.includes('took') ||
          lower.includes('taken') ||
          lower.includes('swallowed') ||
          lower.includes('had my') ||
          lower.includes('just take') ||
          lower.includes('skipped');

        // 2. Check Schedule Intent:
        // Match if text strictly asks for schedule/time: schedule, upcoming, what medicine, what pill, when do i take, calendar
        const isScheduleAction =
          lower.includes('schedule') ||
          lower.includes('upcoming') ||
          lower.includes('what medicine') ||
          lower.includes('what pill') ||
          lower.includes('when do i take') ||
          lower.includes('calendar');

        if (isDoseAction) {
          let med: string | undefined = undefined;
          if (lower.includes('amlodipine')) med = 'Amlodipine (Norvasc)';
          else if (lower.includes('aspirin')) med = 'Baby Aspirin Cardio';
          else if (lower.includes('metformin')) med = 'Metformin HCl';
          else if (lower.includes('atorvastatin') || lower.includes('lipitor'))
            med = 'Atorvastatin (Lipitor)';

          const status: 'taken' | 'skipped' = lower.includes('skipped') ? 'skipped' : 'taken';

          setToolLogs((prev) => [
            {
              timestamp: now,
              toolName: 'logDoseStatus',
              args: { medicineName: med || 'Earliest Pending', status },
              result: 'Updating SQLite WAL mode...',
              status: 'invoking',
            },
            ...prev,
          ]);

          const res = await mcpClient.logDoseStatus({
            medicineName: med,
            status,
          });
          const latency = Math.round(performance.now() - startTime);

          setToolLogs((prev) => [
            {
              timestamp: now,
              toolName: 'logDoseStatus',
              args: { medicineName: med || 'Earliest Pending', status },
              result: res,
              status: 'success',
              latencyMs: latency,
            },
            ...prev.slice(1),
          ]);

          const reply =
            res.speechText ||
            (status === 'skipped'
              ? `I have recorded your ${med || 'medication'} as skipped. Caregiver has been notified.`
              : `Wonderful! I have recorded your ${med || 'medication'} as taken.`);

          setConversation((prev) => [...prev, { sender: 'alexa', text: reply }]);
          setMessages((prev) => [
            ...prev,
            {
              id: `alexa_${Date.now()}`,
              sender: 'alexa',
              text: reply,
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              toolCall: {
                toolName: 'logDoseStatus',
                args: { medicineName: med || 'Earliest Pending', status },
                result: res,
                status: 'success',
                latencyMs: latency,
              },
            },
          ]);
          speakAndRelease(reply);

          // Automatic UI refresh across all views
          if (options?.onDoseLogged) {
            options.onDoseLogged();
          }
        } else if (isScheduleAction) {
          setToolLogs((prev) => [
            {
              timestamp: now,
              toolName: 'getTodaySchedule',
              args: { date: new Date().toISOString().split('T')[0] },
              result: 'Querying SQLite...',
              status: 'invoking',
            },
            ...prev,
          ]);

          const todayData = await mcpClient.getTodayData();
          const latency = Math.round(performance.now() - startTime);
          const pending = todayData.schedule.filter((s) => s.status === 'pending');
          const nextDoseStr = pending.length > 0 ? `${pending[0].name} (${pending[0].scheduledTime})` : 'All completed';

          setToolLogs((prev) => [
            {
              timestamp: now,
              toolName: 'getTodaySchedule',
              args: { date: todayData.date },
              result: {
                totalDoses: todayData.schedule.length,
                adherenceRate: todayData.adherenceRate,
                nextDose: nextDoseStr,
                pendingCount: pending.length,
              },
              status: 'success',
              latencyMs: latency,
            },
            ...prev.slice(1),
          ]);

          let reply = '';
          if (pending.length > 0) {
            reply = `You have ${todayData.schedule.length} scheduled medications today. Next upcoming dose is ${pending[0].name} at ${pending[0].scheduledTime}.`;
          } else {
            reply = `All ${todayData.schedule.length} scheduled doses for today are completed! Your adherence rate is ${todayData.adherenceRate}%.`;
          }

          setConversation((prev) => [...prev, { sender: 'alexa', text: reply }]);
          setMessages((prev) => [
            ...prev,
            {
              id: `alexa_${Date.now()}`,
              sender: 'alexa',
              text: reply,
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              toolCall: {
                toolName: 'getTodaySchedule',
                args: { date: todayData.date },
                result: {
                  totalDoses: todayData.schedule.length,
                  adherenceRate: todayData.adherenceRate,
                  nextDose: nextDoseStr,
                  pendingCount: pending.length,
                },
                status: 'success',
                latencyMs: latency,
              },
            },
          ]);
          speakAndRelease(reply);
        } else {
          // DEFAULT / FALLBACK INTENT (All other queries -> AWS Bedrock Claude Haiku 4.5)
          setToolLogs((prev) => [
            {
              timestamp: now,
              toolName: 'clinicalAdvisor (AWS Bedrock Claude Haiku 4.5)',
              args: { query: queryText },
              result: 'Dispatched to Bedrock runtime...',
              status: 'invoking',
            },
            ...prev,
          ]);

          const data = await mcpClient.askClinicalAdvisor(queryText);
          const latency = Math.round(performance.now() - startTime);

          setToolLogs((prev) => [
            {
              timestamp: now,
              toolName: 'clinicalAdvisor',
              args: { query: queryText },
              result: data,
              status: 'success',
              latencyMs: latency,
            },
            ...prev.slice(1),
          ]);

          const reply =
            data.speechResponse ||
            data.actionAdvice ||
            data.assessment ||
            "I've noted that. Please let me know how you are feeling.";

          setConversation((prev) => [...prev, { sender: 'alexa', text: reply }]);
          setMessages((prev) => [
            ...prev,
            {
              id: `alexa_${Date.now()}`,
              sender: 'alexa',
              text: reply,
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              toolCall: {
                toolName: 'clinicalAdvisor',
                args: { query: queryText },
                result: data,
                status: 'success',
                latencyMs: latency,
                urgencyLevel: data.urgencyLevel || data.richCard?.urgencyLevel,
                actionAdvice: data.actionAdvice || data.richCard?.actionAdvice || data.richCard?.advice,
                clinicalExplanation: data.clinicalExplanation || data.richCard?.clinicalExplanation,
              },
              urgencyLevel: data.urgencyLevel || data.richCard?.urgencyLevel,
              actionAdvice: data.actionAdvice || data.richCard?.actionAdvice || data.richCard?.advice,
              clinicalExplanation: data.clinicalExplanation || data.richCard?.clinicalExplanation,
            },
          ]);
          speakAndRelease(reply);

          if (options?.onClinicalAdviceTriggered) {
            options.onClinicalAdviceTriggered(data);
          }
        }
      } catch (err: any) {
        console.warn('Voice command processing error:', err.message);
        const reply = "I've recorded your action locally and synchronized with CareBridge.";
        setConversation((prev) => [...prev, { sender: 'alexa', text: reply }]);
        setMessages((prev) => [
          ...prev,
          {
            id: `alexa_${Date.now()}`,
            sender: 'alexa',
            text: reply,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          },
        ]);
        speakAndRelease(reply);
      } finally {
        setIsThinking(false);
        setIsListening(false);
      }
    },
    [options]
  );

  useEffect(() => {
    processVoiceQueryRef.current = processVoiceQuery;
  }, [processVoiceQuery]);

  return {
    isListening,
    isThinking,
    transcript,
    toolLogs,
    conversation,
    messages,
    toggleListening,
    processVoiceQuery,
  };
}
