'use client';

import type { ComponentProps } from 'react';
import { defineComponent, h, markRaw, ref, type FunctionalComponent } from 'vue';
import { Button } from '@plexui/vue/components/Button';
import { FloatingLabelInput } from '@plexui/vue/components/FloatingLabelInput';
import { ChevronDown, X } from '@plexui/vue/components/Icon';
import {
  COUNTRIES,
  COUNTRY_LOOKUP,
  COUNTRY_OPTIONS,
  countrySearchPredicate,
  formatPhoneNumber,
  stripFormatting,
} from '../PhoneInputDemos';
import { VueDemo } from './VueDemo';
import { inputDemoScope } from './VueInputDemos';

// The form examples read small helper components and functions from their
// setup scope (a real app defines or imports them in <script setup>) and
// render the components with `<component :is>`. MDX cannot pass components
// or functions to a client component, so they come in through this wrapper;
// object components are marked raw, as the scope becomes reactive state. Markup, styles and data are the React demos'
// (FloatingLabelInputDemos.tsx, OTPInputDemos.tsx, OAuthFormDemos.tsx); the
// country and phone data is the same list, exported by PhoneInputDemos.tsx.

/** The demos' modal frame (`open`), or just its content when closed */
const DialogShell = markRaw(defineComponent({
  name: 'DialogShell',
  props: {
    open: { type: Boolean, default: false },
    width: { type: Number, default: 420 },
  },
  setup(props, { slots }) {
    return () =>
      props.open
        ? h(
            'div',
            {
              style: {
                background: 'rgb(0 0 0 / 0.4)',
                margin: '-48px -24px',
                padding: '48px 24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px',
                width: 'calc(100% + 48px)',
                marginLeft: '-24px',
                marginRight: '-24px',
                marginTop: '-48px',
                marginBottom: '-48px',
              },
            },
            [
              h(
                'div',
                {
                  style: {
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--color-surface-elevated)',
                    boxShadow: 'var(--shadow-lg), var(--shadow-hairline)',
                    width: `${props.width}px`,
                    maxWidth: 'calc(100% - 48px)',
                    overflow: 'hidden',
                  },
                },
                [
                  h('div', { style: { display: 'flex', justifyContent: 'flex-end', padding: '10px 10px 0 16px' } }, [
                    h(
                      Button,
                      { 'color': 'secondary', 'variant': 'ghost', 'size': 'lg', 'uniform': true, 'aria-label': 'Close' },
                      () => h(X),
                    ),
                  ]),
                  h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '20px',
                        padding: '0 24px 40px',
                      },
                    },
                    slots.default?.(),
                  ),
                ],
              ),
            ],
          )
        : slots.default?.();
  },
}));

// Brand logos (viewBox 0 0 24 24, sized by Button)
const svgAttrs = (fill: string) => ({ 'viewBox': '0 0 24 24', fill, 'aria-hidden': 'true', 'focusable': 'false' });

const GoogleLogo: FunctionalComponent = () =>
  h('svg', svgAttrs('none'), [
    h('path', {
      d: 'M21.0461 12.2099C21.0461 11.5553 20.9874 10.9259 20.8783 10.3217H12.1846V13.8966H17.1524C16.9342 15.0462 16.2797 16.0197 15.2979 16.6742V18.9987H18.2937C20.0391 17.3875 21.0461 15.0211 21.0461 12.2099Z',
      fill: '#4285F4',
    }),
    h('path', {
      d: 'M12.1844 21.2307C14.6767 21.2307 16.7662 20.4084 18.2935 18.9986L15.2977 16.6741C14.4753 17.2279 13.4264 17.5636 12.1844 17.5636C9.78441 17.5636 7.74525 15.944 7.01518 13.7622H3.94385V16.1454C5.46273 19.158 8.57602 21.2307 12.1844 21.2307Z',
      fill: '#34A853',
    }),
    h('path', {
      d: 'M7.01516 13.7539C6.83054 13.2 6.72145 12.6126 6.72145 12C6.72145 11.3874 6.83054 10.8 7.01516 10.2462V7.86295H3.94382C3.31445 9.10491 2.95361 10.5063 2.95361 12C2.95361 13.4937 3.31445 14.8951 3.94382 16.1371L6.33544 14.2741L7.01516 13.7539Z',
      fill: '#FBBC05',
    }),
    h('path', {
      d: 'M12.1844 6.44475C13.5439 6.44475 14.7522 6.91469 15.7173 7.82098L18.3606 5.17762C16.7578 3.68391 14.6767 2.76923 12.1844 2.76923C8.57602 2.76923 5.46273 4.84196 3.94385 7.86294L7.01518 10.2462C7.74525 8.06434 9.78441 6.44475 12.1844 6.44475Z',
      fill: '#EA4335',
    }),
  ]);

