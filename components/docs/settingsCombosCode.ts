// Code shown beside the combination screens of Forms: Settings (React and Vue). The helpers and sample data are
// SettingsCombos.tsx / vue/SettingsCombos.ts and settingsCombosData.ts.

export const settingsRowsReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { RowsCombos } from './SettingsCombos';
import { initialRows } from './settingsCombosData';

export function RowsScreen() {
  const [rows, setRows] = useState(initialRows);
  return (
    <FormScreen title="Rows" surface="grouped">
      <RowsCombos value={rows} onChange={setRows} />
    </FormScreen>
  );
}`;

export const settingsRowsVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { RowsCombos } from './SettingsCombos';
import { initialRows } from './settingsCombosData';
const rows = ref(structuredClone(initialRows));
</script>

<template>
  <FormScreen title="Rows" surface="grouped">
    <RowsCombos v-model:value="rows" />
  </FormScreen>
</template>`;

export const settingsSlidersReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { SliderCombos } from './SettingsCombos';
import { defaultSliders } from './settingsCombosData';

export function SlidersScreen() {
  const [sliders, setSliders] = useState(defaultSliders);
  return (
    <FormScreen title="Sliders" surface="grouped">
      <SliderCombos value={sliders} onChange={setSliders} />
    </FormScreen>
  );
}`;

export const settingsSlidersVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { SliderCombos } from './SettingsCombos';
import { defaultSliders } from './settingsCombosData';
const sliders = ref(structuredClone(defaultSliders));
</script>

<template>
  <FormScreen title="Sliders" surface="grouped">
    <SliderCombos v-model:value="sliders" />
  </FormScreen>
</template>`;

export const settingsChoiceReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { ChoiceCombos } from './SettingsCombos';
import { initialChoice } from './settingsCombosData';

export function ChoiceScreen() {
  const [choice, setChoice] = useState(initialChoice);
  return (
    <FormScreen title="Choice" surface="grouped">
      <ChoiceCombos value={choice} onChange={setChoice} />
    </FormScreen>
  );
}`;

export const settingsChoiceVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { ChoiceCombos } from './SettingsCombos';
import { initialChoice } from './settingsCombosData';
const choice = ref(structuredClone(initialChoice));
</script>

<template>
  <FormScreen title="Choice" surface="grouped">
    <ChoiceCombos v-model:value="choice" />
  </FormScreen>
</template>`;

export const settingsOrderReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { OrderCombos } from './SettingsCombos';
import { initialOrder } from './settingsCombosData';

export function OrderScreen() {
  const [order, setOrder] = useState(initialOrder);
  return (
    <FormScreen title="Order" surface="grouped">
      <OrderCombos value={order} onChange={setOrder} handles handlePlacement="end" />
    </FormScreen>
  );
}`;

export const settingsOrderVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { OrderCombos } from './SettingsCombos';
import { initialOrder } from './settingsCombosData';
const order = ref(structuredClone(initialOrder));
</script>

<template>
  <FormScreen title="Order" surface="grouped">
    <OrderCombos v-model:value="order" handles handle-placement="end" />
  </FormScreen>
</template>`;

export const settingsPicturesReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { PictureCombos } from './SettingsCombos';
import { initialPictures } from './settingsCombosData';

export function PicturesScreen() {
  const [pictures, setPictures] = useState(initialPictures);
  return (
    <FormScreen title="Pictures" surface="grouped">
      <PictureCombos value={pictures} onChange={setPictures} iconStyle="tile" />
    </FormScreen>
  );
}`;

export const settingsPicturesVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { PictureCombos } from './SettingsCombos';
import { initialPictures } from './settingsCombosData';
const pictures = ref(structuredClone(initialPictures));
</script>

<template>
  <FormScreen title="Pictures" surface="grouped">
    <PictureCombos v-model:value="pictures" icon-style="tile" />
  </FormScreen>
</template>`;

export const settingsFootersReactCode = `import { FormScreen } from './FormRowsDemos';
import { FooterCombos } from './SettingsCombos';

export function HeadersAndFootersScreen() {
  return (
    <FormScreen title="Headers and footers" surface="grouped">
      <FooterCombos />
    </FormScreen>
  );
}`;

export const settingsFootersVueCode = `<script setup lang="ts">
import { FormScreen } from './FormScreen';
import { FooterCombos } from './SettingsCombos';
</script>

<template>
  <FormScreen title="Headers and footers" surface="grouped">
    <FooterCombos />
  </FormScreen>
</template>`;

export const settingsRegionReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { SettingsRegionFields } from './SettingsRegionFields';
import { initialRegion } from './settingsRegionData';

export function RegionSettings() {
  const [region, setRegion] = useState(initialRegion);
  return (
    <FormScreen title="Language & Region" surface="grouped">
      <SettingsRegionFields value={region} onChange={setRegion} />
    </FormScreen>
  );
}`;

export const settingsRegionVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { SettingsRegionFields } from './SettingsRegionFields';
import { initialRegion } from './settingsRegionData';
const region = ref(initialRegion);
</script>

<template>
  <FormScreen title="Language & Region" surface="grouped">
    <SettingsRegionFields v-model:value="region" />
  </FormScreen>
</template>`;
