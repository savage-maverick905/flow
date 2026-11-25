export interface Settings {
  theme: 'dark' | 'light';
  fontSize: number;
  wpm: number;
  step: number;
  orp: boolean;
  pauses: boolean;
  preview: boolean;
}

export const DEFAULTS: Settings = {
  theme: 'dark',
  fontSize: 72,
  wpm: 250,
  step: 25,
  orp: true,
  pauses: true,
  preview: true,
};

const KEY = 'flow.settings';

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export const clampWpm = (n: number) => Math.min(1500, Math.max(50, Math.round(n)));
