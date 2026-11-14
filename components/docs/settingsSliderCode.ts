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
