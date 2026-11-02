'use client';

import type { ComponentProps } from 'react';
import { markRaw } from 'vue';
import { TableBody } from '@plexui/vue/components/Table';
import { VueDemo } from './VueDemo';

// `:as="TableBody"` reads the component from the setup scope. MDX cannot pass a
// component to a client component, so it comes in through this wrapper.

export function VueSortableTableDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ TableBody: markRaw(TableBody), ...state }} />;
}
