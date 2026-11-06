'use client';

import { useState } from 'react';
import { controlsTableStyle } from './ButtonDemos';
import { FormScreen } from './FormRowsDemos';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';
import { SettingsSliderFields } from './SettingsSliderFields';
import type { PlaybackPreferences } from './settingsSliderData';

export function SettingsSliderDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState<PlaybackPreferences>({ sound: true, volume: 52, normalize: false });
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Playback settings" {...presentation} onDialogChange={presentation.setDialog}>
      <SettingsSliderFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}
