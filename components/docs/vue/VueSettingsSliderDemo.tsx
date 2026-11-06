'use client';

import { markRaw } from 'vue';
import { usePhoneViewport, usePreviewEmbed } from '../PreviewEmbed';
import { VueDemo } from './VueDemo';
import { FormScreen } from './FormScreen';
import { SettingsSliderFields } from './SettingsSliderFields';
import formStyles from '../FormRowsDemos.module.css';

export function VueSettingsSliderDemo() {
  const phonePreview = usePreviewEmbed() !== null;
  const phoneHost = usePhoneViewport() && !phonePreview;
  return <VueDemo
    template={`<component :is="FormScreen" title="Playback settings" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost">
      <component :is="SettingsSliderFields" v-model:value="preferences" />
    </component>`}
    stageClassName={`${formStyles.ScreenStage} flex justify-center py-10 w-full`}
    state={{ FormScreen: markRaw(FormScreen), SettingsSliderFields: markRaw(SettingsSliderFields), preferences: { sound: true, volume: 52, normalize: false } }}
    context={{ phonePreview, phoneHost }}
    controls={[
      { name: 'dialog', type: 'boolean', default: false },
      { name: 'surface', phoneOnly: true, type: 'select', default: 'grouped', options: [{ value: 'grouped', label: 'Grouped' }, { value: 'plain', label: 'Plain' }] },
    ]}
  />;
}
