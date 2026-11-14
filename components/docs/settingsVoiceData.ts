export type VoicePreferences = {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  timbre: number;
  pause: number;
};

export const defaultVoicePreferences: VoicePreferences = { voice: 'samantha', rate: 50, pitch: 50, volume: 80, timbre: 100, pause: 1 };

export const voiceOptions = [
  { value: 'samantha', label: 'Samantha' },
  { value: 'daniel', label: 'Daniel' },
  { value: 'karen', label: 'Karen' },
  { value: 'moira', label: 'Moira' },
];

/** A slider group of the screen: its title, the default the accent row brings back, and the words at its ends */
export const voiceSliders = [
  { key: 'rate', title: 'Rate', reset: 'Use Default Rate', start: 'Slow', end: 'Fast' },
  { key: 'pitch', title: 'Pitch', reset: 'Use Default Pitch', start: 'Low', end: 'High' },
  { key: 'volume', title: 'Speech Volume', reset: 'Use Default Volume' },
] as const;

export const pauseText = (seconds: number) => (seconds === 1 ? '1 second' : `${seconds} seconds`);
