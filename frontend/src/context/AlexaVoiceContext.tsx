'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AlexaVoiceContextType {
  isListening: boolean;
  setIsListening: (val: boolean) => void;
  lastSpokenText: string | null;
  setLastSpokenText: (val: string | null) => void;
}

const AlexaVoiceContext = createContext<AlexaVoiceContextType | undefined>(undefined);

export function AlexaVoiceProvider({ children }: { children: ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState<string | null>(null);

  return (
    <AlexaVoiceContext.Provider
      value={{
        isListening,
        setIsListening,
        lastSpokenText,
        setLastSpokenText,
      }}
    >
      {children}
    </AlexaVoiceContext.Provider>
  );
}

export function useAlexaVoice() {
  const context = useContext(AlexaVoiceContext);
  if (!context) {
    throw new Error('useAlexaVoice must be used within an AlexaVoiceProvider');
  }
  return context;
}
