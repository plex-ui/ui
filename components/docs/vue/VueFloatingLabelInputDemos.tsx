'use client';

import type { ComponentProps } from 'react';
import { VueDemo } from './VueDemo';
import { formExamplesScope } from './VueFormExamplesDemos';
import { inputDemoScope } from './VueInputDemos';

// The masked SSN and birthday examples, the selects and the phone input read
// helpers from their setup scope (a real app defines or imports them in
// <script setup>). MDX cannot pass functions or components to a client
// component, so they come in through this wrapper: the SSN and birthday mask
// helpers of the Input examples, and the form examples' BirthdayMaskedInput,
// FlagIcon, PhoneCountryTrigger and country helpers. The option lists are
// the React demos' (components/docs/FloatingLabelInputDemos.tsx).

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
  formatSSN: inputDemoScope.formatSSN,
  nextSSNDigits: inputDemoScope.nextSSNDigits,
  ssnMask: inputDemoScope.ssnMask,
  nextBirthday: inputDemoScope.nextBirthday,
  birthdayMask: inputDemoScope.birthdayMask,
  roleOptions,
  skillOptions,
};

/** A VueDemo whose template can also use the helpers and option lists above. */
export function VueFloatingLabelInputDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ ...floatingLabelInputDemoScope, ...state }} />;
}
