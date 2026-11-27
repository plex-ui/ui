'use client';

import countryLabelStyles from '../CountryLabel.module.css';
import { PhoneCountryLabel } from './PhoneCountryLabel';

import { removeTagWithFocus } from '../tagRemovalFocus';
import { type ComponentProps } from 'react';
import { defineComponent, h, markRaw, ref, type FunctionalComponent } from 'vue';
import { FloatingLabelInput } from '@plexui/vue/components/FloatingLabelInput';
import { AppleLogo, ChevronDown, GoogleLogo, MicrosoftLogo } from '@plexui/vue/components/Icon';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { usePhoneViewport, usePreviewEmbed } from '../PreviewEmbed';
import authStyles from '../AuthFormStage.module.css';
import authFieldsStyles from '../AuthFields.module.css';
import { AuthInput } from './AuthInput';
import { AuthFields } from './AuthFields';
import { AuthLegalNotice } from './AuthLegalNotice';
import { AuthFormStage } from './AuthFormStage';
import { VerificationFlow } from './VerificationFlow';
import { isVerificationCodeReady } from '../verificationCountdown';
import { FormScreen } from './FormScreen';
import {
  COUNTRIES,
  COUNTRY_LOOKUP,
  COUNTRY_OPTIONS,
  countrySearchPredicate,
  formatPhoneNumber,
  stripFormatting,
} from '../PhoneInputDemos';
import { VueDemo, type VueDemoControl } from './VueDemo';
import { MobileTagRow } from './MobileTagRow';
import { ProductVariants } from './ProductVariants';
import { SettingsChecklistDemo } from './SettingsChecklistDemo';
import { inputDemoScope } from './VueInputDemos';

// The form examples read small helper components and functions from their
// setup scope (a real app defines or imports them in <script setup>) and
// render the components with `<component :is>`. MDX cannot pass components
// or functions to a client component, so they come in through this wrapper;
// object components are marked raw, as the scope becomes reactive state. Markup, styles and data are the React demos'
// (FloatingLabelInputDemos.tsx, OTPInputDemos.tsx, OAuthFormDemos.tsx); the
// country and phone data is the same list, exported by PhoneInputDemos.tsx.

// Brand logos are the kit's AppleLogo, GoogleLogo and MicrosoftLogo icons; the phone glyph (viewBox 0 0 24 24, sized by Button) is a helper
const svgAttrs = (fill: string) => ({ 'viewBox': '0 0 24 24', fill, 'aria-hidden': 'true', 'focusable': 'false' });

const PhoneLogo: FunctionalComponent = () =>
  h('svg', svgAttrs('currentColor'), [
    h('path', {
      d: 'M2 5.57143C2 3.59898 3.59898 2 5.57143 2H8.625C9.0287 2 9.39281 2.24274 9.54808 2.61538L11.4231 7.11538C11.5744 7.47863 11.4987 7.89686 11.2295 8.18394L9.82741 9.67954C10.9044 11.7563 12.2732 13.2047 14.3016 14.2842L15.7929 12.7929C16.0794 12.5064 16.5106 12.4211 16.8846 12.5769L21.3846 14.4519C21.7573 14.6072 22 14.9713 22 15.375V18.4286C22 20.401 20.401 22 18.4286 22C9.35532 22 2 14.6447 2 5.57143ZM5.57143 4C4.70355 4 4 4.70355 4 5.57143C4 13.5401 10.4599 20 18.4286 20C19.2964 20 20 19.2964 20 18.4286V16.0417L16.7336 14.6807L15.2071 16.2071C14.9098 16.5044 14.4582 16.584 14.0771 16.4062C11.0315 14.9849 9.12076 12.9271 7.71882 9.92289C7.54598 9.55251 7.61592 9.11423 7.89546 8.81606L9.32824 7.28777L7.95833 4H5.57143Z',
    }),
  ]);

