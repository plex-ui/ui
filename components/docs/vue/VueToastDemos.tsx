'use client';

import type { ComponentProps } from 'react';
import { compact, toast } from '@plexui/vue/components/Toast';
import { VuePreview } from '../VuePreview';
import { VueDemo } from './VueDemo';
import { TOAST_LONG_DESCRIPTION, TOAST_MESSAGES } from '../toastMessages';

// A Vue template reads values from its setup scope, and MDX cannot pass
// functions to a client component: the examples call `toast(...)` (and use
// `compact`, as `compactOptions` beside the Overview's `compact` control, the
// Overview's messages and `saveProfile`), so they come in through `state`
// here. A real app imports them in <script setup>.
const saveProfile = () =>
  new Promise<{ name: string }>((resolve) => {
    setTimeout(() => resolve({ name: 'Profile' }), 1500);
  });

const scope = { toast, compactOptions: compact, messages: TOAST_MESSAGES, longDescription: TOAST_LONG_DESCRIPTION, saveProfile };

/** The page's one Vue `<Toaster />`, like the React page's `ToastDemosHost`. */
export function VueToastDemosHost() {
  return <div data-preview-support><VuePreview template="<Toaster />" /></div>;
}

/** A VueDemo whose template can call `toast`, laid out like the React toast demos. */
export function VueToastDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo stageClassName="flex-1 w-full py-12 flex flex-wrap items-center justify-center gap-3" {...props} state={{ ...scope, ...state }} />;
}
