'use client';

import type React from 'react';
import { useId, useState } from 'react';
import { ArrowRight, ArrowUpRight } from '@plexui/ui/components/Icon';
import { TextLink } from '@plexui/ui/components/TextLink';
import { Switch } from '@plexui/ui/components/Switch';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';

const preventDefault = (e: React.MouseEvent) => e.preventDefault();

const COLOR_CLASS_OPTIONS = [
  'text-default',
  'text-base',
  'text-secondary',
  'text-tertiary',
  'text-primary',
  'text-info',
  'text-discovery',
  'text-danger',
  'text-warning',
  'text-caution',
] as const;

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',

  width: '100%',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

function DemoControlBoolean({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const controlId = useId();

  return (
    <div style={controlRowStyle}>
      <label htmlFor={controlId} style={controlLabelStyle}>{name}</label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

export function TextLinkBaseDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <p>
        You can use the <TextLink href="#" onClick={preventDefault}>responses endpoint</TextLink> to generate text. You can
        either use the API directly from an HTTP client of your choice, or use one of the{' '}
        <TextLink href="#" onClick={preventDefault}>official SDKs</TextLink> for your preferred language.
      </p>
    </div>
  );
}

export function TextLinkColorsDemo() {
  const [colorClassName, setColorClassName] = useState<(typeof COLOR_CLASS_OPTIONS)[number]>('text-secondary');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="colorClassName">
          <SegmentedControl<(typeof COLOR_CLASS_OPTIONS)[number]>
            value={colorClassName}
            onChange={setColorClassName}
            aria-label="colorClassName"
            size="xs"
          >
            {COLOR_CLASS_OPTIONS.slice(0, 5).map((c) => (
              <SegmentedControl.Option key={c} value={c}>
                {c.replace('text-', '')}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <p className={colorClassName}>
          You can use the <TextLink href="#" onClick={preventDefault}>responses endpoint</TextLink> to generate text. You
          can either use the API directly from an HTTP client of your choice, or use one of the{' '}
          <TextLink href="#" onClick={preventDefault}>official SDKs</TextLink> for your preferred language.
        </p>
      </div>
    </>
  );
}

export function TextLinkPrimaryDemo() {
  const [primary, setPrimary] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="primary" value={primary} onChange={setPrimary} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <p>
          Sample text with a <TextLink href="#" onClick={preventDefault} primary={primary}>primary link</TextLink>
        </p>
      </div>
    </>
  );
}

export function TextLinkUnderlineDemo() {
  const [underline, setUnderline] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="underline" value={underline} onChange={setUnderline} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <p className="text-secondary">
          Sample text with a <TextLink href="#" onClick={preventDefault} underline={underline}>subtle link</TextLink>
        </p>
      </div>
    </>
  );
}

export function TextLinkExternalDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <TextLink href="#" onClick={preventDefault} primary underline>
        External link <ArrowUpRight />
      </TextLink>
    </div>
  );
}

export function TextLinkWeightDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <TextLink href="#" onClick={preventDefault} className="font-semibold" underline={false}>
        Contact support <ArrowRight />
      </TextLink>
    </div>
  );
}
