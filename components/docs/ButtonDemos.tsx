'use client';

import React, { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Switch } from '@plexui/ui/components/Switch';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Popover } from '@plexui/ui/components/Popover';
import { Mail, PlusLg, ArrowRight } from '@plexui/ui/components/Icon';

export const controlsTableStyle: React.CSSProperties = {
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

export function DemoControlBoolean({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const controlId = "demo-switch-" + name.toLowerCase().replace(/\s+/g, "-");

  return (
    <div style={controlRowStyle}>
      <label htmlFor={controlId} style={controlLabelStyle}>{name}</label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

export function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const GUTTER_OPTIONS = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
const ICON_SIZE_OPTIONS = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
const VARIANT_OPTIONS = ['solid', 'soft', 'outline', 'ghost'] as const;
const OPTIONAL_SIZE_OPTIONS = ['auto', ...GUTTER_OPTIONS] as const;
const OPTIONAL_ICON_SIZE_OPTIONS = ['auto', ...ICON_SIZE_OPTIONS] as const;
const COLOR_MATRIX_VARIANTS = ['soft', 'solid', 'outline', 'ghost'] as const;
const COLOR_OPTIONS = [
  'primary',
  'secondary',
  'danger',
  'info',
  'discovery',
  'success',
  'caution',
  'warning',
] as const;

export function ButtonColorsDemo() {
  return (
    <div
      className="w-[calc(100%+48px)] -mx-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="pt-1 pb-6 px-8 w-max mx-auto">
        <div
          className="grid gap-6 items-center justify-center"
          style={{ gridTemplateColumns: `auto repeat(${COLOR_OPTIONS.length}, min-content)` }}
        >
          <div />
          {COLOR_OPTIONS.map((color) => (
            <div
              key={color}
              className="text-center text-sm mb-1"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {color}
            </div>
          ))}

          {COLOR_MATRIX_VARIANTS.map((variant) => (
            <React.Fragment key={variant}>
              <div
                className="text-right text-sm mr-3"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {variant}
              </div>
              {COLOR_OPTIONS.map((color) => (
                <div key={`${variant}-${color}`} className="text-center">
                  <Button color={color} variant={variant} size="md">
                    Submit
                  </Button>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ButtonSizingDemo() {
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('xl');
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('primary');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('solid');
  const [pill, setPill] = useState(true);
  const args = { color, variant, size, pill };
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
        <DemoControlRow name="variant">
          <SegmentedControl<(typeof VARIANT_OPTIONS)[number]>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="color">
          <SegmentedControl<(typeof COLOR_OPTIONS)[number]>
            value={color}
            onChange={setColor}
            aria-label="color"
            size="xs"
          >
            {COLOR_OPTIONS.map((c) => (
              <SegmentedControl.Option key={c} value={c}>
                {c}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div className="flex-1 flex flex-col gap-2 justify-center items-center py-12 w-full" data-demo-stage style={{ minHeight: 312 }}>
        <Button {...args}>
          <Mail /> Button <ArrowRight />
        </Button>
        <Button {...args}>
          Button <ArrowRight />
        </Button>
        <Button {...args}>
          <Mail /> Button
        </Button>
        <Button {...args}>Button</Button>
      </div>
    </>
  );
}

export function ButtonIconDemo() {
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [gutterSize, setGutterSize] = useState<(typeof OPTIONAL_SIZE_OPTIONS)[number]>('auto');
  const [iconSize, setIconSize] = useState<(typeof OPTIONAL_ICON_SIZE_OPTIONS)[number]>('auto');
  const [uniform, setUniform] = useState(false);
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('solid');
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('primary');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl<(typeof VARIANT_OPTIONS)[number]>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="uniform" value={uniform} onChange={setUniform} />
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
        <DemoControlRow name="gutterSize">
          <SegmentedControl<(typeof OPTIONAL_SIZE_OPTIONS)[number]>
            value={gutterSize}
            onChange={setGutterSize}
            aria-label="gutterSize"
            size="xs"
          >
            {OPTIONAL_SIZE_OPTIONS.map((g) => (
              <SegmentedControl.Option key={g} value={g}>
                {g}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="iconSize">
          <SegmentedControl<(typeof OPTIONAL_ICON_SIZE_OPTIONS)[number]>
            value={iconSize}
            onChange={setIconSize}
            aria-label="iconSize"
            size="xs"
          >
            {OPTIONAL_ICON_SIZE_OPTIONS.map((i) => (
              <SegmentedControl.Option key={i} value={i}>
                {i}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="color">
          <SegmentedControl<(typeof COLOR_OPTIONS)[number]>
            value={color}
            onChange={setColor}
            aria-label="color"
            size="xs"
          >
            {COLOR_OPTIONS.map((c) => (
              <SegmentedControl.Option key={c} value={c}>
                {c}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Button
          color={color}
          size={size}
          gutterSize={gutterSize === 'auto' ? undefined : gutterSize}
          iconSize={iconSize === 'auto' ? undefined : iconSize}
          uniform={uniform}
          variant={variant}
        >
          <PlusLg />
        </Button>
      </div>
    </>
  );
}

export function ButtonBlockDemo() {
  const [block, setBlock] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="block" value={block} onChange={setBlock} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <div className="w-[290px] mx-auto text-center p-2 border border-dashed border-alpha/20 rounded-md">
          <Button color="primary" size="lg" block={block}>
            Continue
          </Button>
        </div>
      </div>
    </>
  );
}

export function ButtonDisabledDemo() {
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Button color="primary" disabled={disabled}>Submit</Button>
      </div>
    </>
  );
}

export function ButtonInertDemo() {
  const [inert, setInert] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="inert" value={inert} onChange={setInert} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Button color="primary" inert={inert}>Submit</Button>
      </div>
    </>
  );
}

export function ButtonSelectedDemoWithControls() {
  const [selected, setSelected] = useState(true);
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('solid');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="selected" value={selected} onChange={setSelected} />
        <DemoControlRow name="variant">
          <SegmentedControl<(typeof VARIANT_OPTIONS)[number]>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Popover>
          <Popover.Trigger>
            <Button color="primary" selected={selected} variant={variant}>
              Click to open
            </Button>
          </Popover.Trigger>
          <Popover.Content minWidth="auto" className="p-4 text-sm">
            Button should look selected
          </Popover.Content>
        </Popover>
      </div>
    </>
  );
}
