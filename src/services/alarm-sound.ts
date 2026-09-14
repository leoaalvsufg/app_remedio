import { Platform, Vibration } from 'react-native';

const VIBRATION_PATTERN = [0, 400, 200, 400, 200, 400];
const BEEP_COUNT = 3;
const BEEP_FREQUENCY = 880;
const BEEP_DURATION_MS = 220;
const BEEP_GAP_MS = 140;

type WebAudioGlobal = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

let webAudioContext: AudioContext | null = null;

function getWebAudioContext(): AudioContext | null {
  if (webAudioContext?.state !== 'closed') return webAudioContext;
  const audioGlobal = globalThis as WebAudioGlobal;
  const AudioContextConstructor = audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  webAudioContext = new AudioContextConstructor();
  return webAudioContext;
}

function scheduleWebBeeps(ctx: AudioContext): void {
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
}

function beepWeb(): void {
  try {
    const ctx = getWebAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => scheduleWebBeeps(ctx)).catch(() => undefined);
      return;
    }
    scheduleWebBeeps(ctx);
  } catch {
    // Browser audio availability must not prevent the visual alarm.
  }
}

export function armAlarmSound(): void {
  if (Platform.OS !== 'web') return;
  try {
    const ctx = getWebAudioContext();
    if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
  } catch {
    // Audio can remain unavailable while visual alarms continue to work.
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
