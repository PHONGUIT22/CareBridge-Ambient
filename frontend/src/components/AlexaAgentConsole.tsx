'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faMicrophone,
  faPaperPlane,
  faBolt,
  faCode,
  faChevronDown,
  faChevronUp,
  faStethoscope,
  faClock,
  faCheck,
  faTriangleExclamation,
  faCircleNotch,
} from '@fortawesome/free-solid-svg-icons';
import { UseAlexaAgentReturn, ChatMessage, ToolExecutionLog } from '../hooks/useAlexaAgent';
import { ClinicalAdviceResponse } from '../types';

export interface AlexaAgentConsoleProps {
  onTriggerVisualCard?: (medName: string) => void;
  onTriggerClinicalAdvice?: (advice: ClinicalAdviceResponse) => void;
  onRefreshData?: () => void;
  voiceAgent?: UseAlexaAgentReturn;
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  transcript?: string;
  messages?: ChatMessage[];
  toolLogs?: ToolExecutionLog[];
  toggleListening?: () => void;
  processVoiceQuery?: (query: string) => Promise<void>;
}

const QUICK_PROMPTS = [
  {
    label: "What's my schedule?",
    prompt: "Alexa, what's my medicine schedule today?",
  },
  {
    label: 'Took Atorvastatin (Low Stock)',
    prompt: 'Alexa, I just took my Atorvastatin pill.',
  },
  {
    label: 'Yes, Order Refill (Amazon)',
    prompt: 'Alexa, yes, order my Atorvastatin refill via Amazon Pharmacy.',
  },
  {
    label: 'Took Amlodipine',
    prompt: 'Alexa, I just took my morning Amlodipine pill.',
  },
  {
    label: 'Mild dizziness',
    prompt: 'Alexa, I feel mild dizziness after taking my pill.',
  },
  {
    label: 'Chest discomfort',
    prompt: 'Alexa, I have severe crushing chest pain and shortness of breath.',
  },
];

const EMPTY_MESSAGES: ChatMessage[] = [];

