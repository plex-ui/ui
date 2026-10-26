'use client';

import React, { useId, useState } from 'react';
import { ButtonLink } from '@plexui/ui/components/Button';
import { ArrowRight, Globe, Key } from '@plexui/ui/components/Icon';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';

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
const matrixLabelStyle: React.CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: '0.875rem',
};

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

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

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const ICON_SIZE_OPTIONS = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
const VARIANTS = ['soft', 'solid', 'outline', 'ghost'] as const;
const COLORS = [
  'primary',
  'secondary',
  'danger',
  'info',
  'discovery',
  'success',
  'caution',
  'warning',
] as const;

export function ButtonLinkColorsMatrixDemo() {
  const template = `auto repeat(${COLORS.length}, min-content)`;

  return (
    <div
      className="w-[calc(100%+48px)] -mx-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="pt-1 pb-6 px-8 w-fit min-w-full">
        <div
          className="grid gap-6 items-center justify-center"
          style={{ gridTemplateColumns: template }}
        >
          <div />
          {COLORS.map((color) => (
            <div key={color} className="text-center mb-1" style={matrixLabelStyle}>
              {color}
            </div>
          ))}

          {VARIANTS.map((variant) => (
            <React.Fragment key={variant}>
              <div className="text-right mr-3" style={matrixLabelStyle}>
                {variant}
              </div>
              {COLORS.map((color) => (
                <div key={`${variant}-${color}`} className="text-center">
                  <ButtonLink
                    as="a"
                    href="#"
                    size="lg"
                    color={color}
                    variant={variant}
                    pill={false}
                    className="whitespace-nowrap"
                  >
                    Button
                  </ButtonLink>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ButtonLinkSizingDemoWithControls() {
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill] = useState(false);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div data-demo-stage className="flex items-center justify-center py-12">
        <div className="flex flex-col gap-2 justify-start items-start">
          <ButtonLink
            as="a"
            color="primary"
            size={size}
            pill={pill}
            href="#"
            className="whitespace-nowrap"
          >
            View account <ArrowRight />
          </ButtonLink>
          <ButtonLink
            as="a"
            color="primary"
            size={size}
            pill={pill}
            href="#"
            className="whitespace-nowrap"
          >
            View account
          </ButtonLink>
        </div>
      </div>
    </>
  );
}

export function ButtonLinkIconDemoWithControls() {
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [iconSize, setIconSize] = useState<(typeof ICON_SIZE_OPTIONS)[number]>('lg');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="iconSize">
          <SegmentedControl<(typeof ICON_SIZE_OPTIONS)[number]>
            value={iconSize}
            onChange={setIconSize}
            aria-label="iconSize"
            size="xs"
          >
            {ICON_SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex items-center justify-center py-12">
        <ButtonLink
          as="a"
          color="info"
          size={size}
          iconSize={iconSize}
          variant="soft"
          pill={false}
          href="#"
          className="whitespace-nowrap"
        >
          <Globe /> View website
        </ButtonLink>
      </div>
    </>
  );
}

export function ButtonLinkBlockDemoWithControls() {
  const [block, setBlock] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="block" value={block} onChange={setBlock} />
      </div>
      <div data-demo-stage className="flex items-center justify-center py-12">
        <div className="w-[290px] text-center p-2 border border-dashed border-alpha/20 rounded-md">
          <ButtonLink
            as="a"
            block={block}
            size="lg"
            pill={false}
            href="#"
            className="whitespace-nowrap"
          >
            Continue to dashboard
          </ButtonLink>
        </div>
      </div>
    </>
  );
}

export function ButtonLinkDisabledDemoWithControls() {
  const [disabled, setDisabled] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex items-center justify-center py-12">
        <ButtonLink
          as="a"
          href="#"
          color="primary"
          pill={false}
          disabled={disabled}
          className="whitespace-nowrap"
        >
          <Key /> View API Keys
        </ButtonLink>
      </div>
    </>
  );
}
