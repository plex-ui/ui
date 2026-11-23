'use client';

import countryLabelStyles from '../CountryLabel.module.css';

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
} from '../PhoneInputDemos';
import { VueDemo } from './VueDemo';
import { VuePhoneRowsDemo } from './VuePhoneRowsDemo';

// A Vue template reads values from its setup scope, and MDX cannot pass
// functions or VNodes to a client component. The Select and SelectControl
// examples, and Popover's Column configuration (`allColumns`), use these the
// way a real app defines them in <script setup>:
// icons passed as props (`:StartIcon="CalendarAlt"`), option lists, the
// role descriptions (an option's `description` takes a string, a VNode or a
// render function) and the country helpers of the React demos
// (components/docs/SelectDemos.tsx, PhoneInputDemos.tsx).

const currencyOptions = [
  { label: 'US dollar', value: 'usd' },
  { label: 'Euro', value: 'eur' },
  { label: 'British pound', value: 'gbp' },
  { label: 'Japanese yen', value: 'jpy' },
  { label: 'Swiss franc', value: 'chf' },
  { label: 'Canadian dollar', value: 'cad' },
  { label: 'Australian dollar', value: 'aud' },
];

const projects = [
  { label: 'Website redesign', value: 'website' },
  { label: 'Mobile app', value: 'mobile' },
  { label: 'Spring campaign (archived)', value: 'spring', disabled: true },
  { label: 'Q3 roadmap', value: 'roadmap' },
  { label: 'Customer portal', value: 'portal' },
  { label: 'Brand guidelines', value: 'brand' },
  { label: 'Data migration', value: 'migration' },
  { label: 'Help center', value: 'help' },
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
    label: 'Custom deployments',
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
    description: roleDescription('Can manage members, billing and settings'),
  },
  {
    value: 'editor',
    label: 'Editor',
    description: roleDescription('Can edit and comment'),
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: roleDescription('Can view only'),
  },
];

// A phone row passes its descriptions as text: the list sets them as an iOS menu does its subtitles (13pt, wrapped)
const phoneRoles = [
  { value: 'owner', label: 'Owner', description: 'Can manage members, billing and settings' },
  { value: 'editor', label: 'Editor', description: 'Can edit and comment' },
  { value: 'viewer', label: 'Viewer', description: 'Can view only' },
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
  currencyOptions,
  projects,
  groupedItems,
  roles,
  phoneRoles,
  allColumns,
  // Country and phone examples
  FlagIcon,
  countryLabelStyles,
  countries: COUNTRIES,
  countryOptions: COUNTRY_OPTIONS,
  countryOptionClass: COUNTRY_OPTION_CLASS,
  countrySearchPredicate,
  countryOf: (code: string) => COUNTRY_LOOKUP.get(code),
};

/** A VueDemo whose template can use the icons, option lists and helpers above. */
export function VueSelectDemo({ state, ...props }: ComponentProps<typeof VuePhoneRowsDemo>) {
  // A demo with a phone template switches to it in Phone previews and on a narrow viewport
  if (props.phoneTemplate) return <VuePhoneRowsDemo {...props} state={{ ...scope, ...state }} />;
  return <VueDemo {...props} state={{ ...scope, ...state }} />;
}

/** VueSelectDemo plus the stylesheet the React country demos add for their option rows. */
export function VueCountrySelectDemo(props: ComponentProps<typeof VueSelectDemo>) {
  return (
    <>
      <style>{COUNTRY_OPTION_STYLE}</style>
      <VueSelectDemo {...props} />
    </>
  );
}