/** Country flag (SVG flags from lipis/flag-icons, all 4:3), as in the React demos */
const FlagIcon: FunctionalComponent<{ code: string }> = (props) =>
  h(
    'span',
    { style: { display: 'block', height: '16px', aspectRatio: '4 / 3', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 } },
    [
      h('img', {
        src: `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.5.0/flags/4x3/${props.code}.svg`,
        alt: '',
        loading: 'lazy',
        style: { display: 'block', width: '100%', height: '100%' },
      }),
    ],
  );
FlagIcon.props = { code: String };

const countryOf = (code: string) => COUNTRY_LOOKUP.get(code);

/** The phone examples' country trigger: flag, name and dial code (attributes and listeners go to the button) */
const PhoneCountryTrigger = markRaw(defineComponent({
  name: 'PhoneCountryTrigger',
  props: {
    country: { type: String, required: true },
    open: { type: Boolean, default: false },
  },
  setup(props) {
    return () => {
      const selected = countryOf(props.country);
      const dialCode = selected?.dialCode;
      return h(
        'button',
        {
          'type': 'button',
          'aria-expanded': props.open,
          'style': {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            height: '3.25rem',
            borderRadius: 'var(--floating-input-border-radius)',
            border: '1px solid var(--floating-input-border-color)',
            padding: '0 var(--floating-input-gutter)',
            backgroundColor: 'var(--floating-input-background)',
            color: selected ? 'var(--color-text)' : 'var(--color-text-tertiary)',
            fontSize: '1rem',
            lineHeight: '1.5rem',
            cursor: 'pointer',
            textAlign: 'left',
          },
        },
        [
          selected
            ? h(
                'span',
                { class: countryLabelStyles.Root },
                [h(FlagIcon, { code: selected.value }), h(PhoneCountryLabel, { label: selected.label, dialCode })],
              )
            : 'Country',
          h(ChevronDown, {
            style: { marginLeft: 'auto', flexShrink: 0, width: '12px', height: '7px', color: 'var(--color-text-tertiary)' },
          }),
        ],
      );
    };
  },
}));

const BIRTHDAY_MASK = 'MM / DD / YYYY';

/**
 * The About You form's birthday field: a FloatingLabelInput that formats
 * `MM / DD / YYYY` as you type, with the rest of the mask drawn over it while
 * focused. `v-model:value`; other attributes go to the FloatingLabelInput.
 */
const BirthdayMaskedInput = markRaw(defineComponent({
  name: 'BirthdayMaskedInput',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    invalid: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: { 'update:value': (value: string) => typeof value === 'string' },
  setup(props, { attrs, emit }) {
    const focused = ref(false);
    return () => {
      const { value } = props;
      const suffix = value.length >= BIRTHDAY_MASK.length ? '' : BIRTHDAY_MASK.slice(value.length);
      const mask = inputDemoScope.birthdayMask(value);
      const showMask = focused.value && suffix.length > 0;
      return h('div', { style: { position: 'relative' } }, [
        h(FloatingLabelInput, {
          ...attrs,
          'label': 'Birthday',
          value,
          'disabled': props.disabled,
          'maxlength': 14,
          'inputmode': 'numeric',
          'invalid': props.invalid,
          'onUpdate:value': (raw: string) => emit('update:value', inputDemoScope.nextBirthday(raw, value)),
          'onFocus': () => {
            focused.value = true;
          },
          'onBlur': () => {
            focused.value = false;
          },
          'style': showMask ? { caretColor: 'transparent' } : undefined,
        }),
        showMask
          ? h(
              'div',
              {
                'aria-hidden': 'true',
                'style': {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 calc(var(--floating-input-gutter) + 1px)',
                  pointerEvents: 'none',
                  font: 'inherit',
                  fontSize: '1rem',
                  lineHeight: '1.5rem',
                  zIndex: 2,
                  overflow: 'hidden',
                },
              },
              [
                h('span', { style: { visibility: 'hidden', whiteSpace: 'pre' } }, value),
                mask.before ? h('span', { style: { color: 'var(--color-text-tertiary)', whiteSpace: 'pre' } }, mask.before) : null,
                mask.highlight
                  ? h(
                      'span',
                      {
                        style: {
                          backgroundColor: 'var(--color-background-primary-solid)',
                          color: 'white',
                          whiteSpace: 'pre',
                          borderRadius: '3px',
                          padding: '1px 1px',
                        },
                      },
                      mask.highlight,
                    )
                  : null,
                mask.after ? h('span', { style: { color: 'var(--color-text-tertiary)', whiteSpace: 'pre' } }, mask.after) : null,
              ],
            )
          : null,
      ]);
    };
  },
}));

