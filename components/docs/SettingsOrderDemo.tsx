'use client';

import { useState } from 'react';
import { controlsTableStyle, DemoControlBoolean, DemoControlSelect } from './ButtonDemos';
import { FormScreen } from './FormRowsDemos';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';
import { LanguagesFields, QuickSettingsFields } from './SettingsOrderFields';
import { initialLanguages, initialQuickSettings } from './settingsOrderData';
import { SettingsRegionFields } from './SettingsRegionFields';
import { initialRegion } from './settingsRegionData';
import { AutofillFields, HapticsFields, type IconStyle } from './SettingsAppsFields';
import { initialAutofill } from './settingsAppsData';
import { SharingFields } from './SettingsSharingFields';
import { initialSharing } from './settingsSharingData';
import { TvProviderFields, VpnFields } from './SettingsVpnFields';
import { initialVpn } from './settingsVpnData';
import { CaptionsAppearanceFields, CaptionsFields } from './SettingsCaptionsFields';
import { initialAppearance, initialCaptions } from './settingsCaptionsData';
import { AudioFields, HeadTrackingFields } from './SettingsAudioFields';
import { initialAudio, initialHeadTracking } from './settingsAudioData';

export function SettingsQuickDemo() {
  const presentation = useScreenPresentation();
  const [handles, setHandles] = useState(true);
  const [placement, setPlacement] = useState<'start' | 'end'>('end');
  const [value, setValue] = useState(initialQuickSettings);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} />
      <DemoControlBoolean name="handles" value={handles} onChange={setHandles} />
      <DemoControlSelect name="handlePlacement" options={['start', 'end'] as const} value={placement} onChange={setPlacement} />
    </div>
    <FormScreen title="Quick Settings" {...presentation} onDialogChange={presentation.setDialog}>
      <QuickSettingsFields value={value} onChange={setValue} handles={handles} handlePlacement={placement} />
    </FormScreen>
  </>;
}

export function SettingsLanguagesDemo() {
  const presentation = useScreenPresentation();
  const [handles, setHandles] = useState(true);
  const [placement, setPlacement] = useState<'start' | 'end'>('end');
  const [value, setValue] = useState(initialLanguages);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} />
      <DemoControlBoolean name="handles" value={handles} onChange={setHandles} />
      <DemoControlSelect name="handlePlacement" options={['start', 'end'] as const} value={placement} onChange={setPlacement} />
    </div>
    <FormScreen title="Language & Region" {...presentation} onDialogChange={presentation.setDialog}>
      <LanguagesFields value={value} onChange={setValue} handles={handles} handlePlacement={placement} />
    </FormScreen>
  </>;
}

export function SettingsRegionDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialRegion);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Language & Region" {...presentation} onDialogChange={presentation.setDialog}>
      <SettingsRegionFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}

export function SettingsAutofillDemo() {
  const presentation = useScreenPresentation();
  const [iconStyle, setIconStyle] = useState<IconStyle>('tile');
  const [value, setValue] = useState(initialAutofill);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} />
      <DemoControlSelect name="iconStyle" options={['tile', 'outline', 'plain'] as const} value={iconStyle} onChange={setIconStyle} />
    </div>
    <FormScreen title="AutoFill & Passwords" {...presentation} onDialogChange={presentation.setDialog}>
      <AutofillFields value={value} onChange={setValue} iconStyle={iconStyle} />
    </FormScreen>
  </>;
}

export function SettingsHapticsDemo() {
  const presentation = useScreenPresentation();
  const [iconStyle, setIconStyle] = useState<IconStyle>('outline');
  const [value, setValue] = useState(false);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} />
      <DemoControlSelect name="iconStyle" options={['tile', 'outline', 'plain'] as const} value={iconStyle} onChange={setIconStyle} />
    </div>
    <FormScreen title="Music Haptics" {...presentation} onDialogChange={presentation.setDialog}>
      <HapticsFields value={value} onChange={setValue} iconStyle={iconStyle} />
    </FormScreen>
  </>;
}

export function SettingsSharingDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialSharing);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Nearby Sharing" {...presentation} onDialogChange={presentation.setDialog}>
      <SharingFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}

export function SettingsVpnDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialVpn);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="VPN" {...presentation} onDialogChange={presentation.setDialog}>
      <VpnFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}

export function SettingsTvProviderDemo() {
  const presentation = useScreenPresentation();
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="TV Provider" {...presentation} onDialogChange={presentation.setDialog}>
      <TvProviderFields />
    </FormScreen>
  </>;
}

export function SettingsCaptionsDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialCaptions);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Live Captions" {...presentation} onDialogChange={presentation.setDialog}>
      <CaptionsFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}

export function SettingsCaptionsAppearanceDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialAppearance);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Appearance" {...presentation} onDialogChange={presentation.setDialog}>
      <CaptionsAppearanceFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}

export function SettingsAudioDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialAudio);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Audio & Visual" {...presentation} onDialogChange={presentation.setDialog}>
      <AudioFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}

export function SettingsHeadTrackingDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialHeadTracking);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Head Tracking" {...presentation} onDialogChange={presentation.setDialog}>
      <HeadTrackingFields value={value} onChange={setValue} />
    </FormScreen>
  </>;
}
