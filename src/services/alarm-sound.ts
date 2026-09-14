import { Platform, Vibration } from 'react-native';

const VIBRATION_PATTERN = [0, 400, 200, 400, 200, 400];
const BEEP_COUNT = 3;
const BEEP_FREQUENCY = 880;
const BEEP_DURATION_MS = 220;
const BEEP_GAP_MS = 140;

function beepWeb(): void {
  try {
    const AnyWindow = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AnyWindow) return;
    const ctx = new AnyWindow();
    const start = ctx.currentTime + 0.05;
    for (let index = 0; index < BEEP_COUNT; index += 1) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = start + (index * (BEEP_DURATION_MS + BEEP_GAP_MS)) / 1000;
      oscillator.frequency.value = BEEP_FREQUENCY;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.0001, offset);
      gain.gain.exponentialRampToValueAtTime(0.35, offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, offset + BEEP_DURATION_MS / 1000);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(offset);
      oscillator.stop(offset + BEEP_DURATION_MS / 1000);
    }
    setTimeout(() => {
      ctx.close().catch(() => undefined);
    }, (BEEP_COUNT * (BEEP_DURATION_MS + BEEP_GAP_MS)) + 500);
  } catch {
    // ignore audio failures (autoplay restrictions, SSR, etc.)
  }
}

function vibrateNative(): void {
  if (Platform.OS === 'web') return;
  Vibration.vibrate(VIBRATION_PATTERN);
}

export function triggerAlarm(): void {
  if (Platform.OS === 'web') {
    beepWeb();
    return;
  }
  vibrateNative();
}
