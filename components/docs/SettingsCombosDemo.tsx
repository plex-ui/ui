'use client';

import { useState } from 'react';
import { controlsTableStyle, DemoControlBoolean, DemoControlSelect } from './ButtonDemos';
import { FormScreen } from './FormRowsDemos';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';
import { ChoiceCombos, FooterCombos, OrderCombos, PictureCombos, RowsCombos, SliderCombos, type IconStyle } from './SettingsCombos';
import { defaultSliders, initialChoice, initialOrder, initialPictures, initialRows } from './settingsCombosData';
import { SettingsRegionFields } from './SettingsRegionFields';
import { initialRegion } from './settingsRegionData';

export function SettingsRowsDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialRows);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Rows" {...presentation} onDialogChange={presentation.setDialog}>
      <RowsCombos value={value} onChange={setValue} />
    </FormScreen>
  </>;
}

export function SettingsSlidersDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(defaultSliders);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Sliders" {...presentation} onDialogChange={presentation.setDialog}>
      <SliderCombos value={value} onChange={setValue} />
    </FormScreen>
  </>;
}

export function SettingsChoiceDemo() {
  const presentation = useScreenPresentation();
  const [value, setValue] = useState(initialChoice);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Choice" {...presentation} onDialogChange={presentation.setDialog}>
      <ChoiceCombos value={value} onChange={setValue} />
    </FormScreen>
  </>;
}

export function SettingsOrderDemo() {
  const presentation = useScreenPresentation();
  const [handles, setHandles] = useState(true);
  const [placement, setPlacement] = useState<'start' | 'end'>('end');
  const [value, setValue] = useState(initialOrder);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} />
      <DemoControlBoolean name="handles" value={handles} onChange={setHandles} />
      <DemoControlSelect name="handlePlacement" options={['start', 'end'] as const} value={placement} onChange={setPlacement} />
    </div>
    <FormScreen title="Order" {...presentation} onDialogChange={presentation.setDialog}>
      <OrderCombos value={value} onChange={setValue} handles={handles} handlePlacement={placement} />
    </FormScreen>
  </>;
}

export function SettingsPicturesDemo() {
  const presentation = useScreenPresentation();
  const [iconStyle, setIconStyle] = useState<IconStyle>('tile');
  const [value, setValue] = useState(initialPictures);
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} />
      <DemoControlSelect name="iconStyle" options={['tile', 'outline', 'plain'] as const} value={iconStyle} onChange={setIconStyle} />
    </div>
    <FormScreen title="Pictures" {...presentation} onDialogChange={presentation.setDialog}>
      <PictureCombos value={value} onChange={setValue} iconStyle={iconStyle} />
    </FormScreen>
  </>;
}

export function SettingsFootersDemo() {
  const presentation = useScreenPresentation();
  return <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Headers and footers" {...presentation} onDialogChange={presentation.setDialog}>
      <FooterCombos />
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
