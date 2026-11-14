/** Live captions, as Settings › Accessibility › Live Captions lays them out (IMG_5960) and its Appearance page
 * (IMG_5961). */
export type CaptionsSettings = { on: boolean; keep: string; language: string };

export const keepOptions = [
  { value: '30s', label: '30 Seconds' },
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: 'always', label: 'Always' },
];

export const languageOptions = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-US', label: 'Spanish (US)' },
  { value: 'fr-FR', label: 'French (FR)' },
];

export const initialCaptions: CaptionsSettings = { on: false, keep: '1m', language: 'es-US' };

export const captionsNote = 'Your phone uses on-device intelligence to display captions across all apps. Accuracy of Live Captions may vary and should not be relied upon in high-risk or emergency situations.';
export const captionsGestures = ['Swipe left or right to hide', 'Double-tap to expand to fullscreen or collapse to compact mode'];

export type CaptionsAppearance = { bold: string; size: string; font: string; text: string | null; background: string | null; opacity: number };

export const boldOptions = [
  { value: 'default', label: 'Default' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

export const sizeOptions = [
  { value: 'default', label: 'Default' },
  { value: 'small', label: 'Small' },
  { value: 'large', label: 'Large' },
];

export const fontOptions = [
  { value: 'regular', label: 'System Font Regular' },
  { value: 'rounded', label: 'System Font Rounded' },
  { value: 'mono', label: 'Monospaced' },
];

export const initialAppearance: CaptionsAppearance = { bold: 'default', size: 'default', font: 'regular', text: null, background: null, opacity: 50 };