const AppleLogo: FunctionalComponent = () =>
  h('svg', svgAttrs('currentColor'), [
    h('path', {
      d: 'M20.0911 7.2368C19.3972 7.66168 18.8223 8.25568 18.4204 8.96321C18.0185 9.67075 17.8027 10.4687 17.7932 11.2823C17.7959 12.1981 18.0672 13.0929 18.5735 13.856C19.0798 14.6191 19.7988 15.2169 20.6415 15.5754C20.3093 16.6474 19.8176 17.6632 19.1829 18.5888C18.2748 19.8961 17.3253 21.2032 15.8805 21.2032C14.4358 21.2032 14.0642 20.3638 12.3992 20.3638C10.7755 20.3638 10.1976 21.2308 8.87662 21.2308C7.55564 21.2308 6.63382 20.0198 5.57424 18.5338C4.17461 16.452 3.4054 14.0106 3.35889 11.5024C3.35889 7.37443 6.04214 5.18665 8.68397 5.18665C10.0875 5.18665 11.2572 6.10847 12.1378 6.10847C12.9772 6.10847 14.2844 5.1315 15.8805 5.1315C16.7012 5.11032 17.5145 5.29127 18.2487 5.6584C18.983 6.02553 19.6157 6.56757 20.0911 7.2368ZM15.1238 3.38405C15.8274 2.55637 16.2257 1.51233 16.2521 0.426336C16.2533 0.28317 16.2395 0.140275 16.2108 0C15.0022 0.11806 13.8846 0.694096 13.0872 1.60995C12.3769 2.40465 11.9636 3.42081 11.9176 4.48573C11.9181 4.61524 11.932 4.74435 11.9589 4.87103C12.0542 4.88904 12.1509 4.89827 12.2479 4.89861C12.8049 4.85429 13.347 4.69717 13.8414 4.4368C14.3358 4.17644 14.7721 3.81826 15.1238 3.38405Z',
    }),
  ]);

const MicrosoftLogo: FunctionalComponent = () =>
  h('svg', svgAttrs('none'), [
    h('path', { d: 'M3.25 3.25H11.25V11.25H3.25V3.25Z', fill: '#F35325' }),
    h('path', { d: 'M12.75 3.25H20.75V11.25H12.75V3.25Z', fill: '#81BC06' }),
    h('path', { d: 'M3.25 12.75H11.25V20.75H3.25V12.75Z', fill: '#05A6F0' }),
    h('path', { d: 'M12.75 12.75H20.75V20.75H12.75V12.75Z', fill: '#FFBA08' }),
  ]);

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
                {
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                },
                [h(FlagIcon, { code: selected.value }), `${selected.label}${dialCode ? ` (${dialCode})` : ''}`],
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
  emits: { 'update:value': (_value: string) => true },
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
  DialogShell,
  GoogleLogo,
  AppleLogo,
  MicrosoftLogo,
  PhoneLogo,
  FlagIcon,
  PhoneCountryTrigger,
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
  /** Focuses a template ref once the select has closed */
  focusLater: (target: { focus?: () => void } | null | undefined) => {
    setTimeout(() => target?.focus?.(), 0);
  },
};

/** A VueDemo whose template can use the helpers above. */
export function VueFormExampleDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ ...formExamplesScope, ...state }} />;
}