export const formExamplesScope = {
  FormScreen: markRaw(FormScreen),
  AuthFormStage: markRaw(AuthFormStage),
  VerificationFlow: markRaw(VerificationFlow),
  isVerificationCodeReady,
  AuthInput: markRaw(AuthInput),
  AuthFields: markRaw(AuthFields),
  AuthLegalNotice: markRaw(AuthLegalNotice),
  authFieldsStyles,
  MobileTagRow: markRaw(MobileTagRow),
  ProductVariants: markRaw(ProductVariants),
  SettingsChecklistDemo: markRaw(SettingsChecklistDemo),
  GoogleLogo,
  AppleLogo,
  MicrosoftLogo,
  PhoneLogo,
  FlagIcon,
  countryLabelStyles,
  PhoneCountryTrigger,
  PhoneCountryLabel: markRaw(PhoneCountryLabel),
  BirthdayMaskedInput,
  /** Country options without dial codes (About You) */
  countries: COUNTRIES.map(({ value, label }) => ({ value, label })),
  /** Country options labelled with their dial code (phone forms) */
  phoneCountryOptions: COUNTRY_OPTIONS,
  phoneCountrySearchPredicate: countrySearchPredicate,
  countryOf,
  dialCodeOf: (code: string) => countryOf(code)?.dialCode || '+1',
  formatPhoneNumber,
  isPhoneValid: (phone: string) => {
    const digits = stripFormatting(phone);
    return digits.length >= 7 && digits.length <= 15;
  },
  isValidBirthday: inputDemoScope.isValidBirthday,
  nextBirthday: inputDemoScope.nextBirthday,
  /** Focuses a template ref once the select has closed */
  focusLater: (target: { focus?: () => void } | null | undefined) => {
    setTimeout(() => target?.focus?.(), 0);
  },
};

export const formPresentationControls: VueDemoControl[] = [
  { name: 'dialog', type: 'boolean', default: false },
  { name: 'surface', type: 'select', options: [{ value: 'grouped', label: 'Grouped' }, { value: 'plain', label: 'Plain' }], default: 'grouped', phoneOnly: true },
];

const withPresentationControls = (controls: VueDemoControl[] = []) => [
  ...controls,
  ...formPresentationControls.filter((control) => !controls.some((item) => item.name === control.name)),
];

/** A VueDemo whose template can use the helpers above, and `wide` as `useBreakpoint("md")` gives it. */
export function VueFormExampleDemo({
  state,
  context,
  auth = false,
  stageClassName,
  controls,
  phoneControls,
  ...props
}: ComponentProps<typeof VueDemo> & {
  auth?: boolean;
  phoneControls?: ComponentProps<typeof VueDemo>['controls'];
}) {
  const wide = useBreakpoint('md');
  const phoneViewport = usePhoneViewport();
  const phonePreview = usePreviewEmbed() !== null;


  return (
    <VueDemo
      {...props}
      controls={withPresentationControls((phoneViewport || !wide) && phoneControls ? phoneControls : controls)}
      reactiveControlDefaults={phoneControls !== undefined}
      stageClassName={auth ? `${authStyles.Stage} ${stageClassName ?? ''}` : stageClassName}
      state={{ ...formExamplesScope, ...state, removeTagWithFocus }}
      context={{ ...context, wide, phonePreview, phoneHost: phoneViewport && !phonePreview }}
    />
  );
}
