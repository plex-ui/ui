'use client';

import React, { useId, useMemo, useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Switch } from '@plexui/ui/components/Switch';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Popover } from '@plexui/ui/components/Popover';
import { Select } from '@plexui/ui/components/Select';
import { Mail, PlusLg, ArrowRight, CompareArrows, Delete, Clear } from '@plexui/ui/components/Icon';
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
  syncValue,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
  phoneOnly?: boolean;
  /** Hidden on a phone (narrow page or Phone preview), where the value looks the same; it stays mounted */
  desktopOnly?: boolean;
  /** What the page and its Phone view trade, when the row shows another value */
  syncValue?: boolean;
}) {
  // Unique per instance: two demos with the same control name share a page
  const controlId = useId();
  useDemoControlSync(name, value, onChange, { channelValue: syncValue ?? value, channel: !desktopOnly });

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

const hasSegments = (children: React.ReactNode): boolean =>
  React.Children.toArray(children).some((child) => React.isValidElement(child)
    && (child.type === SegmentedControl || (child.type === React.Fragment && hasSegments((child.props as { children?: React.ReactNode }).children))));

/** `name` keys the control between the page and its Phone view; `label`, when set, is what the row shows (a phone-only
 * row for a prop that also has a desktop row, such as a size with the phone's own options). */
export function DemoControlRow({ name, label, children, phoneOnly = false, desktopOnly = false, syncValue }: {
  name: string;
  label?: string;
  children: React.ReactNode;
  phoneOnly?: boolean;
  desktopOnly?: boolean;
  /** What the page and its Phone view trade, when the row shows another value (a choice the phone does not offer) */
  syncValue?: unknown;
}) {
  const control = syncedControl(children);
  useDemoControlSync(name, control?.value, control?.onChange, {
    channelValue: syncValue === undefined ? control?.value : syncValue,
    channel: !desktopOnly,
  });

  return (
    <div style={controlRowStyle} data-demo-phone-only={phoneOnly || undefined} data-demo-desktop-only={desktopOnly || undefined}>
      <span style={{ ...controlLabelStyle, flexShrink: 0 }}>{label ?? name}</span>
      {/* Segments wider than the row (eight colors) scroll in it, rather than run past its end */}
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, ...(hasSegments(children) ? { overflowX: 'auto' } : {}) }}>{children}</div>
    </div>
  );
}

/** A menu of a control's options, its value and onChange in the option's own terms (the row's phone view sets it so) */
function DemoChoiceMenu<T extends string>({ name, options, value, onChange }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  // Select wants its options as a stable reference: they change only when the options do (a phone's own options)
  const key = options.join('\n');
  const menuOptions = useMemo(() => key.split('\n').map((option) => ({ value: option, label: option })), [key]);
  return (
    <Select
      options={menuOptions}
      value={value}
      onChange={(option) => onChange(option.value as T)}
      aria-label={name}
      size="xs"
      variant="soft"
      pill
      block={false}
    />
  );
}

/** A control of a few options as a row of segments, each option its value or a value under a label */
export function Segments<T extends string>({ name, options, value, onChange, phoneOnly, desktopOnly }: { name: string; options: readonly (T | { value: T; label: string })[]; value: T; onChange: (value: T) => void; phoneOnly?: boolean; desktopOnly?: boolean }) {
  return (
    <DemoControlRow name={name} phoneOnly={phoneOnly} desktopOnly={desktopOnly}>
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

/** A control of more options than a row of segments shows whole (eight colors), as a menu: a row of segments that
 * runs past the panel hides its last options and does not show it scrolls (owner 11.11, the Stats Card's accentColor).
 * Storybook's controls make the same cut, radio buttons for an enum of up to five options and a select above. */
export function DemoControlSelect<T extends string>({ name, label, options, value, onChange, phoneOnly = false, desktopOnly = false, syncValue }: {
  name: string;
  label?: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  phoneOnly?: boolean;
  desktopOnly?: boolean;
  /** What the page and its Phone view trade, when the row shows another value */
  syncValue?: unknown;
}) {
  return (
    <DemoControlRow name={name} label={label} phoneOnly={phoneOnly} desktopOnly={desktopOnly} syncValue={syncValue}>
      <DemoChoiceMenu name={label ?? name} options={options} value={value} onChange={onChange} />
    </DemoControlRow>
  );
}

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const GUTTER_OPTIONS = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
const ICON_SIZE_OPTIONS = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
const VARIANT_OPTIONS = ['solid', 'soft', 'outline', 'ghost'] as const;
const OPTIONAL_SIZE_OPTIONS = ['auto', ...GUTTER_OPTIONS] as const;
const OPTIONAL_ICON_SIZE_OPTIONS = ['auto', ...ICON_SIZE_OPTIONS] as const;
// On a phone (touch.css) a button takes one of the three heights of iOS buttons, from the kit's Button - Content
// Area: small 28 (3xs to sm), medium 34 (md, lg) and large 50 (xl to 3xl), always a capsule. The phone examples
// show those three sizes and the two colors of iOS buttons: accent (primary) and destructive (danger).
const PHONE_SIZES = [
  { size: 'sm', name: 'Small', height: 28 },
  { size: 'md', name: 'Medium', height: 34 },
  { size: 'xl', name: 'Large', height: 50 },
] as const;
const PHONE_COLOR_OPTIONS: readonly (typeof COLOR_OPTIONS)[number][] = ['primary', 'danger'];
// A color chosen on a desktop that the phone examples do not offer shows as primary there
const phoneColorOf = (color: (typeof COLOR_OPTIONS)[number]) => (PHONE_COLOR_OPTIONS.includes(color) ? color : 'primary');
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const labelStyle: React.CSSProperties = { color: 'var(--color-text-tertiary)' };

/** The actions of a phone screen, large buttons 11px apart (IMG_5432, IMG_5516). They stand at the top of the screen,
    next to the example's controls, not at its foot as iOS pins them (owner 08.11). */
function PhoneActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col w-full" data-demo-stage>
      <div className="flex w-full flex-col items-center gap-[11px]">
        {children}
      </div>
    </div>
  );
}
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

