'use client';

import type { ComponentProps } from 'react';
import { compact, toast } from '@plexui/vue/components/Toast';
import { VuePreview } from '../VuePreview';
import { VueDemo } from './VueDemo';
import { TOAST_LONG_DESCRIPTION, TOAST_MESSAGES } from '../toastMessages';

// A Vue template reads values from its setup scope, and MDX cannot pass functions to a client component: the
// Overview's button calls `show(...)` with the settings chosen, so `show` (with `toast`, `compact`, the messages and
// `saveProfile`) comes in through `state` here, as the page's code declares it in <script setup>.
const saveProfile = () =>
  new Promise<{ name: string }>((resolve) => {
    setTimeout(() => resolve({ name: 'Profile' }), 1500);
  });

type OverviewSettings = {
  type: keyof typeof TOAST_MESSAGES | 'promise';
  icon: boolean;
  description: 'none' | 'short' | 'long';
  action: 'none' | 'action' | 'cancel';
  closeButton: boolean;
  compact: boolean;
  persistent: boolean;
};

/** The Overview's toast, as content/vue/components/toast.mdx shows it: a promise ends as the default type's message */
const show = ({ type, icon, description, action, closeButton, compact: centered, persistent }: OverviewSettings) => {
  const message = TOAST_MESSAGES[type === 'promise' ? 'default' : type];
  const options = {
    description: description === 'none' ? undefined : description === 'short' ? message.description : TOAST_LONG_DESCRIPTION,
    action: action === 'none' ? undefined : { label: message.action, onClick: () => {} },
    cancel: action === 'cancel' ? { label: 'Cancel', onClick: () => {} } : undefined,
    closeButton,
    duration: persistent && (action !== 'none' || closeButton) ? Infinity : undefined,
    ...(centered ? compact : {}),
  };
  if (type === 'promise') {
    toast.promise(saveProfile(), { loading: 'Saving…', success: (data: { name: string }) => `${data.name} saved`, error: 'Save failed', ...options });
  } else {
    // The type's icon; null leaves it out (a promise keeps its loader)
    (type === 'default' ? toast : toast[type])(message.title, { ...options, icon: icon ? undefined : null });
  }
};

const scope = { show };

/** The page's one Vue `<Toaster />`, like the React page's `ToastDemosHost`. */
export function VueToastDemosHost() {
  return <div data-preview-support><VuePreview template="<Toaster />" /></div>;
}

/** A VueDemo whose template can call `toast`, laid out like the React toast demos. */
export function VueToastDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo stageClassName="flex-1 w-full py-12 flex flex-wrap items-center justify-center gap-3" {...props} state={{ ...scope, ...state }} />;
}
