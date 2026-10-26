'use client';

import type { ComponentProps } from 'react';
import { compact, toast } from '@plexui/vue/components/Toast';
import { VuePreview } from '../VuePreview';
import { VueDemo } from './VueDemo';

// A Vue template reads values from its setup scope, and MDX cannot pass
// functions to a client component: the examples call `toast(...)` (and use
// `compact` and `saveProfile`), so they come in through `state` here. A real
// app imports them in <script setup>.
const saveProfile = () =>
  new Promise<{ name: string }>((resolve) => {
    setTimeout(() => resolve({ name: 'Profile' }), 1500);
  });

const scope = { toast, compact, saveProfile };

/** The page's one Vue `<Toaster />`, like the React page's `ToastDemosHost`. */
export function VueToastDemosHost() {
  return <VuePreview template="<Toaster />" />;
}

/** A VueDemo whose template can call `toast`, laid out like the React toast demos. */
export function VueToastDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return (
    <div data-demo-stage className="flex-1 w-full py-12 flex flex-wrap items-center justify-center gap-3">
      <VueDemo {...props} state={{ ...scope, ...state }} />
    </div>
  );
}
