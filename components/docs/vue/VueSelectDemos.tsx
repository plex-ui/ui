'use client';

import type { ComponentProps } from 'react';
import { h, type FunctionalComponent } from 'vue';
import {
  Cabinet,
  CalendarAlt,
  Plus,
  Tools,
  User,
  UserLock,
  Workspace,
} from '@plexui/vue/components/Icon';
import {
  COUNTRIES,
  COUNTRY_LOOKUP,
  COUNTRY_OPTIONS,
  COUNTRY_OPTION_CLASS,
  COUNTRY_OPTION_STYLE,
  countrySearchPredicate,
  formatPhoneNumber,
  stripFormatting,
} from '../PhoneInputDemos';
import { VueDemo } from './VueDemo';

// A Vue template reads values from its setup scope, and MDX cannot pass
// functions or VNodes to a client component. The Select and SelectControl
// examples use these the way a real app defines them in <script setup>:
// icons passed as props (`:StartIcon="CalendarAlt"`), option lists, the
// role descriptions (an option's `description` takes a string, a VNode or a
// render function) and the country helpers of the React demos
// (components/docs/SelectDemos.tsx, PhoneInputDemos.tsx).

const fruitsOptions = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blueberry', value: 'blueberry' },
  { label: 'Grapes', value: 'grapes' },
  { label: 'Mango', value: 'mango' },
  { label: 'Pineapple', value: 'pineapple' },
  { label: 'Watermelon', value: 'watermelon' },
];

const items = [
  { label: 'List item 1', value: '1' },
  { label: 'List item 2', value: '2' },
  { label: 'List item 3', value: '3', disabled: true },
  { label: 'List item 4', value: '4' },
  { label: 'List item 5', value: '5' },
  { label: 'List item 6', value: '6' },
  { label: 'List item 7', value: '7' },
  { label: 'List item 8', value: '8' },
];

const groupedItems = [
  {
    label: 'Plans',
    options: [
      {
        label: 'Enterprise Plus',
        value: '1',
        tooltip: { content: 'Advanced features with priority support and SLA', maxWidth: 248 },
      },
      {
        label: 'Enterprise',
        value: '1o',
        tooltip: { content: 'Full-featured plan for large organizations', maxWidth: 248 },
      },
      { label: 'Professional Plus', value: '2' },
      { label: 'Professional', value: '3' },
      { label: 'Basic Plus', value: '4' },
      { label: 'Basic', value: '5' },
      { label: 'Starter', value: '6' },
      { label: 'Free', value: '7' },
      { label: 'Team Advanced', value: '4a' },
      { label: 'Team Standard', value: '4b' },
      { label: 'Team Basic', value: '4c' },
      { label: 'Business Premium', value: '4d' },
      { label: 'Business Standard', value: '4e' },
      { label: 'Business Lite', value: '4f' },
      { label: 'Individual Pro', value: '4g' },
      { label: 'Individual', value: '4h' },
      { label: 'Premium Legacy', value: '4omega' },
      { label: 'Standard Legacy', value: '4ultra' },
    ],
    optionsLimit: { limit: 7, label: 'Show all' },
  },
  {
    label: 'Custom Deployments',
    options: [
      { label: 'Production US-East (v2.4.1)', value: 'ft1' },
      { label: 'Production EU-West (v2.4.0)', value: 'ft2' },
      { label: 'Staging US-West (v2.5.0-rc1)', value: 'ft3' },
      { label: 'Development (latest)', value: 'ft4' },
      { label: 'QA Environment (v2.4.1)', value: 'ft5' },
    ],
    optionsLimit: { limit: 100, label: 'Show all' },
  },
];

const roleDescription = (text: string) => () =>
  h('div', { class: 'font-normal text-secondary py-px text-[0.935em] leading-[1.45]' }, text);

const roles = [
  {
    value: 'owner',
    label: 'Owner',
    description: roleDescription('Can modify project information and manage project members'),
  },
  {
    value: 'reader',
    label: 'Reader',
    description: roleDescription('Can make API requests that read or modify data'),
  },
];

const allColumns = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Role' },
  { id: 'status', label: 'Status' },
  { id: 'created', label: 'Created at' },
  { id: 'lastLogin', label: 'Last login' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'phone', label: 'Phone' },
];

/** Country flag (SVG flags from lipis/flag-icons, all 4:3), as in the React demos */
const FlagIcon: FunctionalComponent<{ code: string; trigger?: boolean }> = (props) =>
  h(
    'span',
    {
      style: {
        display: 'block',
        height: props.trigger ? 'var(--start-icon-size, 18px)' : '16px',
        aspectRatio: '4 / 3',
        borderRadius: '2px',
        overflow: 'hidden',
        flexShrink: 0,
      },
    },
    [
      h('img', {
        src: `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.5.0/flags/4x3/${props.code}.svg`,
        alt: '',
        loading: 'lazy',
        style: { display: 'block', width: '100%', height: '100%' },
      }),
    ],
  );
FlagIcon.props = { code: String, trigger: Boolean };

const scope = {
  // Icons passed as props
  Cabinet,
  CalendarAlt,
  Plus,
  Tools,
  User,
  UserLock,
  Workspace,
  // Option lists
  fruitsOptions,
  items,
  groupedItems,
  roles,
  allColumns,
  // Country and phone examples
  FlagIcon,
  countries: COUNTRIES,
  countryOptions: COUNTRY_OPTIONS,
  countryOptionClass: COUNTRY_OPTION_CLASS,
  countrySearchPredicate,
  countryOf: (code: string) => COUNTRY_LOOKUP.get(code),
  formatPhoneNumber,
  isPhoneValid: (phone: string) => {
    const digits = stripFormatting(phone);
    return digits.length >= 7 && digits.length <= 15;
  },
  /** Focuses a template ref once the select has closed */
  focusLater: (target: { focus?: () => void } | null | undefined) => {
    setTimeout(() => target?.focus?.(), 0);
  },
};

/** A VueDemo whose template can use the icons, option lists and helpers above. */
export function VueSelectDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ ...scope, ...state }} />;
}

/** VueSelectDemo plus the stylesheet the React country demos add for their option rows. */
export function VueCountrySelectDemo(props: ComponentProps<typeof VueDemo>) {
  return (
    <>
      <style>{COUNTRY_OPTION_STYLE}</style>
      <VueSelectDemo {...props} />
    </>
  );
}
