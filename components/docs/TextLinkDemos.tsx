'use client';

import type React from 'react';
import { useState } from 'react';
import { ArrowUpRight } from '@plexui/ui/components/Icon';
import { TextLink } from '@plexui/ui/components/TextLink';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';

const preventDefault = (e: React.MouseEvent) => e.preventDefault();

// The paragraph's own color (no class), or the two text colors a paragraph takes in the docs
const COLOR_OPTIONS = [
  { value: 'default', label: 'default' },
  { value: 'text-secondary', label: 'secondary' },
  { value: 'text-tertiary', label: 'tertiary' },
] as const;
const UNDERLINE_OPTIONS = ['auto', 'on', 'off'] as const;
// A literal class per weight, so Tailwind finds each one
const WEIGHT_OPTIONS = [
  { value: 'font-normal', label: 'normal' },
  { value: 'font-medium', label: 'medium' },
  { value: 'font-semibold', label: 'semibold' },
] as const;

function Segments<T extends string>({ name, options, value, onChange }: { name: string; options: readonly (T | { value: T; label: string })[]; value: T; onChange: (value: T) => void }) {
  return (
    <DemoControlRow name={name}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => {
          const { value: optionValue, label } = typeof option === 'string' ? { value: option, label: option } : option;
          return (
            <SegmentedControl.Option key={optionValue} value={optionValue}>
              {label}
            </SegmentedControl.Option>
          );
        })}
      </SegmentedControl>
    </DemoControlRow>
  );
}

/** The Overview, with every setting of the link: what the page's examples once showed one by one (Inline usage,
 * Default inheritance, Primary color, Underline, External links, Font weight) are its settings, on the paragraph of
 * Inline usage (owner 11.11: «в первом примере можно сразу показать все со всеми настройками»). `colorClassName` is the
 * paragraph's text color, which the links take unless `primary`; `underline` is unset (`auto`: on, but off for a
 * primary link), on or off; `external` gives the second link an external URL and the arrow that marks it. */
export function TextLinkOverviewDemo() {
  const [colorClassName, setColorClassName] = useState<(typeof COLOR_OPTIONS)[number]['value']>('default');
  const [primary, setPrimary] = useState(false);
  const [underline, setUnderline] = useState<(typeof UNDERLINE_OPTIONS)[number]>('auto');
  const [external, setExternal] = useState(false);
  const [weight, setWeight] = useState<(typeof WEIGHT_OPTIONS)[number]['value']>('font-normal');
  const underlined = underline === 'auto' ? undefined : underline === 'on';
  const className = weight === 'font-normal' ? undefined : weight;
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="colorClassName" options={COLOR_OPTIONS} value={colorClassName} onChange={setColorClassName} />
        <DemoControlBoolean name="primary" value={primary} onChange={setPrimary} />
        <Segments name="underline" options={UNDERLINE_OPTIONS} value={underline} onChange={setUnderline} />
        <DemoControlBoolean name="external" value={external} onChange={setExternal} />
        <Segments name="weight" options={WEIGHT_OPTIONS} value={weight} onChange={setWeight} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <p className={colorClassName === 'default' ? undefined : colorClassName}>
          You can use the{' '}
          <TextLink href="#" onClick={preventDefault} primary={primary} underline={underlined} className={className}>responses endpoint</TextLink>{' '}
          to generate text. You can either use the API directly from an HTTP client of your choice, or use one of the{' '}
          {external ? (
            <TextLink href="https://example.com" primary={primary} underline={underlined} className={className}>
              official SDKs <ArrowUpRight />
            </TextLink>
          ) : (
            <TextLink href="#" onClick={preventDefault} primary={primary} underline={underlined} className={className}>official SDKs</TextLink>
          )}{' '}
          for your preferred language.
        </p>
      </div>
    </>
  );
}
