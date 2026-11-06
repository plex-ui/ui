export const imageAlbumReactCode = `'use client';

import { useState } from 'react';
// Copy ImageAlbumEditor and ImageAlbumDemo.module.css from the linked helper.
// Confirmation uses the application primary palette.
import { ImageAlbumEditor } from './ImageAlbumEditor';

export function NewAlbumExample() {
  const [dialog, setDialog] = useState(false);
  return <ImageAlbumEditor dialog={dialog} onDialogChange={setDialog} surface="grouped" />;
}`;

export const imageAlbumVueCode = `<script setup lang="ts">
import { ref } from 'vue';
// Copy ImageAlbumEditor and ImageAlbumDemo.module.css from the linked helper.
// Confirmation uses the application primary palette.
import { ImageAlbumEditor } from './ImageAlbumEditor';

const dialog = ref(false);
</script>

<template>
  <ImageAlbumEditor v-model:dialog="dialog" surface="grouped" />
</template>`;
