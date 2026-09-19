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
import { useAlexaAgent, ChatMessage } from '../hooks/useAlexaAgent';
import { ClinicalAdviceResponse } from '../types';

interface AlexaAgentConsoleProps {
  onTriggerVisualCard?: (medName: string) => void;
  onTriggerClinicalAdvice?: (advice: ClinicalAdviceResponse) => void;
  onRefreshData?: () => void;
}

const QUICK_PROMPTS = [
  {
    icon: '💬',
    label: "What's my schedule?",
    prompt: "Alexa, what's my medicine schedule today?",
    badgeClass: 'hover:border-[#00CAFF]/40 text-slate-200',
  },
  {
    icon: '💊',
    label: 'Took Amlodipine',
    prompt: 'Alexa, I just took my morning Amlodipine pill.',
    badgeClass: 'hover:border-emerald-500/40 text-emerald-300',
  },
  {
    icon: '⚠️',
    label: 'Mild dizziness',
    prompt: 'Alexa, I feel mild dizziness after taking my pill.',
    badgeClass: 'hover:border-amber-500/40 text-amber-300',
  },
  {
    icon: '🚨',
    label: 'Severe chest pain',
    prompt: 'Alexa, I have severe crushing chest pain and shortness of breath.',
    badgeClass: 'hover:border-rose-500/40 text-rose-300',
  },
];

