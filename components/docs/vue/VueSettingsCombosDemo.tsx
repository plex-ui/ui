'use client';

import { markRaw } from 'vue';
import { usePhoneViewport, usePreviewEmbed } from '../PreviewEmbed';
import { VueDemo } from './VueDemo';
import { FormScreen } from './FormScreen';
import { ChoiceCombos, FooterCombos, OrderCombos, PictureCombos, RowsCombos, SliderCombos } from './SettingsCombos';
import { defaultSliders, initialChoice, initialOrder, initialPictures, initialRows } from '../settingsCombosData';
import { SettingsRegionFields } from './SettingsRegionFields';
import { initialRegion } from '../settingsRegionData';
import formStyles from '../FormRowsDemos.module.css';

// Vue twins of SettingsCombosDemo.tsx: one screen per kind of row, values owned by the screen.

const controls = [
  { name: 'dialog', type: 'boolean', default: false },
  { name: 'surface', phoneOnly: true, type: 'select', default: 'grouped', options: [{ value: 'grouped', label: 'Grouped' }, { value: 'plain', label: 'Plain' }] },
] as const;
const handleControls = [
  ...controls,
  { name: 'handles', type: 'boolean', default: true },
  { name: 'handlePlacement', type: 'select', default: 'end', options: [{ value: 'start', label: 'start' }, { value: 'end', label: 'end' }] },
] as const;
const iconControls = [
  ...controls,
  { name: 'iconStyle', type: 'select', default: 'tile', options: [{ value: 'tile', label: 'tile' }, { value: 'outline', label: 'outline' }, { value: 'plain', label: 'plain' }] },
] as const;

function useHosts() {
  const phonePreview = usePreviewEmbed() !== null;
  return { phonePreview, phoneHost: usePhoneViewport() && !phonePreview };
}

const screen = (title: string, body: string) =>
  `<component :is="FormScreen" title="${title}" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost">
      ${body}
    </component>`;
const stageClassName = `${formStyles.ScreenStage} flex justify-center py-10 w-full`;

export function VueSettingsRowsDemo() {
  return <VueDemo template={screen('Rows', '<component :is="RowsCombos" v-model:value="rows" />')} stageClassName={stageClassName}
    state={{ FormScreen: markRaw(FormScreen), RowsCombos: markRaw(RowsCombos), rows: { ...initialRows } }} context={useHosts()} controls={[...controls]} />;
}

export function VueSettingsSlidersDemo() {
  return <VueDemo template={screen('Sliders', '<component :is="SliderCombos" v-model:value="sliders" />')} stageClassName={stageClassName}
    state={{ FormScreen: markRaw(FormScreen), SliderCombos: markRaw(SliderCombos), sliders: { ...defaultSliders } }} context={useHosts()} controls={[...controls]} />;
}

export function VueSettingsChoiceDemo() {
  return <VueDemo template={screen('Choice', '<component :is="ChoiceCombos" v-model:value="choice" />')} stageClassName={stageClassName}
    state={{ FormScreen: markRaw(FormScreen), ChoiceCombos: markRaw(ChoiceCombos), choice: { ...initialChoice } }} context={useHosts()} controls={[...controls]} />;
}

export function VueSettingsOrderDemo() {
  return <VueDemo template={screen('Order', '<component :is="OrderCombos" v-model:value="order" :handles="handles" :handle-placement="handlePlacement" />')} stageClassName={stageClassName}
    state={{ FormScreen: markRaw(FormScreen), OrderCombos: markRaw(OrderCombos), order: structuredClone(initialOrder) }} context={useHosts()} controls={[...handleControls]} />;
}

export function VueSettingsPicturesDemo() {
  return <VueDemo template={screen('Pictures', '<component :is="PictureCombos" v-model:value="pictures" :icon-style="iconStyle" />')} stageClassName={stageClassName}
    state={{ FormScreen: markRaw(FormScreen), PictureCombos: markRaw(PictureCombos), pictures: { ...initialPictures } }} context={useHosts()} controls={[...iconControls]} />;
}

export function VueSettingsFootersDemo() {
  return <VueDemo template={screen('Headers and footers', '<component :is="FooterCombos" />')} stageClassName={stageClassName}
    state={{ FormScreen: markRaw(FormScreen), FooterCombos: markRaw(FooterCombos) }} context={useHosts()} controls={[...controls]} />;
}

export function VueSettingsRegionDemo() {
  return <VueDemo template={screen('Language &amp; Region', '<component :is="SettingsRegionFields" v-model:value="region" :phone-preview="phonePreview" :phone-host="phoneHost" />')} stageClassName={stageClassName}
    state={{ FormScreen: markRaw(FormScreen), SettingsRegionFields: markRaw(SettingsRegionFields), region: initialRegion }} context={useHosts()} controls={[...controls]} />;
}
