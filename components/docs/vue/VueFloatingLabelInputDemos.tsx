'use client';

import type { ComponentProps } from 'react';
import { VueDemo } from './VueDemo';
import { formExamplesScope } from './VueFormExamplesDemos';
import { VuePhoneRowsDemo } from './VuePhoneRowsDemo';

// The selects and the phone input read helpers from their setup scope (a real
// app defines or imports them in <script setup>). MDX cannot pass functions or
// components to a client component, so they come in through this wrapper: the
// form examples' FlagIcon, PhoneCountryTrigger and country helpers. The option
// lists are the React demos' (components/docs/FloatingLabelInputDemos.tsx).

const roleOptions = [
  { value: 'designer', label: 'Designer' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'product-manager', label: 'Product Manager' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'sales', label: 'Sales' },
];

const skillOptions = [
  { value: 'figma', label: 'Figma' },
  { value: 'react', label: 'React' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'tailwind', label: 'Tailwind CSS' },
  { value: 'nodejs', label: 'Node.js' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'rust', label: 'Rust' },
];

export const floatingLabelInputDemoScope = {
  ...formExamplesScope,
  roleOptions,
  skillOptions,
};

/** A VueDemo whose template can also use the helpers and option lists above. */
export function VueFloatingLabelInputDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ ...floatingLabelInputDemoScope, ...state }} />;
}

/** The same scope for an example whose phone view is grouped rows. */
export function VueFloatingLabelInputRowsDemo({ state, ...props }: ComponentProps<typeof VuePhoneRowsDemo>) {
  return <VuePhoneRowsDemo {...props} state={{ ...floatingLabelInputDemoScope, ...state }} />;
}