export function AlexaAgentConsole({
  onTriggerVisualCard,
  onTriggerClinicalAdvice,
  onRefreshData,
  voiceAgent,
  isListening: propIsListening,
  isThinking: propIsThinking,
  isSpeaking: propIsSpeaking,
  transcript: propTranscript,
  messages: propMessages,
  toggleListening: propToggleListening,
  processVoiceQuery: propProcessVoiceQuery,
}: AlexaAgentConsoleProps) {
  const [expandedJsonIds, setExpandedJsonIds] = useState<Record<string, boolean>>({});
  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Nhận trực tiếp state và actions từ hook khởi tạo duy nhất tại page.tsx
  const isListening = voiceAgent ? voiceAgent.isListening : propIsListening ?? false;
  const isThinking = voiceAgent ? voiceAgent.isThinking : propIsThinking ?? false;
  const isSpeaking = voiceAgent ? (voiceAgent as any).isSpeaking : propIsSpeaking ?? false;
  const transcript = voiceAgent ? voiceAgent.transcript : propTranscript ?? '';
  const messages = voiceAgent ? voiceAgent.messages : propMessages ?? EMPTY_MESSAGES;
  const toggleListening = voiceAgent ? voiceAgent.toggleListening : propToggleListening ?? (() => {});
  const processVoiceQuery = voiceAgent ? voiceAgent.processVoiceQuery : propProcessVoiceQuery ?? (async () => {});

  const toggleJson = (id: string) => {
    setExpandedJsonIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Auto-scroll on new message or thinking state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = () => {
    const trimmed = inputQuery.trim();
    if (!trimmed || isThinking) return;
    processVoiceQuery(trimmed);
    setInputQuery('');
  };

  const urgencyBadgeStyle = (level?: string) => {
    switch (level?.toUpperCase()) {
      case 'LOW':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'MEDIUM':
      case 'MODERATE':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'HIGH':
      case 'EMERGENCY':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-[#FF5733]/15 text-[#FF5733] border-[#FF5733]/30';
    }
  };

  const formatAdviceSteps = (text?: string) => {
    if (!text) return null;
    const parts = text
      .split(/(?=\d+\.\s)/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length > 1) {
      return (
        <div className="space-y-1 mt-1.5">
          {parts.map((part, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5733] mt-1.5 shrink-0" />
              <span>{part}</span>
            </div>
          ))}
        </div>
      );
    }
    return <p className="text-xs text-slate-300 mt-1 leading-relaxed">{text}</p>;
  };

  return (
    <div className="flex flex-col h-full select-none font-sans overflow-hidden bg-[#151922]">
      {/* 1. COMPACT HEADER */}
      <div className="px-4 py-3 border-b border-white/[0.08] shrink-0 bg-[#151922]/95 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FF5733] flex items-center justify-center text-white text-xs">
              <FontAwesomeIcon icon={faShieldHalved} />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-white flex items-center gap-1.5 leading-none tracking-tight">
                <span>Alexa Ambient Agent</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5733] animate-pulse" />
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                MCP Streamable HTTP - Claude Haiku 4.5
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isListening && (
              <span className="px-2 py-0.5 rounded-full bg-[#FF5733]/15 border border-[#FF5733]/30 text-[#FF5733] text-xs font-mono font-medium flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5733] animate-ping" />
                Listening
              </span>
            )}
            {isThinking && (
              <span className="px-2 py-0.5 rounded-full bg-[#4D8BFF]/15 border border-[#4D8BFF]/30 text-[#4D8BFF] text-xs font-mono font-medium flex items-center gap-1">
                <FontAwesomeIcon icon={faCircleNotch} className="animate-spin text-[10px]" />
                Thinking
              </span>
            )}
            {isSpeaking && (
              <span className="px-2 py-0.5 rounded-full bg-[#00CAFF]/15 border border-[#00CAFF]/40 text-[#00CAFF] text-xs font-mono font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00CAFF] animate-pulse" />
                Speaking
              </span>
            )}
            {!isListening && !isThinking && !isSpeaking && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
                Live
              </span>
            )}
          </div>
        </div>

        {/* Compact horizontal scrolling quick-test chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {QUICK_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => processVoiceQuery(item.prompt)}
              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#1E2330] hover:border-[#FF5733]/50 border border-white/[0.08] text-xs text-slate-300 hover:text-white whitespace-nowrap transition-all shrink-0 active:scale-95"
            >
              <span>&ldquo;{item.label}&rdquo;</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. MAIN MESSAGE BODY (FULL-HEIGHT AGENTIC CHAT TIMELINE) */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 87, 51, 0.25) transparent',
        }}
      >
        {messages.map((msg: ChatMessage) => {
          const isUser = msg.sender === 'user';
          const hasToolCall = Boolean(msg.toolCall);
          const isExpanded = Boolean(expandedJsonIds[msg.id]);

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end animate-fadeIn">
                <div className="max-w-[85%] bg-[#1E2330] text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs shadow-sm border border-white/[0.08]">
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <span className="block text-xs text-slate-400 text-right mt-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          }

          // Alexa / Assistant Turn
          return (
            <div key={msg.id} className="flex flex-col gap-2 items-start max-w-[95%] animate-fadeIn">
              {/* Alexa Header Tag */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#FF5733]/15 text-[#FF5733] border border-[#FF5733]/30 flex items-center justify-center text-xs">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </div>
                <span className="text-xs font-semibold text-white tracking-tight">Alexa Copilot</span>
                {msg.urgencyLevel && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium border ${urgencyBadgeStyle(
                      msg.urgencyLevel
                    )}`}
                  >
                    {msg.urgencyLevel}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono ml-auto">
                  {msg.timestamp}
                </span>
              </div>

              {/* Inline Tool Call Accordion Pill */}
              {hasToolCall && msg.toolCall && (
                <div className="w-full flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs bg-[#151922] px-2.5 py-1.5 rounded-xl border border-white/[0.08] hover:border-white/15 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-[#FF5733] flex items-center gap-1 font-mono font-medium">
                        <FontAwesomeIcon icon={faBolt} className="text-xs" />
                        <span>
                          {msg.toolCall.toolName.startsWith('🧠')
                            ? msg.toolCall.toolName
                            : `🧠 Claude Reasoned Tool: ${msg.toolCall.toolName}`}
                        </span>
                      </span>
                      {msg.toolCall.latencyMs !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 text-xs font-mono border border-white/[0.08]">
                          {msg.toolCall.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleJson(msg.id)}
                      className="px-2 py-0.5 rounded text-xs font-mono text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] flex items-center gap-1 transition-all"
                      title="Toggle raw JSON payload"
                    >
                      <FontAwesomeIcon icon={faCode} className="text-xs" />
                      <span>{isExpanded ? 'Hide JSON' : '</> JSON'}</span>
                      <FontAwesomeIcon
                        icon={isExpanded ? faChevronUp : faChevronDown}
                        className="text-[9px]"
                      />
                    </button>
                  </div>

                  {/* Collapsible Raw JSON Payload Drawer */}
                  {isExpanded && (
                    <div className="p-2.5 rounded-xl bg-[#151922] border border-white/[0.08] font-mono text-xs text-emerald-400 max-h-40 overflow-y-auto break-all shadow-inner select-text">
                      <div className="text-slate-400 text-xs mb-1 font-mono">
                        Args: {JSON.stringify(msg.toolCall.args)}
                      </div>
                      <pre className="whitespace-pre-wrap leading-snug">
                        {typeof msg.toolCall.result === 'object'
                          ? JSON.stringify(msg.toolCall.result, null, 2)
                          : String(msg.toolCall.result)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Conversational Text Bubble */}
              <div className="bg-[#1E2330] border border-white/[0.08] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-white leading-relaxed shadow-sm w-full">
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Structured Action Guidance */}
                {msg.actionAdvice && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FF5733] mb-1">
                      <FontAwesomeIcon icon={faStethoscope} className="text-xs" />
                      <span>Action guidance</span>
                    </div>
                    {formatAdviceSteps(msg.actionAdvice)}
                  </div>
                )}

                {/* Clinical Insight / Rationale */}
                {msg.clinicalExplanation && (
                  <div className="mt-2 text-xs text-slate-300 bg-[#151922] rounded-xl p-2.5 border border-white/[0.06] leading-relaxed">
                    <span className="text-slate-200 font-semibold">Clinical insight: </span>
                    {msg.clinicalExplanation}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking / Bedrock Reasoning Indicator */}
        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pl-1 py-1">
            <div className="w-2 h-2 rounded-full bg-[#FF5733] animate-pulse" />
            <span className="text-xs font-mono text-[#FF5733]">
              AWS Bedrock Claude Haiku 4.5 reasoning...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. BOTTOM FIXED INPUT BAR */}
      <div className="p-3 border-t border-white/[0.08] bg-[#151922]/95 backdrop-blur-md shrink-0 flex flex-col gap-2">
        {/* Dynamic Voice Recording / Listening Banner */}
        {isListening && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#FF5733]/10 border border-[#FF5733]/30 text-[#FF5733] text-xs animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF5733] animate-ping" />
              <span className="truncate">
                {transcript ? `"${transcript}"` : 'Listening to voice query... speak now'}
              </span>
            </div>
            <button
              onClick={toggleListening}
              className="text-xs text-slate-400 hover:text-white underline shrink-0 ml-2"
            >
              Stop
            </button>
          </div>
        )}

        {/* Text Input with Embedded Mic & Send Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask Alexa or report symptoms..."
            className="w-full bg-[#1E2330] border border-white/[0.08] focus:border-[#FF5733] rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-white placeholder-slate-400 outline-none transition-all shadow-inner"
          />

          {/* Action Buttons Pinned to Right Edge */}
          <div className="absolute right-1.5 flex items-center gap-1">
            {/* Tactile Signal Coral Mic with Alexa Cyan Glow */}
            <button
              type="button"
              onClick={toggleListening}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-[#FF5733] text-white ring-2 ring-[#00CAFF]/70 shadow-[0_0_10px_rgba(0,202,255,0.6)]'
                  : 'bg-[#151922] text-[#FF5733] hover:bg-[#FF5733]/20 border border-[#FF5733]/40'
              }`}
              title={isListening ? 'Click to stop listening' : 'Speak with Alexa'}
            >
              <FontAwesomeIcon icon={faMicrophone} className="text-xs" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputQuery.trim() || isThinking}
              className="w-7 h-7 rounded-lg bg-[#151922] hover:bg-[#FF5733] text-slate-400 hover:text-white border border-white/[0.08] flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none"
              title="Send text query"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
            </button>
          </div>
        </form>
      </div>

      {/* Alexa Cyan Ambient Light Bar at the bottom of the console */}
      <div
        className={`w-full h-[2.5px] transition-all duration-300 ${
          isListening || isThinking || isSpeaking ? 'opacity-100 alexa-lightbar' : 'opacity-0'
        }`}
      />
    </div>
  );
}