'use client';

import React, { useId, useMemo, useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Switch } from '@plexui/ui/components/Switch';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Select } from '@plexui/ui/components/Select';
import { Mail, ArrowRight } from '@plexui/ui/components/Icon';
import { useDemoControlSync } from './PreviewEmbed';
import { useDesktopOnlyState, usePhoneRows } from './PhoneRows';

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
// Area: small 28 (3xs to sm), medium 34 (md, lg) and large 50 (xl to 3xl), always a capsule, so the phone offers
// those three sizes; and the colors of iOS buttons: accent (primary), gray (a soft secondary) and destructive (danger).
const PHONE_SIZE_OPTIONS: readonly (typeof SIZE_OPTIONS)[number][] = ['sm', 'md', 'xl'];
const PHONE_COLOR_OPTIONS: readonly (typeof COLOR_OPTIONS)[number][] = ['primary', 'secondary', 'danger'];

/** A phone screen's action stands at the top of the screen, next to the example's controls, not at its foot as iOS
    pins it (owner 08.11); a screen's actions stack 11px apart (IMG_5432, IMG_5516). */
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
const ICON_OPTIONS = ['none', 'start', 'end', 'only'] as const;

/**
 * The Overview, one button with every setting of a button: what the page's examples once showed one by one (Colors &
 * variants, Sizing & roundness, Icons, Block, States, Selected) are its settings (owner 11.11: «в первом примере можно
 * сразу показать все со всеми настройками»). `icon` is not a prop: it places the icon among the children, before the
 * label, after it, or alone with an `aria-label`. A setting shows only where it acts: `uniform` with an icon alone,
 * `gutterSize` where `uniform` does not replace it, `iconSize` with an icon. On a phone (touch.css) a button is a
 * capsule of one of the three heights of iOS buttons in accent, gray or destructive, so `pill`, `uniform`,
 * `gutterSize` and `selected` stay on the desktop, and the phone sizes are those three; a setting that is not offered
 * gives its default, as the Vue demo's hidden controls do.
 */
export function ButtonOverviewDemo() {
  const phone = usePhoneRows();
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('primary');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('solid');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [, setPill, pill] = useDesktopOnlyState(false);
  const [icon, setIcon] = useState<(typeof ICON_OPTIONS)[number]>('none');
  const [, setUniform, shownUniform] = useDesktopOnlyState(false);
  const [iconSize, setIconSize] = useState<(typeof OPTIONAL_ICON_SIZE_OPTIONS)[number]>('auto');
  const [, setGutterSize, shownGutterSize] = useDesktopOnlyState<(typeof OPTIONAL_SIZE_OPTIONS)[number]>('auto');
  const [block, setBlock] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setSelected, selected] = useDesktopOnlyState(false);
  // A value the phone does not offer shows as the default there
  const colorOptions = phone ? PHONE_COLOR_OPTIONS : COLOR_OPTIONS;
  const sizeOptions = phone ? PHONE_SIZE_OPTIONS : SIZE_OPTIONS;
  const shownColor = colorOptions.includes(color) ? color : 'primary';
  const shownSize = sizeOptions.includes(size) ? size : 'md';
  const uniform = icon === 'only' && shownUniform;
  const gutterSize = uniform ? 'auto' : shownGutterSize;
  const shownIconSize = icon === 'none' ? 'auto' : iconSize;
  const button = (
    <Button
      color={shownColor}
      variant={variant}
      size={shownSize}
      pill={pill}
      uniform={uniform}
      gutterSize={gutterSize === 'auto' ? undefined : gutterSize}
      iconSize={shownIconSize === 'auto' ? undefined : shownIconSize}
      block={block}
      disabled={disabled}
      loading={loading}
      selected={selected}
      aria-label={icon === 'only' ? 'Send' : undefined}
    >
      {(icon === 'start' || icon === 'only') && <Mail />}
      {icon !== 'only' && 'Send'}
      {icon === 'end' && <ArrowRight />}
    </Button>
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="color" options={colorOptions} value={shownColor} onChange={setColor} syncValue={color} />
        <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />
        <DemoControlSelect name="size" options={sizeOptions} value={shownSize} onChange={setSize} syncValue={size} />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />
        <Segments name="icon" options={ICON_OPTIONS} value={icon} onChange={setIcon} />
        {icon === 'only' && <DemoControlBoolean name="uniform" value={shownUniform} onChange={setUniform} desktopOnly />}
        {icon !== 'none' && <DemoControlSelect name="iconSize" options={OPTIONAL_ICON_SIZE_OPTIONS} value={iconSize} onChange={setIconSize} />}
        {!uniform && <DemoControlSelect name="gutterSize" options={OPTIONAL_SIZE_OPTIONS} value={shownGutterSize} onChange={setGutterSize} desktopOnly />}
        <DemoControlBoolean name="block" value={block} onChange={setBlock} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
        <DemoControlBoolean name="selected" value={selected} onChange={setSelected} desktopOnly />
      </div>
      {phone ? (
        // Phone: a screen's action, the large button as wide as the screen with xl and block (IMG_5432 Continue)
        <PhoneActions>{button}</PhoneActions>
      ) : (
        // Desktop: a block button fills the width of a 290px column
        <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
          <div className="flex w-[290px] justify-center">{button}</div>
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
