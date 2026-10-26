'use client';

import type { ComponentProps } from 'react';
import { VueDemo } from './VueDemo';

// A Vue template reads values from its setup scope, and MDX cannot pass
// functions to a client component. The controller example calls
// `submitPrompt()`, a stand-in for an async request that resolves after two
// seconds (the React demo fakes the same loading state with a timeout). A
// real app defines it in <script setup>.
const submitPrompt = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 2000);
  });

const scope = { submitPrompt };

/** A VueDemo whose template can call `submitPrompt()`. */
export function VuePopoverDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ ...scope, ...state }} />;
}
