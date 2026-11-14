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

export const settingsSharingReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { SharingFields } from './SettingsSharingFields';
import { initialSharing } from './settingsSharingData';

export function SharingSettings() {
  const [sharing, setSharing] = useState(initialSharing);
  return (
    <FormScreen title="Nearby Sharing" surface="grouped">
      <SharingFields value={sharing} onChange={setSharing} />
    </FormScreen>
  );
}`;

export const settingsSharingVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { SharingFields } from './SettingsSharingFields';
import { initialSharing } from './settingsSharingData';
const sharing = ref({ ...initialSharing });
</script>

<template>
  <FormScreen title="Nearby Sharing" surface="grouped">
    <SharingFields v-model:value="sharing" />
  </FormScreen>
</template>`;

export const settingsVpnReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { VpnFields } from './SettingsVpnFields';
import { initialVpn } from './settingsVpnData';

export function VpnSettings() {
  const [vpn, setVpn] = useState(initialVpn);
  return (
    <FormScreen title="VPN" surface="grouped">
      <VpnFields value={vpn} onChange={setVpn} />
    </FormScreen>
  );
}`;

export const settingsVpnVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { VpnFields } from './SettingsVpnFields';
import { initialVpn } from './settingsVpnData';
const vpn = ref({ ...initialVpn });
</script>

<template>
  <FormScreen title="VPN" surface="grouped">
    <VpnFields v-model:value="vpn" />
  </FormScreen>
</template>`;

export const settingsTvProviderReactCode = `import { FormScreen } from './FormRowsDemos';
import { TvProviderFields } from './SettingsVpnFields';

export function TvProviderSettings() {
  return (
    <FormScreen title="TV Provider" surface="grouped">
      <TvProviderFields />
    </FormScreen>
  );
}`;

export const settingsTvProviderVueCode = `<script setup lang="ts">
import { FormScreen } from './FormScreen';
import { TvProviderFields } from './SettingsVpnFields';
</script>

<template>
  <FormScreen title="TV Provider" surface="grouped">
    <TvProviderFields />
  </FormScreen>
</template>`;

export const settingsCaptionsReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { CaptionsFields } from './SettingsCaptionsFields';
import { initialCaptions } from './settingsCaptionsData';

export function CaptionsSettings() {
  const [captions, setCaptions] = useState(initialCaptions);
  return (
    <FormScreen title="Live Captions" surface="grouped">
      <CaptionsFields value={captions} onChange={setCaptions} />
    </FormScreen>
  );
}`;

export const settingsCaptionsVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { CaptionsFields } from './SettingsCaptionsFields';
import { initialCaptions } from './settingsCaptionsData';
const captions = ref({ ...initialCaptions });
</script>

<template>
  <FormScreen title="Live Captions" surface="grouped">
    <CaptionsFields v-model:value="captions" />
  </FormScreen>
</template>`;

export const settingsCaptionsAppearanceReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { CaptionsAppearanceFields } from './SettingsCaptionsFields';
import { initialAppearance } from './settingsCaptionsData';

export function CaptionsAppearanceSettings() {
  const [appearance, setAppearance] = useState(initialAppearance);
  return (
    <FormScreen title="Appearance" surface="grouped">
      <CaptionsAppearanceFields value={appearance} onChange={setAppearance} />
    </FormScreen>
  );
}`;

export const settingsCaptionsAppearanceVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { CaptionsAppearanceFields } from './SettingsCaptionsFields';
import { initialAppearance } from './settingsCaptionsData';
const appearance = ref({ ...initialAppearance });
</script>

<template>
  <FormScreen title="Appearance" surface="grouped">
    <CaptionsAppearanceFields v-model:value="appearance" />
  </FormScreen>
</template>`;

export const settingsAudioReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { AudioFields } from './SettingsAudioFields';
import { initialAudio } from './settingsAudioData';

export function AudioSettings() {
  const [audio, setAudio] = useState(initialAudio);
  return (
    <FormScreen title="Audio & Visual" surface="grouped">
      <AudioFields value={audio} onChange={setAudio} />
    </FormScreen>
  );
}`;

export const settingsAudioVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { AudioFields } from './SettingsAudioFields';
import { initialAudio } from './settingsAudioData';
const audio = ref({ ...initialAudio });
</script>

<template>
  <FormScreen title="Audio & Visual" surface="grouped">
    <AudioFields v-model:value="audio" />
  </FormScreen>
</template>`;

export const settingsHeadTrackingReactCode = `import { useState } from 'react';
import { FormScreen } from './FormRowsDemos';
import { HeadTrackingFields } from './SettingsAudioFields';
import { initialHeadTracking } from './settingsAudioData';

export function HeadTrackingSettings() {
  const [tracking, setTracking] = useState(initialHeadTracking);
  return (
    <FormScreen title="Head Tracking" surface="grouped">
      <HeadTrackingFields value={tracking} onChange={setTracking} />
    </FormScreen>
  );
}`;

export const settingsHeadTrackingVueCode = `<script setup lang="ts">
import { ref } from 'vue';
import { FormScreen } from './FormScreen';
import { HeadTrackingFields } from './SettingsAudioFields';
import { initialHeadTracking } from './settingsAudioData';
const tracking = ref(structuredClone(initialHeadTracking));
</script>

<template>
  <FormScreen title="Head Tracking" surface="grouped">
    <HeadTrackingFields v-model:value="tracking" />
  </FormScreen>
</template>`;
