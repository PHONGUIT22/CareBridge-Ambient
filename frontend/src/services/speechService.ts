/**
 * Speech Service: Cung cấp giọng đọc Alexa cho người cao tuổi qua Web Speech API
 */
export const speechService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      lang?: string;
      onEnd?: () => void;
    }
  ): void {
    if (!this.isSupported()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 0.9;
    utterance.pitch = options?.pitch ?? 1.05;
    utterance.lang = options?.lang ?? 'en-US';

    if (options?.onEnd) {
      utterance.onend = () => options.onEnd?.();
      utterance.onerror = () => options.onEnd?.();
    }

    // Ưu tiên chọn giọng nữ tiếng Anh ấm áp tự nhiên (Samantha, Victoria, Google US English, Zira)
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Samantha') ||
          v.name.includes('Victoria') ||
          v.name.includes('Natural') ||
          v.name.includes('Google US English') ||
          v.name.includes('Zira'))
    );

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    window.speechSynthesis.speak(utterance);
  },

  cancel(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  },
};
