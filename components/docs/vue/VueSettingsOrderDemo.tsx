'use client';

import { markRaw } from 'vue';
import { usePhoneViewport, usePreviewEmbed } from '../PreviewEmbed';
import { VueDemo } from './VueDemo';
import { FormScreen } from './FormScreen';
import { LanguagesFields, QuickSettingsFields } from './SettingsOrderFields';
import { initialLanguages, initialQuickSettings } from '../settingsOrderData';
import formStyles from '../FormRowsDemos.module.css';

const controls = [
  { name: 'dialog', type: 'boolean', default: false },
  { name: 'surface', phoneOnly: true, type: 'select', default: 'grouped', options: [{ value: 'grouped', label: 'Grouped' }, { value: 'plain', label: 'Plain' }] },
] as const;

function useHosts() {
  const phonePreview = usePreviewEmbed() !== null;
  return { phonePreview, phoneHost: usePhoneViewport() && !phonePreview };
}

export function VueSettingsQuickDemo() {
  return <VueDemo
    template={`<component :is="FormScreen" title="Quick Settings" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost">
      <component :is="QuickSettingsFields" v-model:value="settings" />
    </component>`}
    stageClassName={`${formStyles.ScreenStage} flex justify-center py-10 w-full`}
    state={{ FormScreen: markRaw(FormScreen), QuickSettingsFields: markRaw(QuickSettingsFields), settings: initialQuickSettings.map((item) => ({ ...item })) }}
    context={useHosts()}
    controls={[...controls]}
  />;
}

export function VueSettingsLanguagesDemo() {
  return <VueDemo
    template={`<component :is="FormScreen" title="Language & Region" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost">
      <component :is="LanguagesFields" v-model:value="languages" />
    </component>`}
    stageClassName={`${formStyles.ScreenStage} flex justify-center py-10 w-full`}
    state={{ FormScreen: markRaw(FormScreen), LanguagesFields: markRaw(LanguagesFields), languages: [...initialLanguages] }}
    context={useHosts()}
    controls={[...controls]}
  />;
}
