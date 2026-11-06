'use client';

import React, { useId, useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Switch } from '@plexui/ui/components/Switch';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Popover } from '@plexui/ui/components/Popover';
import { Mail, PlusLg, ArrowRight } from '@plexui/ui/components/Icon';
import { useDemoControlSync } from './PreviewEmbed';
import { usePhoneRows } from './PhoneRows';

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
  phoneOnly = false,
  desktopOnly = false,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
  phoneOnly?: boolean;
  /** Hidden on a phone (narrow page or Phone preview), where the value looks the same; it stays mounted */
  desktopOnly?: boolean;
}) {
  // Unique per instance: two demos with the same control name share a page
  const controlId = useId();
  useDemoControlSync(name, value, onChange);

  return (
    <div style={controlRowStyle} data-demo-phone-only={phoneOnly || undefined} data-demo-desktop-only={desktopOnly || undefined}>
      <label htmlFor={controlId} style={controlLabelStyle}>{name}</label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

/** The control in a row whose value the phone view follows: the first child with `value` and `onChange` */
function syncedControl(children: React.ReactNode): { value: unknown; onChange: (value: never) => void } | null {
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) continue;
    const props = child.props as { value?: unknown; onChange?: unknown; children?: React.ReactNode };
    if (child.type === React.Fragment) {
      const inner = syncedControl(props.children);
      if (inner) return inner;
    } else if ('value' in props && typeof props.onChange === 'function') {
      return { value: props.value, onChange: props.onChange as (value: never) => void };
    }
  }
  return null;
}

export function DemoControlRow({ name, children, phoneOnly = false, desktopOnly = false }: { name: string; children: React.ReactNode; phoneOnly?: boolean; desktopOnly?: boolean }) {
  const control = syncedControl(children);
  useDemoControlSync(name, control?.value, control?.onChange);

  return (
    <div style={controlRowStyle} data-demo-phone-only={phoneOnly || undefined} data-demo-desktop-only={desktopOnly || undefined}>
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
// On a phone (touch.css) a button takes one of the three heights of iOS buttons: small 28 (3xs to sm), medium 34
// (md, lg) and large 50 (xl to 3xl), always a capsule, with the gutters and icon of its size. The phone examples
// show those three sizes and the two colors of the iOS buttons: accent (primary) and destructive (danger).
const PHONE_SIZE_OPTIONS = ['sm', 'md', 'xl'] as const;
const PHONE_COLOR_OPTIONS: readonly (typeof COLOR_OPTIONS)[number][] = ['primary', 'danger'];
// A color chosen on a desktop that the phone examples do not offer shows as primary there
const phoneColorOf = (color: (typeof COLOR_OPTIONS)[number]) => (PHONE_COLOR_OPTIONS.includes(color) ? color : 'primary');
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

function ButtonVariantControl({ value, onChange }: { value: (typeof VARIANT_OPTIONS)[number]; onChange: (value: (typeof VARIANT_OPTIONS)[number]) => void }) {
  return (
    <DemoControlRow name="variant">
      <SegmentedControl<(typeof VARIANT_OPTIONS)[number]> value={value} onChange={onChange} aria-label="variant" size="xs">
        {VARIANT_OPTIONS.map((v) => (
          <SegmentedControl.Option key={v} value={v}>
            {v}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );
}

function ButtonColorControl({ value, onChange, options = COLOR_OPTIONS }: { value: (typeof COLOR_OPTIONS)[number]; onChange: (value: (typeof COLOR_OPTIONS)[number]) => void; options?: readonly (typeof COLOR_OPTIONS)[number][] }) {
  return (
    <DemoControlRow name="color">
      <SegmentedControl<(typeof COLOR_OPTIONS)[number]> value={value} onChange={onChange} aria-label="color" size="xs">
        {options.map((c) => (
          <SegmentedControl.Option key={c} value={c}>
            {c}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );
}

export function ButtonColorsDemo() {
  return (
    <div
      className="w-full min-w-0 md:w-[calc(100%+48px)] md:-mx-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
  const phone = usePhoneRows();
  const args = { color, variant, size, pill };
  if (phone) {
    const phoneColor = phoneColorOf(color);
    return (
      <>
        <div data-demo-controls style={controlsTableStyle}>
          <ButtonVariantControl value={variant} onChange={setVariant} />
          <ButtonColorControl value={phoneColor} onChange={setColor} options={PHONE_COLOR_OPTIONS} />
        </div>
        <div className="flex-1 flex flex-col gap-4 justify-center items-center py-12 w-full" data-demo-stage>
          {PHONE_SIZE_OPTIONS.map((phoneSize) => (
            <div key={phoneSize} className="flex gap-2 items-center">
              <Button color={phoneColor} variant={variant} size={phoneSize}>
                <Mail /> Button
              </Button>
              <Button color={phoneColor} variant={variant} size={phoneSize}>Button</Button>
            </div>
          ))}
        </div>
      </>
    );
  }
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
        <ButtonVariantControl value={variant} onChange={setVariant} />
        <ButtonColorControl value={color} onChange={setColor} />
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
  const phone = usePhoneRows();
  if (phone) {
    // uniform is left out: on a phone a uniform button is currently 44px at every size
    const phoneColor = phoneColorOf(color);
    return (
      <>
        <div data-demo-controls style={controlsTableStyle}>
          <ButtonVariantControl value={variant} onChange={setVariant} />
          <ButtonColorControl value={phoneColor} onChange={setColor} options={PHONE_COLOR_OPTIONS} />
        </div>
        <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
          <div className="flex gap-2 items-center">
            {PHONE_SIZE_OPTIONS.map((phoneSize) => (
              <Button key={phoneSize} color={phoneColor} size={phoneSize} variant={variant} aria-label="Add">
                <PlusLg />
              </Button>
            ))}
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <ButtonVariantControl value={variant} onChange={setVariant} />
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
        <ButtonColorControl value={color} onChange={setColor} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Button
          color={color}
          size={size}
          gutterSize={gutterSize === 'auto' ? undefined : gutterSize}
          iconSize={iconSize === 'auto' ? undefined : iconSize}
          uniform={uniform}
          variant={variant}
          aria-label="Add"
        >
          <PlusLg />
        </Button>
      </div>
    </>
  );
}

export function ButtonBlockDemo() {
  const [block, setBlock] = useState(true);
  // On a phone the main action of a screen is the large 50px button of iOS
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="block" value={block} onChange={setBlock} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <div className="w-[290px] mx-auto text-center p-2 border border-dashed border-alpha/20 rounded-md">
          <Button color="primary" size={phone ? 'xl' : 'lg'} block={block}>
            Continue
          </Button>
        </div>
      </div>
    </>
  );
}

export function ButtonStatesDemo() {
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Button color="primary" disabled={disabled} loading={loading}>Submit</Button>
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
