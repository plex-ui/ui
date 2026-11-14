'use client';

import { markRaw } from 'vue';
import { usePhoneViewport, usePreviewEmbed } from '../PreviewEmbed';
import { VueDemo } from './VueDemo';
import { FormScreen } from './FormScreen';
import { LanguagesFields, QuickSettingsFields } from './SettingsOrderFields';
import { initialLanguages, initialQuickSettings } from '../settingsOrderData';
import { SettingsRegionFields } from './SettingsRegionFields';
import { initialRegion } from '../settingsRegionData';
import { AutofillFields, HapticsFields } from './SettingsAppsFields';
import { SharingFields } from './SettingsSharingFields';
import { initialSharing } from '../settingsSharingData';
import { initialAutofill } from '../settingsAppsData';
import formStyles from '../FormRowsDemos.module.css';

const controls = [
  { name: 'dialog', type: 'boolean', default: false },
  { name: 'surface', phoneOnly: true, type: 'select', default: 'grouped', options: [{ value: 'grouped', label: 'Grouped' }, { value: 'plain', label: 'Plain' }] },
] as const;

const handleControls = [
  ...controls,
  { name: 'handles', type: 'boolean', default: true },
  { name: 'handlePlacement', type: 'select', default: 'end', options: [{ value: 'start', label: 'start' }, { value: 'end', label: 'end' }] },
] as const;
const iconControls = (fallback: 'tile' | 'outline') => [
  ...controls,
  { name: 'iconStyle', type: 'select', default: fallback, options: [{ value: 'tile', label: 'tile' }, { value: 'outline', label: 'outline' }, { value: 'plain', label: 'plain' }] },
] as const;

function useHosts() {
  const phonePreview = usePreviewEmbed() !== null;
  return { phonePreview, phoneHost: usePhoneViewport() && !phonePreview };
}

export function VueSettingsQuickDemo() {
  return <VueDemo
    template={`<component :is="FormScreen" title="Quick Settings" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost">
      <component :is="QuickSettingsFields" v-model:value="settings" :handles="handles" :handle-placement="handlePlacement" />
    </component>`}
    stageClassName={`${formStyles.ScreenStage} flex justify-center py-10 w-full`}
    state={{ FormScreen: markRaw(FormScreen), QuickSettingsFields: markRaw(QuickSettingsFields), settings: initialQuickSettings.map((item) => ({ ...item })) }}
    context={useHosts()}
    controls={[...handleControls]}
  />;
}

export function VueSettingsLanguagesDemo() {
  return <VueDemo
    template={`<component :is="FormScreen" title="Language & Region" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost">
      <component :is="LanguagesFields" v-model:value="languages" :handles="handles" :handle-placement="handlePlacement" />
    </component>`}
    stageClassName={`${formStyles.ScreenStage} flex justify-center py-10 w-full`}
    state={{ FormScreen: markRaw(FormScreen), LanguagesFields: markRaw(LanguagesFields), languages: [...initialLanguages] }}
    context={useHosts()}
    controls={[...handleControls]}
  />;
}

export function VueSettingsRegionDemo() {
  return <VueDemo
    template={`<component :is="FormScreen" title="Language & Region" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost">
      <component :is="SettingsRegionFields" v-model:value="region" :phone-preview="phonePreview" :phone-host="phoneHost" />
    </component>`}
    stageClassName={`${formStyles.ScreenStage} flex justify-center py-10 w-full`}
    state={{ FormScreen: markRaw(FormScreen), SettingsRegionFields: markRaw(SettingsRegionFields), region: initialRegion }}
    context={useHosts()}
    controls={[...controls]}
  />;
}

export function VueSettingsAutofillDemo() {
  return <VueDemo
    template={`<component :is="FormScreen" title="AutoFill & Passwords" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost">
      <component :is="AutofillFields" v-model:value="autofill" :icon-style="iconStyle" />
    </component>`}
    stageClassName={`${formStyles.ScreenStage} flex justify-center py-10 w-full`}
    state={{ FormScreen: markRaw(FormScreen), AutofillFields: markRaw(AutofillFields), autofill: structuredClone(initialAutofill) }}
    context={useHosts()}
    controls={[...iconControls('tile')]}
  />;
}

export function VueSettingsHapticsDemo() {
  return <VueDemo
    template={`<component :is="FormScreen" title="Music Haptics" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost">
      <component :is="HapticsFields" v-model:value="haptics" :icon-style="iconStyle" />
    </component>`}
    stageClassName={`${formStyles.ScreenStage} flex justify-center py-10 w-full`}
    state={{ FormScreen: markRaw(FormScreen), HapticsFields: markRaw(HapticsFields), haptics: false }}
    context={useHosts()}
    controls={[...iconControls('outline')]}
  />;
}

export function VueSettingsSharingDemo() {
  return <VueDemo
    template={`<component :is="FormScreen" title="Nearby Sharing" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost">
      <component :is="SharingFields" v-model:value="sharing" />
    </component>`}
    stageClassName={`${formStyles.ScreenStage} flex justify-center py-10 w-full`}
    state={{ FormScreen: markRaw(FormScreen), SharingFields: markRaw(SharingFields), sharing: structuredClone(initialSharing) }}
    context={useHosts()}
    controls={[...controls]}
  />;
}
