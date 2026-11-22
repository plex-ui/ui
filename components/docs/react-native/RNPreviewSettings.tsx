'use client';

import { useSyncExternalStore } from 'react';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';

export type RNPlatform = 'ios' | 'android';
export type RNScheme = 'light' | 'dark';

type Choice = { platform: RNPlatform; scheme: RNScheme };

const KEY = 'plex-rn-preview';
const DEFAULT: Choice = { platform: 'ios', scheme: 'light' };
let choice: Choice | null = null;
const listeners = new Set<() => void>();

/** The reader's last choice, remembered in this browser only; the defaults where storage is blocked. */
function read(): Choice {
  if (choice) return choice;
  choice = DEFAULT;
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<Choice> | null;
    choice = {
      platform: saved?.platform === 'android' ? 'android' : 'ios',
      scheme: saved?.scheme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    // Storage may be blocked: the defaults stand
  }
  return choice;
}

function change(next: Partial<Choice>) {
  choice = { ...read(), ...next };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(choice));
  } catch {
    // Not remembered, still applied
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The platform and scheme every React Native example draws: one switch above them sets all of a page's. The
 *  server and the first client render use the defaults, so hydration agrees; the saved choice follows. */
export function useRNPreviewSettings() {
  const { platform, scheme } = useSyncExternalStore(subscribe, read, () => DEFAULT);
  return {
    platform,
    scheme,
    setPlatform: (next: RNPlatform) => change({ platform: next }),
    setScheme: (next: RNScheme) => change({ scheme: next }),
  };
}

/** iOS / Android and Light / Dark for all the React Native examples of a page, in place of Desktop / Phone. */
export function RNPreviewControl() {
  const { platform, scheme, setPlatform, setScheme } = useRNPreviewSettings();
  return (
    <div className="flex items-center gap-2">
      <SegmentedControl<RNPlatform> value={platform} onChange={setPlatform} size="sm" pill aria-label="Platform of the examples">
        <SegmentedControl.Option value="ios">iOS</SegmentedControl.Option>
        <SegmentedControl.Option value="android">Android</SegmentedControl.Option>
      </SegmentedControl>
      <SegmentedControl<RNScheme> value={scheme} onChange={setScheme} size="sm" pill aria-label="Color scheme of the examples">
        <SegmentedControl.Option value="light">Light</SegmentedControl.Option>
        <SegmentedControl.Option value="dark">Dark</SegmentedControl.Option>
      </SegmentedControl>
    </div>
  );
}
