'use client';

import type { ComponentProps } from 'react';
import { VueDemo } from './VueDemo';

// The masked SSN and birthday examples call these helpers from their
// templates (a real app defines them in <script setup>). MDX cannot pass
// functions to a client component, so they come in through this wrapper.
// The logic is the same as the React demos in components/docs/InputDemos.tsx.

const SSN_MASK = 'XXX-XX-XXXX';
const BIRTHDAY_MASK = 'MM / DD / YYYY';

type MaskParts = { suffix: string; before: string; highlight: string; after: string };

const splitMask = (suffix: string, pattern: RegExp): MaskParts => {
  if (!suffix) return { suffix, before: '', highlight: '', after: '' };
  const match = suffix.match(pattern);
  if (!match) return { suffix, before: suffix, highlight: '', after: '' };
  return { suffix, before: match[1] || '', highlight: match[2] ?? '', after: match[3] || '' };
};

const getSSNDigits = (value: string) => value.replace(/\D/g, '').slice(0, 9);

/** `123456789` → `123-45-6789`, with the separator added as soon as a group is full */
const formatSSN = (rawValue: string) => {
  const digits = getSSNDigits(rawValue);
  if (digits.length < 3) return digits;
  if (digits.length === 3) return `${digits}-`;
  if (digits.length < 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 5) return `${digits.slice(0, 3)}-${digits.slice(3)}-`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

/** Digits after an edit; backspacing over a separator removes the digit before it */
const nextSSNDigits = (raw: string, digits: string) => {
  const newDigits = getSSNDigits(raw);
  if (raw.length < formatSSN(digits).length && newDigits.length === digits.length) return digits.slice(0, -1);
  return newDigits;
};

/** The rest of `XXX-XX-XXXX` after the typed digits, split around the next group */
const ssnMask = (digits: string) => {
  const formatted = formatSSN(digits);
  const suffix = formatted.length >= SSN_MASK.length ? '' : SSN_MASK.slice(formatted.length);
  return splitMask(suffix, /^(-?)([X]+)([\s\S]*)/);
};

const getBirthdayDigits = (value: string) => value.replace(/\D/g, '').slice(0, 8);

/** `01151995` → `01 / 15 / 1995`, with the separator added as soon as a part is full */
const formatBirthday = (rawValue: string) => {
  const digits = getBirthdayDigits(rawValue);
  const month = digits.slice(0, 2);
  const day = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (digits.length < 2) return month;
  if (digits.length === 2) return `${month} / `;
  if (digits.length < 4) return `${month} / ${day}`;
  if (digits.length === 4) return `${month} / ${day} / `;
  return `${month} / ${day} / ${year}`;
};

/** Formatted value after an edit; backspacing over a separator removes the digit before it */
const nextBirthday = (raw: string, value: string) => {
  const newDigits = getBirthdayDigits(raw);
  if (raw.length < value.length && newDigits.length === getBirthdayDigits(value).length) {
    return formatBirthday(newDigits.slice(0, -1));
  }
  return formatBirthday(raw);
};

/** The rest of `MM / DD / YYYY` after the typed value, split around the next part */
const birthdayMask = (value: string) => {
  const suffix = value.length >= BIRTHDAY_MASK.length ? '' : BIRTHDAY_MASK.slice(value.length);
  return splitMask(suffix, /^(\s*\/\s*)?([A-Z]+)([\s\S]*)/);
};

const isValidBirthday = (value: string) => {
  const parsed = value.match(/^(\d{2})\s\/\s(\d{2})\s\/\s(\d{4})$/);
  if (!parsed) return false;
  const month = Number(parsed[1]);
  const day = Number(parsed[2]);
  const year = Number(parsed[3]);
  if (month < 1 || month > 12) return false;
  const maxDay = new Date(year, month, 0).getDate();
  return day >= 1 && day <= maxDay;
};

/**
 * Padding and font metrics of the <input> inside an Input, read after each
 * render (`@vue:mounted` / `@vue:updated`) so the mask overlay lines up at
 * every size, like the React demo's effect.
 */
const measureInput = (vnode: { el?: Element | null }) => {
  const input = vnode.el?.querySelector?.('input');
  if (!input) return {};
  const style = getComputedStyle(input);
  return { padding: `calc(${style.paddingLeft} + 1px)`, fontSize: style.fontSize, lineHeight: style.lineHeight };
};

export const inputDemoScope = {
  formatSSN,
  nextSSNDigits,
  ssnMask,
  nextBirthday,
  birthdayMask,
  isValidBirthday,
  measureInput,
};

/** A VueDemo whose template can also use the mask helpers above. */
export function VueInputDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return (
    <VueDemo
      {...props}
      state={{ ...inputDemoScope, metrics: { padding: '13px', fontSize: '16px', lineHeight: '24px' }, focused: false, ...state }}
    />
  );
}
