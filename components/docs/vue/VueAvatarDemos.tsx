'use client';

import type { ComponentProps } from 'react';
import { Robot } from '@plexui/vue/components/Icon';
import { VueDemo } from './VueDemo';

// A Vue template reads values from its setup scope. Registered components are
// tags, not values, so `:Icon="Robot"` needs `Robot` in scope (a real app
// imports it in <script setup>), and MDX cannot pass functions to a client
// component. `saySup` is the no-op click handler of the React examples.
const scope = { Robot, saySup: () => {} };

/** A VueDemo whose template can also use `Robot` and `saySup`. */
export function VueAvatarDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ ...scope, ...state }} />;
}
