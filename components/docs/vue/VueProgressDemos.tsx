'use client';

import { useEffect, useMemo, useState } from 'react';
import { VuePreview } from '../VuePreview';

/*
 * Overview: like ProgressOverviewDemo, the bar starts at 13 and moves to 66
 * half a second after mount. VueDemo has no mount timer, so the value is
 * driven here; the code block shows the equivalent single-file component.
 */

export const vueProgressOverviewCode = `<script setup>
import { onMounted, onUnmounted, ref } from "vue"

const value = ref(13)
let timer
onMounted(() => {
  timer = setTimeout(() => (value.value = 66), 500)
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <Progress :value="value" />
</template>`;

const overviewTemplate = `<div style="width: 60%; min-width: 240px">
  <Progress :value="value" />
</div>`;

export function VueProgressOverviewDemo() {
  const [value, setValue] = useState(13);
  const props = useMemo(() => ({ value }), [value]);

  useEffect(() => {
    const timer = setTimeout(() => setValue(66), 500);
    return () => clearTimeout(timer);
  }, []);

  return <VuePreview template={overviewTemplate} props={props} />;
}
