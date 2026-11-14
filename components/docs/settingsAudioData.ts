/** Audio settings, as Settings › Accessibility › Audio & Visual lays them out (IMG_5966, IMG_5962). */
export type AudioSettings = { accommodations: string; background: string; mono: boolean; balance: number };

export const offOnOptions = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
];

export const initialAudio: AudioSettings = { accommodations: 'off', background: 'off', mono: false, balance: 0 };

/** The balance between the channels, -1 (left) to 1 (right), as Settings writes it: 0.00 in the middle. */
export const balanceText = (value: number) => value.toFixed(2);

/** Head tracking, as Settings › Accessibility › Head Tracking lays it out (IMG_5965). */
export type HeadTrackingSettings = { on: boolean; actions: Record<string, string>; mode: string; speed: number };

export const faceActions = ['Raise Eyebrows', 'Open Mouth', 'Smile', 'Stick Out Tongue', 'Eye Blink'];

export const actionOptions = [
  { value: 'none', label: 'None' },
  { value: 'tap', label: 'Tap' },
  { value: 'home', label: 'Home' },
  { value: 'scroll', label: 'Scroll' },
];

export const trackingModes = [
  { value: 'head', label: 'Relative to Head' },
  { value: 'face', label: 'Relative to Face' },
];

export const initialHeadTracking: HeadTrackingSettings = {
  on: false, actions: Object.fromEntries(faceActions.map((name) => [name, 'none'])), mode: 'head', speed: 50,
};
