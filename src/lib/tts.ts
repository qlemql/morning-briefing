/**
 * Web Speech API TTS wrapper
 * - Zero cost: uses browser built-in speech synthesis
 * - Korean voice auto-selection (ko-KR)
 * - Graceful degradation when unsupported
 * - Chrome long-text bug workaround (pause/resume every 10s)
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Cache voices when they become available (async in Chrome)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function getKoreanVoice(): SpeechSynthesisVoice | null {
  // Use cached voices (handles Chrome async loading)
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'ko-KR') ??
    voices.find((v) => v.lang.startsWith('ko')) ??
    null
  );
}

function clearKeepAlive(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

export function speak(text: string, onEnd?: () => void): void {
  if (!isSupported()) return;

  // Stop any current speech before starting new one
  stop();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  const voice = getKoreanVoice();
  if (voice) {
    utterance.voice = voice;
  }

  const cleanup = () => {
    currentUtterance = null;
    clearKeepAlive();
    onEnd?.();
  };

  utterance.onend = cleanup;
  utterance.onerror = cleanup;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);

  // Chrome workaround: speechSynthesis stops after ~15s on long text.
  // Periodically pause/resume to keep it alive.
  clearKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);
}

export function pause(): void {
  if (!isSupported()) return;
  window.speechSynthesis.pause();
}

export function resume(): void {
  if (!isSupported()) return;
  window.speechSynthesis.resume();
}

export function stop(): void {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
  clearKeepAlive();
}

export function isSpeaking(): boolean {
  if (!isSupported()) return false;
  return window.speechSynthesis.speaking;
}

export function isPaused(): boolean {
  if (!isSupported()) return false;
  return window.speechSynthesis.paused;
}