export function ButtonOverviewDemo() {
  // Phone: the actions of a screen, Filled, Gray and Plain (IMG_5516 Scan QR Code over Other Options,
  // IMG_5432 Continue over the plain Create Pass Manually), at the large size iOS gives a screen's actions
  if (usePhoneRows()) {
    return (
      <PhoneActions>
        <Button color="primary" size="xl" block>Continue</Button>
        <Button color="secondary" variant="soft" size="xl" block>Other Options</Button>
        <Button color="primary" variant="ghost" size="xl" block>Not Now</Button>
      </PhoneActions>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      <Button color="primary">Submit</Button>
      <Button variant="soft"><CompareArrows /> Compare</Button>
      <Button color="danger" gutterSize="sm" pill={false} aria-label="Delete"><Delete /></Button>
      <Button variant="outline">Next <ArrowRight /></Button>
      <Button variant="ghost" color="secondary" uniform aria-label="Clear"><Clear /></Button>
    </div>
  );
}

export function ButtonColorsDemo() {
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('primary');
  const phone = usePhoneRows();
  // Phone: every variant as a screen's action, in the two colors of iOS buttons, accent and destructive
  if (phone) {
    const phoneColor = phoneColorOf(color);
    return (
      <>
        <div data-demo-controls style={controlsTableStyle}>
          <ButtonColorControl value={phoneColor} onChange={setColor} options={PHONE_COLOR_OPTIONS} />
        </div>
        <PhoneActions>
          {VARIANT_OPTIONS.map((variant) => (
            <Button key={variant} color={phoneColor} variant={variant} size="xl" block>
              {capitalize(variant)}
            </Button>
          ))}
        </PhoneActions>
      </>
    );
  }
  // Desktop: a color in each row, a variant in each column, so the eight colors fit the preview's width
  return (
    <div
      className="grid gap-x-6 gap-y-4 items-center justify-center pt-1 pb-6"
      style={{ gridTemplateColumns: `auto repeat(${VARIANT_OPTIONS.length}, min-content)` }}
    >
      <div />
      {VARIANT_OPTIONS.map((variant) => (
        <div key={variant} className="text-center text-sm mb-1" style={labelStyle}>
          {variant}
        </div>
      ))}
      {COLOR_OPTIONS.map((rowColor) => (
        <React.Fragment key={rowColor}>
          <div className="text-right text-sm mr-3" style={labelStyle}>
            {rowColor}
          </div>
          {VARIANT_OPTIONS.map((variant) => (
            <div key={`${rowColor}-${variant}`} className="text-center">
              <Button color={rowColor} variant={variant} size="md">
                Submit
              </Button>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

export function ButtonSizingDemo() {
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('primary');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('solid');
  const [pill, setPill] = useState(false);
  const phone = usePhoneRows();
  if (phone) {
    // Phone: the three sizes of the kit's Button - Content Area, each with its symbol and label, label and symbol
    const phoneColor = phoneColorOf(color);
    return (
      <>
        <div data-demo-controls style={controlsTableStyle}>
          <ButtonVariantControl value={variant} onChange={setVariant} />
          <ButtonColorControl value={phoneColor} onChange={setColor} options={PHONE_COLOR_OPTIONS} />
        </div>
        <div className="flex-1 flex flex-col items-center gap-8 w-full" data-demo-stage>
          {PHONE_SIZES.map(({ size, name, height }) => (
            <div key={size} className="flex flex-col items-center gap-3">
              <div className="text-sm" style={labelStyle}>{name} · {size} · {height}px</div>
              <div className="flex items-center gap-2">
                <Button color={phoneColor} variant={variant} size={size}><Mail /> Button</Button>
                <Button color={phoneColor} variant={variant} size={size}>Button</Button>
                <Button color={phoneColor} variant={variant} size={size} aria-label="Add"><PlusLg /></Button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <ButtonVariantControl value={variant} onChange={setVariant} />
        <ButtonColorControl value={color} onChange={setColor} />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      {/* Desktop: every size at once, the size's name before its buttons */}
      <div className="flex-1 flex justify-center py-10 w-full" data-demo-stage>
        <div className="grid gap-x-3 gap-y-3 items-center" style={{ gridTemplateColumns: 'auto auto auto' }}>
          {SIZE_OPTIONS.map((size) => (
            <React.Fragment key={size}>
              <div className="text-right text-sm font-mono mr-3" style={labelStyle}>{size}</div>
              <div><Button color={color} variant={variant} size={size} pill={pill}><Mail /> Button</Button></div>
              <div><Button color={color} variant={variant} size={size} pill={pill}>Button</Button></div>
            </React.Fragment>
          ))}
        </div>
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
    // Phone: an icon-only button is the kit's symbol button, a circle of its size (28, 34, 50), with or without
    // uniform, so the phone has no uniform control (owner 08.11: uniform made every size 44)
    const phoneColor = phoneColorOf(color);
    return (
      <>
        <div data-demo-controls style={controlsTableStyle}>
          <ButtonVariantControl value={variant} onChange={setVariant} />
          <ButtonColorControl value={phoneColor} onChange={setColor} options={PHONE_COLOR_OPTIONS} />
        </div>
        <div className="flex-1 flex justify-center w-full" data-demo-stage>
          <div className="flex items-end gap-8">
            {PHONE_SIZES.map(({ size: phoneSize, height }) => (
              <div key={phoneSize} className="flex flex-col items-center gap-3">
                <Button color={phoneColor} size={phoneSize} variant={variant} aria-label="Add">
                  <PlusLg />
                </Button>
                <div className="text-sm" style={labelStyle}>{phoneSize} · {height}px</div>
              </div>
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
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="block" value={block} onChange={setBlock} />
      </div>
      {phone ? (
        // Phone: a screen's main action, the large button (IMG_5432 Continue)
        <PhoneActions>
          <Button color="primary" size="xl" block={block}>Continue</Button>
        </PhoneActions>
      ) : (
        <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
          <div className="w-[290px] mx-auto text-center p-2 border border-dashed border-alpha/20 rounded-md">
            <Button color="primary" size="lg" block={block}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// Every variant takes the states, so the example shows all four (owner 08.11)
export function ButtonStatesDemo() {
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const phone = usePhoneRows();
  const buttons = VARIANT_OPTIONS.map((variant) => (
    <Button key={variant} color="primary" variant={variant} size={phone ? 'xl' : undefined} block={phone} disabled={disabled} loading={loading}>
      {capitalize(variant)}
    </Button>
  ));
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
      </div>
      {phone ? (
        // Phone: a screen's actions, disabled until the form is complete (IMG_5500, IMG_5504)
        <PhoneActions>{buttons}</PhoneActions>
      ) : (
        <div className="flex-1 flex flex-wrap items-center justify-center gap-3 py-12 w-full" data-demo-stage>
          {buttons}
        </div>
      )}
    </>
  );
}

export function ButtonOpticalAlignmentDemo() {
  const [align, setAlign] = useState<'none' | 'start'>('start');
  // Phone: a button under text starts its label where the text does once its gutter is offset, as Forgot your
  // password? under the Apple Account sign-in (IMG_5505: the title, the text, the fields and the link start 40pt
  // from the screen's edge, the link at 17pt, the large size). A soft button shows its capsule reaching past the text
  // (owner 08.11). It is as wide as its label: a full-width button centers its label, which leaves nothing to align.
  if (usePhoneRows()) {
    return (
      <>
        <div data-demo-controls style={controlsTableStyle}>
          <DemoControlRow name="opticallyAlign">
            <SegmentedControl<'none' | 'start'> value={align} onChange={setAlign} aria-label="opticallyAlign" size="xs">
              <SegmentedControl.Option value="none">none</SegmentedControl.Option>
              <SegmentedControl.Option value="start">start</SegmentedControl.Option>
            </SegmentedControl>
          </DemoControlRow>
        </div>
        <div className="flex-1 flex flex-col w-full" data-demo-stage>
          <div className="flex w-full flex-col items-start gap-4 px-6">
            <p className="text-[17px] leading-[22px] text-secondary">Sign in with your email or phone number to continue.</p>
            <Button color="secondary" variant="soft" size="xl" opticallyAlign={align === 'start' ? 'start' : undefined}>
              Forgot your password?
            </Button>
          </div>
        </div>
      </>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="border border-dashed border-alpha/20 rounded-md py-4 px-6">
        <div className="mb-2 text-secondary text-sm">Default gutters</div>
        <Button variant="ghost">Ghost button</Button>
      </div>
      <div className="border border-dashed border-alpha/20 rounded-md py-4 px-6">
        <div className="mb-2 text-secondary text-sm">{'opticallyAlign="start"'}</div>
        <Button variant="ghost" opticallyAlign="start">Ghost button</Button>
      </div>
    </div>
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
