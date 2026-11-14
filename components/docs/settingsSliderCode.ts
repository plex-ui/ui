export const settingsSliderReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { SettingsSliderFields } from './SettingsSliderFields';

export function PlaybackSettings() {
  const [preferences, setPreferences] = useState({ sound: true, volume: 52, normalize: false });
  return (
    <FormScreen title="Playback settings" surface="grouped">
      <SettingsSliderFields value={preferences} onChange={setPreferences} />
    </FormScreen>
  );
}`;

export const settingsSliderVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { SettingsSliderFields } from './SettingsSliderFields';
const preferences = ref({ sound: true, volume: 52, normalize: false });
</script>

<template>
  <FormScreen title="Playback settings" surface="grouped">
    <SettingsSliderFields v-model:value="preferences" />
  </FormScreen>
</template>`;

export const settingsVoiceReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { SettingsVoiceFields } from './SettingsVoiceFields';
import { defaultVoicePreferences } from './settingsVoiceData';

export function VoiceSettings() {
  const [preferences, setPreferences] = useState(defaultVoicePreferences);
  return (
    <FormScreen title="Voice" surface="grouped">
      <SettingsVoiceFields value={preferences} onChange={setPreferences} />
    </FormScreen>
  );
}`;

export const settingsVoiceVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { SettingsVoiceFields } from './SettingsVoiceFields';
import { defaultVoicePreferences } from './settingsVoiceData';
const preferences = ref({ ...defaultVoicePreferences });
</script>

<template>
  <FormScreen title="Voice" surface="grouped">
    <SettingsVoiceFields v-model:value="preferences" />
  </FormScreen>
</template>`;

export const settingsQuickReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { QuickSettingsFields } from './SettingsOrderFields';
import { initialQuickSettings } from './settingsOrderData';

export function QuickSettings() {
  const [settings, setSettings] = useState(initialQuickSettings);
  return (
    <FormScreen title="Quick Settings" surface="grouped">
      <QuickSettingsFields value={settings} onChange={setSettings} />
    </FormScreen>
  );
}`;

export const settingsQuickVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { QuickSettingsFields } from './SettingsOrderFields';
import { initialQuickSettings } from './settingsOrderData';
const settings = ref(initialQuickSettings.map((item) => ({ ...item })));
</script>

<template>
  <FormScreen title="Quick Settings" surface="grouped">
    <QuickSettingsFields v-model:value="settings" />
  </FormScreen>
</template>`;

export const settingsLanguagesReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { LanguagesFields } from './SettingsOrderFields';
import { initialLanguages } from './settingsOrderData';

export function LanguageSettings() {
  const [languages, setLanguages] = useState(initialLanguages);
  return (
    <FormScreen title="Language & Region" surface="grouped">
      <LanguagesFields value={languages} onChange={setLanguages} />
    </FormScreen>
  );
}`;

export const settingsLanguagesVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { LanguagesFields } from './SettingsOrderFields';
import { initialLanguages } from './settingsOrderData';
const languages = ref([...initialLanguages]);
</script>

<template>
  <FormScreen title="Language & Region" surface="grouped">
    <LanguagesFields v-model:value="languages" />
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

export const settingsAutofillReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { AutofillFields } from './SettingsAppsFields';
import { initialAutofill } from './settingsAppsData';

export function AutofillSettings() {
  const [settings, setSettings] = useState(initialAutofill);
  return (
    <FormScreen title="AutoFill & Passwords" surface="grouped">
      <AutofillFields value={settings} onChange={setSettings} />
    </FormScreen>
  );
}`;

export const settingsAutofillVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { AutofillFields } from './SettingsAppsFields';
import { initialAutofill } from './settingsAppsData';
const settings = ref(structuredClone(initialAutofill));
</script>

<template>
  <FormScreen title="AutoFill & Passwords" surface="grouped">
    <AutofillFields v-model:value="settings" />
  </FormScreen>
</template>`;

export const settingsHapticsReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { HapticsFields } from './SettingsAppsFields';

export function HapticsSettings() {
  const [haptics, setHaptics] = useState(false);
  return (
    <FormScreen title="Music Haptics" surface="grouped">
      <HapticsFields value={haptics} onChange={setHaptics} />
    </FormScreen>
  );
}`;

export const settingsHapticsVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { HapticsFields } from './SettingsAppsFields';
const haptics = ref(false);
</script>

<template>
  <FormScreen title="Music Haptics" surface="grouped">
    <HapticsFields v-model:value="haptics" />
  </FormScreen>
</template>`;
