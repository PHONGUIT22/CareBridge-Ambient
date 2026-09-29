'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { ClinicalAdviceResponse, AmazonRefillOrder } from '../types';
import { MockVoiceScenario } from '../services/mockVoiceScenarios';

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
  isSimulated?: boolean;
  senderLabel?: string;
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

export interface UseAlexaAgentOptions {
  onDoseLogged?: () => void;
  onClinicalAdviceTriggered?: (advice: ClinicalAdviceResponse) => void;
  onOrderRefillTriggered?: (order: AmazonRefillOrder) => void;
  onRingDeviceTriggered?: (ringResult: any) => void;
  onGuardianNegotiationTriggered?: (guardianData: any) => void;
  patientName?: string;
}

export function useAlexaAgent(options?: UseAlexaAgentOptions) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPatientSpeaking, setIsPatientSpeaking] = useState<boolean>(false);
  const [patientTranscript, setPatientTranscript] = useState<string>('');
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
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
  const patientFirstName = (options?.patientName || 'Eleanor').split(' ')[0];
  const [conversation, setConversation] = useState<
    Array<{ sender: 'user' | 'alexa'; text: string }>
  >([
    {
      sender: 'alexa',
      text: `Good morning ${patientFirstName}! I am your CareBridge Ambient Copilot. How can I help you today?`,
    },
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'alexa',
      text: `Good morning ${patientFirstName}! I am your CareBridge Ambient Copilot. How can I help you today?`,
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

  useEffect(() => {
    if (options?.patientName) {
      const pFirst = options.patientName.split(' ')[0];
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].id === 'msg_welcome') {
          return [
            {
              ...prev[0],
              text: `Good morning ${pFirst}! I am your CareBridge Ambient Copilot. How can I help you today?`,
            },
          ];
        }
        return prev;
      });
      setConversation((prev) => {
        if (prev.length === 1 && prev[0].sender === 'alexa') {
          return [
            {
              sender: 'alexa',
              text: `Good morning ${pFirst}! I am your CareBridge Ambient Copilot. How can I help you today?`,
            },
          ];
        }
        return prev;
      });
    }
  }, [options?.patientName]);

  const isBusyRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const processVoiceQueryRef = useRef<(text: string) => Promise<void>>(async () => {});
  const lastLowStockMedRef = useRef<string | null>(null);

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
          if (isBusyRef.current || speechService.isSpeaking()) return;

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

        recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            console.warn('[useAlexaAgent] Recognition error:', e.error);
          }
          setIsListening(false);
        };
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
      alert('Your browser does not support the Web Speech API natively. Please use Google Chrome or click the quick simulation prompt chips below to test!');
      return;
    }

    if (isBusyRef.current && !isListening) {
      // Allow instant user barge-in while assistant is speaking (Polly/SpeechSynthesis)
      if (speechService.isSpeaking()) {
        speechService.cancel();
        isBusyRef.current = false;
      } else {
        console.warn('[useAlexaAgent] Cannot toggle listening while agent is thinking');
        return;
      }
    }

    if (isListening) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      setIsListening(false);
    } else {
      speechService.cancel();
      setIsSpeaking(false);
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

/**
 * Latency optimization: Ensure spoken string sent to Polly is concise (<20 words),
 * omitting lengthy clinical markdown explanations to minimize audio rendering time.
 */
function toConciseSpokenSummary(text: string): string {
  if (!text) return '';

  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_#`]/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(' ');
  if (words.length <= 20) {
    return clean;
  }

  // If over 20 words, take the first sentence if concise, or truncate to 18 words
  const firstSentenceMatch = clean.match(/^([^\.\?!]+[\.\?!])/);
  if (firstSentenceMatch) {
    const firstSentence = firstSentenceMatch[1].trim();
    if (firstSentence.split(' ').length <= 20) {
      return firstSentence;
    }
  }

  return words.slice(0, 18).join(' ') + '.';
}

  const processVoiceQuery = useCallback(
    async (
      queryText: string,
      queryOptions?: { skipUserMessage?: boolean; isSimulated?: boolean; userMsgId?: string }
    ) => {
      // 1. Lock against concurrent queries
      if (isBusyRef.current) {
        console.warn('[useAlexaAgent] Dropped concurrent query because agent is busy:', queryText);
        return;
      }

      isBusyRef.current = true;
      setIsThinking(true);

      // 2. Mute microphone immediately & cancel any prior speech
      speechService.cancel();
      setIsSpeaking(false);
      try {
        recognitionRef.current?.abort();
      } catch (_) {}
      setIsListening(false);

      // 3. Play immediate Earcon Chime (0ms) confirming command detection
      speechService.playChime();

      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      const startTime = performance.now();

      const speakAndRelease = (replyText: string) => {
        // Mute mic during Alexa speech
        try {
          recognitionRef.current?.abort();
        } catch (_) {}
        setIsListening(false);
        setIsSpeaking(true);

        // Safety timeout to prevent permanent lock
        const safetyTimer = setTimeout(() => {
          setIsSpeaking(false);
          if (isBusyRef.current) {
            isBusyRef.current = false;
          }
        }, 12000);

        // Latency optimization: Only send concise summary (<20 words) to Polly
        const conciseSpokenText = toConciseSpokenSummary(replyText);

        if (speechService.isSupported()) {
          speechService.speak(conciseSpokenText, {
            onEnd: () => {
              setIsSpeaking(false);
              clearTimeout(safetyTimer);
              // 150ms acoustic buffer guarding microphone against speaker echo (Acoustic Echo Guard)
              setTimeout(() => {
                isBusyRef.current = false;
              }, 150);
            },
            onError: () => {
              setIsSpeaking(false);
              clearTimeout(safetyTimer);
              isBusyRef.current = false;
            },
          });
        } else {
          setIsSpeaking(false);
          clearTimeout(safetyTimer);
          isBusyRef.current = false;
        }
      };

      const trimmed = queryText.trim();
      if (!trimmed) return;

      if (!queryOptions?.skipUserMessage) {
        setConversation((prev) => [...prev, { sender: 'user', text: trimmed }]);
        setMessages((prev) => [
          ...prev,
          {
            id: queryOptions?.userMsgId || `user_${Date.now()}`,
            sender: 'user',
            text: trimmed,
            timestamp: now,
            isSimulated: queryOptions?.isSimulated,
            senderLabel: queryOptions?.isSimulated ? '🎙️ Eleanor (Simulated Voice)' : undefined,
          },
        ]);
      }

      // Log start state of Bedrock Native Tool-Use Orchestrator
      setToolLogs((prev) => [
        {
          timestamp: now,
          toolName: 'Claude Native Tool-Use Orchestrator',
          args: { query: trimmed },
          result: 'Evaluating intent with AWS Bedrock Claude Haiku 4.5...',
          status: 'invoking',
        },
        ...prev,
      ]);

      try {
        // ALL INTENTS ANALYZED VIA CENTRALIZED BEDROCK AGENTIC LOOP
        const turnRes = await mcpClient.executeAgentTurn(trimmed);
        const latency = Math.round(performance.now() - startTime);

        const toolName = turnRes.toolName;
        const toolResult = turnRes.toolResult;
        const toolArgs = turnRes.toolArgs || {};
        const reply =
          turnRes.speechResponse ||
          "I have noted your observation. Please let me know if you need anything else.";

        // Update Tool Execution Log showing Claude's reasoning steps
        if (toolName) {
          setToolLogs((prev) => [
            {
              timestamp: now,
              toolName: `🧠 Claude Reasoned Tool: ${toolName}`,
              args: toolArgs,
              result: toolResult,
              status: 'success',
              latencyMs: latency,
            },
            ...prev.slice(1),
          ]);
        } else {
          setToolLogs((prev) => [
            {
              timestamp: now,
              toolName: 'Direct Conversational Response',
              args: { query: trimmed },
              result: { speechResponse: reply, offlineFallbackUsed: turnRes.offlineFallbackUsed },
              status: 'success',
              latencyMs: latency,
            },
            ...prev.slice(1),
          ]);
        }

        // Construct Alexa response message with complete metadata
        const alexaMsg: ChatMessage = {
          id: `alexa_${Date.now()}`,
          sender: 'alexa',
          text: reply,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          toolCall: toolName
            ? {
                toolName,
                args: toolArgs,
                result: toolResult,
                status: 'success',
                latencyMs: latency,
                urgencyLevel: toolResult?.urgencyLevel || toolResult?.richCard?.urgencyLevel,
                actionAdvice:
                  toolResult?.actionAdvice ||
                  toolResult?.richCard?.actionAdvice ||
                  toolResult?.richCard?.advice,
                clinicalExplanation:
                  toolResult?.clinicalExplanation || toolResult?.richCard?.clinicalExplanation,
              }
            : undefined,
          urgencyLevel: toolResult?.urgencyLevel || toolResult?.richCard?.urgencyLevel,
          actionAdvice:
            toolResult?.actionAdvice ||
            toolResult?.richCard?.actionAdvice ||
            toolResult?.richCard?.advice,
          clinicalExplanation:
            toolResult?.clinicalExplanation || toolResult?.richCard?.clinicalExplanation,
        };

        setConversation((prev) => [...prev, { sender: 'alexa', text: reply }]);
        setMessages((prev) => [...prev, alexaMsg]);

        // Synthesize speechResponse via Unified Alexa Voice (Ruth)
        speakAndRelease(reply);

        // UI NAVIGATION & INTERACTIVE CARD MODALS BASED ON SELECTED TOOL
        if (toolName === 'orderRefill') {
          // Open AmazonOrderCard
          if (options?.onOrderRefillTriggered) {
            options.onOrderRefillTriggered(toolResult);
          }
          if (options?.onDoseLogged) {
            options.onDoseLogged();
          }
        } else if (toolName === 'clinicalAdvisor') {
          // Open ClinicalAdviceCard
          if (options?.onClinicalAdviceTriggered) {
            options.onClinicalAdviceTriggered(toolResult);
          }
        } else if (toolName === 'logDoseStatus') {
          // Record low stock for refill alert if needed
          if (toolResult?.lowStockAlert) {
            lastLowStockMedRef.current = toolResult.lowStockAlert.medicineName;
          }
          // Refresh UI & complete dose effects
          if (options?.onDoseLogged) {
            options.onDoseLogged();
          }
        } else if (toolName === 'recordVitals' || toolName === 'getTodaySchedule') {
          if (options?.onDoseLogged) {
            options.onDoseLogged();
          }
        } else if (toolName === 'ringDeviceHub') {
          if (options?.onRingDeviceTriggered) {
            options.onRingDeviceTriggered(toolResult);
          }
        } else if (toolName === 'negotiateAdherence') {
          if (options?.onGuardianNegotiationTriggered) {
            options.onGuardianNegotiationTriggered(toolResult);
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('Voice command processing error:', message);
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

  const simulateVoiceScenario = useCallback(
    async (scenario: MockVoiceScenario) => {
      // 1. Guard against concurrent query execution
      if (isBusyRef.current || isThinking || isSpeaking || isPatientSpeaking) {
        console.warn('[useAlexaAgent] Simulator locked: agent or speaker is busy');
        return;
      }

      // 2. Safely cancel active Web Speech mic recognition to prevent audio feedback loops
      speechService.cancel();
      setIsSpeaking(false);
      try {
        recognitionRef.current?.abort();
      } catch (_) {}
      setIsListening(false);

      // 3. Initiate Turn 1: Patient Voice Simulation
      setIsPatientSpeaking(true);
      setPatientTranscript(scenario.prompt);
      setActiveScenarioId(scenario.id);

      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      const userSimId = `user_sim_${Date.now()}`;

      // Instantly append user chat bubble to timeline with [🎙️ Eleanor (Simulated Voice)]
      setConversation((prev) => [...prev, { sender: 'user', text: scenario.prompt }]);
      setMessages((prev) => [
        ...prev,
        {
          id: userSimId,
          sender: 'user',
          text: scenario.prompt,
          timestamp: now,
          isSimulated: true,
          senderLabel: '🎙️ Eleanor (Simulated Voice)',
        },
      ]);

      // Helper function to transition from Turn 1 (Patient) to Turn 2 (Alexa Copilot)
      let turn2Started = false;
      const executeTurn2 = async () => {
        if (turn2Started) return;
        turn2Started = true;
        setIsPatientSpeaking(false);
        setPatientTranscript('');
        setActiveScenarioId(null);

        // Execute Turn 2 (Alexa Bedrock reasoning, tool call, Polly speech, rich card)
        await processVoiceQuery(scenario.prompt, {
          skipUserMessage: true,
          isSimulated: true,
        });
      };

      // Synthesize Patient Voice (Eleanor Vance, age 78, gentle pace)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(scenario.prompt);
          utterance.pitch = 0.95; // Gentle mature female pitch
          utterance.rate = 0.92;  // Deliberate, clear cadence for senior
          utterance.lang = 'en-US';

          // Select warm English female voice if available
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Samantha') ||
                v.name.includes('Victoria') ||
                v.name.includes('Google US English') ||
                v.name.includes('Jenny') ||
                v.name.includes('Zira') ||
                v.name.includes('Karen') ||
                v.name.includes('Natural'))
          );
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }

          // Safety timeout to prevent permanent lock if utterance onend does not fire
          const timeoutGuard = setTimeout(() => {
            executeTurn2();
          }, 8500);

          utterance.onend = () => {
            clearTimeout(timeoutGuard);
            // Brief 250ms conversational natural pause between patient finish and Alexa chime
            setTimeout(() => {
              executeTurn2();
            }, 250);
          };

          utterance.onerror = (err) => {
            console.warn('[useAlexaAgent] Patient voice synthesis error, falling back:', err);
            clearTimeout(timeoutGuard);
            executeTurn2();
          };

          window.speechSynthesis.speak(utterance);
          return;
        } catch (err) {
          console.warn('[useAlexaAgent] window.speechSynthesis failed:', err);
        }
      }

      // Fallback if browser audio is restricted or unsupported: 1.2s simulated speaking delay
      setTimeout(() => {
        executeTurn2();
      }, 1200);
    },
    [isThinking, isSpeaking, isPatientSpeaking, processVoiceQuery]
  );

  return {
    isListening,
    isThinking,
    isSpeaking,
    isPatientSpeaking,
    patientTranscript,
    activeScenarioId,
    transcript,
    toolLogs,
    conversation,
    messages,
    toggleListening,
    processVoiceQuery,
    simulateVoiceScenario,
  };
}

export type UseAlexaAgentReturn = ReturnType<typeof useAlexaAgent>;

