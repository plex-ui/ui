'use client';

import { useState } from 'react';
import { controlsTableStyle } from './ButtonDemos';
import { FormScreen } from './FormRowsDemos';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';
import { LanguagesFields, QuickSettingsFields } from './SettingsOrderFields';
import { initialLanguages, initialQuickSettings } from './settingsOrderData';

export function SettingsQuickDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialQuickSettings);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Quick Settings" {...presentation} onDialogChange={presentation.setDialog}>
      <QuickSettingsFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}

export function SettingsLanguagesDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialLanguages);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Language & Region" {...presentation} onDialogChange={presentation.setDialog}>
      <LanguagesFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}
