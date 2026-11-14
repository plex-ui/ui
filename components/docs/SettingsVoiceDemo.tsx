'use client';

import { useState } from 'react';
import { controlsTableStyle } from './ButtonDemos';
import { FormScreen } from './FormRowsDemos';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';
import { SettingsVoiceFields } from './SettingsVoiceFields';
import { defaultVoicePreferences } from './settingsVoiceData';

export function SettingsVoiceDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(defaultVoicePreferences);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Voice" {...presentation} onDialogChange={presentation.setDialog}>
      <SettingsVoiceFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}
