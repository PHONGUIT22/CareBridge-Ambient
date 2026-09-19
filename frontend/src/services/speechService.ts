/**
 * Speech Service: Cung cấp giọng đọc Alexa cho người cao tuổi qua:
 * 1. AWS Polly Neural TTS (/api/tts) - Giọng đọc chất lượng cao Ruth / Matthew
 * 2. Web Speech API (window.speechSynthesis) - Fallback offline mượt mà
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_MCP_URL ||
  'http://localhost:3001';

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  voiceId?: string; // 'Ruth' | 'Matthew' | 'Danielle' | 'Amy'
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

class SpeechService {
  private currentAudio: HTMLAudioElement | null = null;
  private activeAbortController: AbortController | null = null;
  private playbackId: number = 0;
  private isSpeakingInternal: boolean = false;

  public isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  public isSpeaking(): boolean {
    if (this.isSpeakingInternal) return true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }

  /**
   * Ngắt toàn bộ âm thanh đang phát (cả AWS Polly Audio Stream lẫn Web Speech API)
   */
  public cancel(): void {
    // 1. Tăng playback ID để vô hiệu hóa các callback bất đồng bộ đang chờ
    this.playbackId++;

    // 2. Abort request fetch đang gửi lên /api/tts
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch (_) {}
      this.activeAbortController = null;
    }

    // 3. Dừng và dọn dẹp Audio element của AWS Polly
    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (_) {}
      this.currentAudio = null;
    }

    // 4. Dừng Web Speech API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    this.isSpeakingInternal = false;
  }

  /**
   * Phát âm thanh với cơ chế 2 tầng:
   * AWS Polly (/api/tts) -> Fallback window.speechSynthesis
   */
  public async speak(text: string, options?: SpeechOptions): Promise<void> {
    if (!this.isSupported()) {
      options?.onEnd?.();
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    // Ngắt bất kỳ âm thanh nào đang phát trước đó
    this.cancel();

    const currentId = ++this.playbackId;
    this.isSpeakingInternal = true;

    // TẦNG 1: Thử gọi AWS Polly Neural TTS từ backend
    try {
      this.activeAbortController = new AbortController();
      const timeoutId = setTimeout(() => {
        this.activeAbortController?.abort();
      }, 5000);

      const response = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          voiceId: options?.voiceId || 'Ruth',
        }),
        signal: this.activeAbortController.signal,
      });

      clearTimeout(timeoutId);

      // Kiểm tra nếu phiên đã bị huỷ trong lúc chờ fetch
      if (currentId !== this.playbackId) return;

      if (response.ok) {
        const data = await response.json();

        if (currentId !== this.playbackId) return;

        if (data.success && data.audioBase64) {
          console.log('[SpeechService] Phát âm thanh qua AWS Polly Neural Voice (Ruth)');
          const audioUrl = `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`;
          const audio = new Audio(audioUrl);
          this.currentAudio = audio;

          audio.onended = () => {
            if (currentId === this.playbackId) {
              this.currentAudio = null;
              this.isSpeakingInternal = false;
              options?.onEnd?.();
            }
          };

          audio.onerror = (e) => {
            console.warn('[SpeechService] Audio element gặp lỗi khi phát Polly stream:', e);
            if (currentId === this.playbackId) {
              this.currentAudio = null;
              this.fallbackToSpeechSynthesis(cleanText, options, currentId);
            }
          };

          options?.onStart?.();
          await audio.play();
          return;
        } else if (data.fallback) {
          console.info('[SpeechService] Backend phản hồi fallback AWS Polly -> chuyển sang Web Speech API');
        }
      }
    } catch (err: any) {
      // Nếu là do cancel() gọi abort() thì không fallback nữa
      if (currentId !== this.playbackId) return;
      console.warn('[SpeechService] Không thể kết nối tới AWS Polly TTS endpoint, fallback sang Web Speech API:', err.message);
    }

    // TẦNG 2: Fallback sang Web Speech API
    if (currentId === this.playbackId) {
      this.fallbackToSpeechSynthesis(cleanText, options, currentId);
    }
  }

  /**
   * Fallback Web Speech API cục bộ trên trình duyệt
   */
  private fallbackToSpeechSynthesis(
    text: string,
    options?: SpeechOptions,
    currentId?: number
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeakingInternal = false;
      options?.onEnd?.();
      return;
    }

    if (currentId !== undefined && currentId !== this.playbackId) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate ?? 0.9;
      utterance.pitch = options?.pitch ?? 1.05;
      utterance.lang = options?.lang ?? 'en-US';

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        if (currentId === undefined || currentId === this.playbackId) {
          this.isSpeakingInternal = false;
          options?.onEnd?.();
        }
      };

      utterance.onerror = (err) => {
        console.warn('[SpeechService] SpeechSynthesis error:', err);
        if (currentId === undefined || currentId === this.playbackId) {
          this.isSpeakingInternal = false;
          options?.onEnd?.();
        }
      };

      // Chọn giọng tiếng Anh tự nhiên ấm áp
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Samantha') ||
            v.name.includes('Victoria') ||
            v.name.includes('Natural') ||
            v.name.includes('Google US English') ||
            v.name.includes('Zira') ||
            v.name.includes('Jenny'))
      );

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[SpeechService] Lỗi khởi chạy SpeechSynthesis:', err);
      this.isSpeakingInternal = false;
      options?.onEnd?.();
    }
  }
}

export const speechService = new SpeechService();