export function AlexaAgentConsole({
  onTriggerVisualCard,
  onTriggerClinicalAdvice,
  onRefreshData,
}: AlexaAgentConsoleProps) {
  const [expandedJsonIds, setExpandedJsonIds] = useState<Record<string, boolean>>({});
  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    isThinking,
    transcript,
    messages,
    toggleListening,
    processVoiceQuery,
  } = useAlexaAgent({
    onDoseLogged: () => {
      if (onRefreshData) onRefreshData();
    },
    onClinicalAdviceTriggered: (advice) => {
      if (onTriggerClinicalAdvice) {
        onTriggerClinicalAdvice(advice);
      } else if (onTriggerVisualCard) {
        onTriggerVisualCard('Amlodipine (Norvasc)');
      }
    },
  });

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
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'MEDIUM':
      case 'MODERATE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'HIGH':
      case 'EMERGENCY':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      default:
        return 'bg-[#00CAFF]/20 text-[#00CAFF] border-[#00CAFF]/40';
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
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00CAFF] mt-1.5 shrink-0" />
              <span>{part}</span>
            </div>
          ))}
        </div>
      );
    }
    return <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{text}</p>;
  };

  return (
    <div className="flex flex-col h-full select-none font-sans overflow-hidden bg-[#181B2A]">
      {/* 1. COMPACT HEADER */}
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0 bg-[#181B2A]/90 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#FF725E] to-[#FF8A71] flex items-center justify-center text-white text-xs shadow-[0_0_12px_rgba(255,114,94,0.35)]">
              <FontAwesomeIcon icon={faShieldHalved} />
            </div>
            <div>
              <h2 className="text-xs font-black text-white flex items-center gap-1.5 leading-none tracking-tight">
                <span>Alexa Ambient Agent</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF725E] animate-pulse" />
              </h2>
              <p className="text-[9.5px] text-[#8A92A6] font-mono tracking-wider mt-0.5">
                MCP Streamable HTTP • Claude Haiku 4.5
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold tracking-wider">
            LIVE
          </span>
        </div>

        {/* Compact horizontal scrolling quick-test chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {QUICK_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => processVoiceQuery(item.prompt)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] hover:border-[#FF725E]/50 border border-white/[0.08] text-[10.5px] text-[#8A92A6] hover:text-white whitespace-nowrap transition-all shrink-0 active:scale-95"
            >
              <span>{item.icon}</span>
              <span className="font-medium">&ldquo;{item.label}&rdquo;</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. MAIN MESSAGE BODY (FULL-HEIGHT AGENTIC CHAT TIMELINE) */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 114, 94, 0.25) transparent',
        }}
      >
        {messages.map((msg: ChatMessage) => {
          const isUser = msg.sender === 'user';
          const hasToolCall = Boolean(msg.toolCall);
          const isExpanded = Boolean(expandedJsonIds[msg.id]);

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end animate-fadeIn">
                <div className="max-w-[85%] bg-[#2A314A] text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs shadow-sm border border-white/[0.08]">
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <span className="block text-[9px] text-[#8A92A6] text-right mt-1 font-mono">
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
                <div className="w-5 h-5 rounded-md bg-[#FF725E]/20 text-[#FF725E] border border-[#FF725E]/40 flex items-center justify-center text-[10px] shadow-[0_0_8px_rgba(255,114,94,0.3)]">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </div>
                <span className="text-[11px] font-black text-white tracking-tight">Alexa Copilot</span>
                {msg.urgencyLevel && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-display font-extrabold uppercase tracking-wider border ${urgencyBadgeStyle(
                      msg.urgencyLevel
                    )}`}
                  >
                    {msg.urgencyLevel}
                  </span>
                )}
                <span className="text-[9px] text-[#8A92A6] font-mono ml-auto">
                  {msg.timestamp}
                </span>
              </div>

              {/* Inline Tool Call Accordion Pill */}
              {hasToolCall && msg.toolCall && (
                <div className="w-full flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] bg-[#181B2A] px-2.5 py-1.5 rounded-xl border border-white/[0.06] hover:border-white/15 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-[#4D8BFF] flex items-center gap-1 font-semibold font-mono">
                        <FontAwesomeIcon icon={faBolt} className="text-[9px]" />
                        <span>{msg.toolCall.toolName}</span>
                      </span>
                      {msg.toolCall.latencyMs !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-mono border border-amber-500/30">
                          {msg.toolCall.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleJson(msg.id)}
                      className="px-2 py-0.5 rounded text-[9px] font-mono text-[#8A92A6] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] flex items-center gap-1 transition-all"
                      title="Toggle raw JSON payload"
                    >
                      <FontAwesomeIcon icon={faCode} className="text-[8px]" />
                      <span>{isExpanded ? 'Hide JSON' : '</> JSON'}</span>
                      <FontAwesomeIcon
                        icon={isExpanded ? faChevronUp : faChevronDown}
                        className="text-[7px]"
                      />
                    </button>
                  </div>

                  {/* Collapsible Raw JSON Payload Drawer */}
                  {isExpanded && (
                    <div className="p-2.5 rounded-xl bg-[#121420] border border-white/[0.06] font-mono text-[9.5px] text-emerald-400 max-h-40 overflow-y-auto break-all shadow-inner select-text">
                      <div className="text-[#8A92A6] text-[9px] mb-1 font-mono">
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
              <div className="bg-[#1F2438] border border-white/[0.08] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-white leading-relaxed shadow-sm w-full">
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Structured Action Guidance */}
                {msg.actionAdvice && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF725E] uppercase tracking-wider mb-1">
                      <FontAwesomeIcon icon={faStethoscope} className="text-[9px]" />
                      <span>Action Guidance</span>
                    </div>
                    {formatAdviceSteps(msg.actionAdvice)}
                  </div>
                )}

                {/* Clinical Insight / Rationale */}
                {msg.clinicalExplanation && (
                  <div className="mt-2 text-[10px] text-[#8A92A6] bg-[#181B2A] rounded-lg p-2 border border-white/[0.04] leading-relaxed">
                    <span className="text-[#4D8BFF] font-semibold">Clinical Insight: </span>
                    {msg.clinicalExplanation}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking / Bedrock Reasoning Indicator */}
        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-[#8A92A6] animate-pulse pl-1 py-1">
            <div className="w-2 h-2 rounded-full bg-[#FF725E] animate-ping" />
            <span className="text-[11px] font-mono text-[#FF725E]">
              AWS Bedrock Claude Haiku 4.5 reasoning...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. BOTTOM FIXED INPUT BAR */}
      <div className="p-3 border-t border-white/[0.06] bg-[#181B2A]/90 backdrop-blur-md shrink-0 flex flex-col gap-2">
        {/* Dynamic Voice Recording / Listening Banner */}
        {isListening && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#FF725E]/10 border border-[#FF725E]/30 text-[#FF725E] text-xs font-display animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF725E] animate-ping" />
              <span className="truncate">
                {transcript ? `"${transcript}"` : 'Listening to voice query... speak now'}
              </span>
            </div>
            <button
              onClick={toggleListening}
              className="text-[10px] text-[#8A92A6] hover:text-white underline shrink-0 ml-2"
            >
              Stop
            </button>
          </div>
        )}

        {/* Text Input with Embedded Glowing Mic Orb & Send Button */}
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
            className="w-full bg-[#22273B] border border-white/[0.06] focus:border-[#FF725E]/60 rounded-2xl pl-3.5 pr-20 py-2.5 text-xs text-white placeholder-[#8A92A6] outline-none transition-all shadow-inner focus:shadow-[0_0_15px_rgba(255,114,94,0.2)]"
          />

          {/* Action Buttons Pinned to Right Edge */}
          <div className="absolute right-1.5 flex items-center gap-1">
            {/* Glowing Circular Coral Mic Orb */}
            <button
              type="button"
              onClick={toggleListening}
              style={{
                boxShadow: isListening
                  ? '0 0 20px rgba(255, 114, 94, 0.85)'
                  : '0 0 10px rgba(255, 114, 94, 0.3)',
              }}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-gradient-to-tr from-[#FF725E] to-[#FF8A71] text-white scale-105'
                  : 'bg-[#FF725E]/15 text-[#FF725E] hover:bg-[#FF725E]/30 border border-[#FF725E]/40'
              }`}
              title={isListening ? 'Click to stop listening' : 'Speak with Alexa'}
            >
              <FontAwesomeIcon icon={faMicrophone} className="text-xs" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputQuery.trim() || isThinking}
              className="w-7 h-7 rounded-xl bg-white/[0.08] hover:bg-gradient-to-r hover:from-[#FF725E] hover:to-[#FF8A71] text-[#8A92A6] hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none"
              title="Send text query"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="text-[10px]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}