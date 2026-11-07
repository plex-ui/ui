'use client';

import { useEffect, useMemo, useState } from 'react';
import { VuePreview } from '../VuePreview';
import { usePhoneRows } from '../PhoneRows';

/*
 * Overview: like ProgressOverviewDemo, the bar starts at 13 and moves to 66
 * half a second after mount. VueDemo has no mount timer, so the value is
 * driven here; the code block shows the equivalent single-file component.
 */

export const vueProgressOverviewCode = `<script setup>
import { onMounted, onUnmounted, ref } from "vue"
import { Progress } from "@plexui/vue/components/Progress"

const value = ref(13)
let timer
onMounted(() => {
  timer = setTimeout(() => (value.value = 66), 500)
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <Progress :value="value" aria-label="Loading" />
</template>`;

const overviewTemplate = `<div style="width: 60%; min-width: 240px">
  <Progress :value="value" aria-label="Loading" />
</div>`;
/** On a phone the bar spans the screen between its margins, as in the React example */
const overviewPhoneTemplate = overviewTemplate.replace('style="width: 60%; min-width: 240px"', 'class="w-full"');

export function VueProgressOverviewDemo() {
  const [value, setValue] = useState(13);
  const props = useMemo(() => ({ value }), [value]);
  const phone = usePhoneRows();

  useEffect(() => {
    const timer = setTimeout(() => setValue(66), 500);
    return () => clearTimeout(timer);
  }, []);

  return <VuePreview template={phone ? overviewPhoneTemplate : overviewTemplate} props={props} />;
}
