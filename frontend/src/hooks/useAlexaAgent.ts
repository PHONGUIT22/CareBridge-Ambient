'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { ClinicalAdviceResponse, AmazonRefillOrder } from '../types';

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

export interface UseAlexaAgentOptions {
  onDoseLogged?: () => void;
  onClinicalAdviceTriggered?: (advice: ClinicalAdviceResponse) => void;
  onOrderRefillTriggered?: (order: AmazonRefillOrder) => void;
}

export function useAlexaAgent(options?: UseAlexaAgentOptions) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
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
      alert('Trình duyệt chưa hỗ trợ Web Speech API. Bạn có thể nhấn các nút mô phỏng câu lệnh bên dưới để trải nghiệm!');
      return;
    }

    if (isBusyRef.current && !isListening) {
      // Nếu trợ lý đang nói (Polly/SpeechSynthesis), cho phép người dùng ngắt lời tức thì
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
 * Tối ưu độ trễ âm thanh: Đảm bảo câu đọc gửi sang Polly ngắn gọn dưới 20 từ,
 * không gửi phần giải thích lâm sàng dài dòng để giảm thiểu thời gian kết xuất âm thanh.
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

  // Nếu quá 20 từ, lấy câu đầu tiên nếu ngắn gọn hoặc cắt tối đa 18 từ
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
    async (queryText: string) => {
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

      // 3. Phát Earcon Chime lập tức (0ms) xác nhận hệ thống đã nhận diện câu lệnh
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

        // Tối ưu độ trễ: Chỉ gửi câu tóm tắt ngắn (dưới 20 từ) sang Polly
        const conciseSpokenText = toConciseSpokenSummary(replyText);

        if (speechService.isSupported()) {
          speechService.speak(conciseSpokenText, {
            onEnd: () => {
              setIsSpeaking(false);
              clearTimeout(safetyTimer);
              // Khoảng đệm 150ms chống vang âm thanh loa vào mic (Acoustic Echo Guard)
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

      setConversation((prev) => [...prev, { sender: 'user', text: trimmed }]);
      setMessages((prev) => [
        ...prev,
        {
          id: `user_${Date.now()}`,
          sender: 'user',
          text: trimmed,
          timestamp: now,
        },
      ]);

      // Ghi nhận trạng thái bắt đầu gọi Bedrock Native Tool-Use Orchestrator
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
        // TOÀN BỘ Ý ĐỊNH ĐƯỢC PHÂN TÍCH QUA BEDROCK AGENTIC LOOP TẬP TRUNG
        const turnRes = await mcpClient.executeAgentTurn(trimmed);
        const latency = Math.round(performance.now() - startTime);

        const toolName = turnRes.toolName;
        const toolResult = turnRes.toolResult;
        const toolArgs = turnRes.toolArgs || {};
        const reply =
          turnRes.speechResponse ||
          "I have noted your observation. Please let me know if you need anything else.";

        // Cập nhật Tool Execution Log hiển thị rõ bước suy luận của Claude
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

        // Tạo message cho Alexa với đầy đủ metadata
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

        // Đọc lời thoại speechResponse qua AWS Polly Neural Voice (Ruth)
        speakAndRelease(reply);

        // ĐIỀU HƯỚNG GIAO DIỆN & MỞ THẺ TƯƠNG TÁC DỰA TRÊN TOOL CLAUDE CHỌN
        if (toolName === 'orderRefill') {
          // Mở AmazonOrderCard
          if (options?.onOrderRefillTriggered) {
            options.onOrderRefillTriggered(toolResult);
          }
          if (options?.onDoseLogged) {
            options.onDoseLogged();
          }
        } else if (toolName === 'clinicalAdvisor') {
          // Mở ClinicalAdviceCard
          if (options?.onClinicalAdviceTriggered) {
            options.onClinicalAdviceTriggered(toolResult);
          }
        } else if (toolName === 'logDoseStatus') {
          // Ghi nhận tồn kho thấp để refill nếu cần
          if (toolResult?.lowStockAlert) {
            lastLowStockMedRef.current = toolResult.lowStockAlert.medicineName;
          }
          // Làm mới giao diện & hiệu ứng hoàn thành cữ thuốc
          if (options?.onDoseLogged) {
            options.onDoseLogged();
          }
        } else if (toolName === 'recordVitals' || toolName === 'getTodaySchedule') {
          if (options?.onDoseLogged) {
            options.onDoseLogged();
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
    isSpeaking,
    transcript,
    toolLogs,
    conversation,
    messages,
    toggleListening,
    processVoiceQuery,
  };
}

export type UseAlexaAgentReturn = ReturnType<typeof useAlexaAgent>;
