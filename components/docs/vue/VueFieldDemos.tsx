'use client';

import type { ComponentProps } from 'react';
import { VueDemo } from './VueDemo';
import { VueFormScreenDemo } from './VueFormScreenDemo';
import { inputDemoScope } from './VueInputDemos';

// The Field examples read option lists and small helpers from their setup
// scope (a real app defines them in <script setup>). MDX cannot pass
// functions to a client component, so they come in through this wrapper.
// Data and logic are the React demos' (components/docs/FieldDemos.tsx).

const pad = (value: number) => String(value).padStart(2, '0');

/** Card expiry month and year (Form example) */
const months = Array.from({ length: 12 }, (_, index) => ({ label: pad(index + 1), value: pad(index + 1) }));
const years = Array.from({ length: 10 }, (_, index) => ({ label: String(2025 + index), value: String(2025 + index) }));

const birthdayMonthOptions = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((month, index) => ({ label: month, value: pad(index + 1) }));

const birthdayDayOptions = Array.from({ length: 31 }, (_, index) => ({ label: pad(index + 1), value: pad(index + 1) }));

const birthdayYearOptions = Array.from({ length: 2025 - 1920 + 1 }, (_, index) => {
  const year = String(2025 - index);
  return { label: year, value: year };
});

/** The digits of a segment input, at most `maxLength` */
const digitsOnly = (raw: string, maxLength: number) => raw.replace(/\D/g, '').slice(0, maxLength);

const languages = [{ label: 'English', value: 'en' }, { label: 'Spanish', value: 'es' }, { label: 'French', value: 'fr' }, { label: 'German', value: 'de' }, { label: 'Japanese', value: 'ja' }];
const themes = [{ label: 'System', value: 'system' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }];
const regions = [{ label: 'US East (N. Virginia)', value: 'us-east-1' }, { label: 'US West (Oregon)', value: 'us-west-2' }, { label: 'Europe (Frankfurt)', value: 'eu-central-1' }, { label: 'Asia Pacific (Tokyo)', value: 'ap-northeast-1' }];
const fieldTypes = [{ label: 'String', value: 'string' }, { label: 'Number', value: 'number' }, { label: 'Boolean', value: 'boolean' }, { label: 'Date', value: 'date' }, { label: 'JSON', value: 'json' }, { label: 'Rich text', value: 'richtext' }];
const expirations = [{ label: 'Never', value: 'never' }, { label: '30 days', value: '30d' }, { label: '90 days', value: '90d' }, { label: '1 year', value: '1y' }];

export const fieldDemoScope = {
  languages, themes, regions, fieldTypes, expirations,
  months,
  years,
  birthdayMonthOptions,
  birthdayDayOptions,
  birthdayYearOptions,
  digitsOnly,
  nextBirthday: inputDemoScope.nextBirthday,
  isValidBirthday: inputDemoScope.isValidBirthday,
};

/** A VueDemo whose template can also use the option lists and helpers above. */
export function VueFieldDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ ...fieldDemoScope, ...state }} />;
}

/** Responsive full-form examples, retaining desktop controls and native phone layout. */
export function VueFieldScreenDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueFormScreenDemo {...props} state={{ ...fieldDemoScope, ...state }} />;
}
