'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Input } from '@plexui/ui/components/Input';
import { Button } from '@plexui/ui/components/Button';
import { Field } from '@plexui/ui/components/Field';
import { Switch } from '@plexui/ui/components/Switch';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Eye, EyeOff, Search } from '@plexui/ui/components/Icon';
import { FieldError } from '@plexui/ui/components/FieldError';

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

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const GUTTER_OPTIONS = ['auto', '2xs', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
type GutterOption = (typeof GUTTER_OPTIONS)[number];


export function InputSizingDemo() {
  const [username, setUsername] = useState('');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [gutterSize, setGutterSize] = useState<GutterOption>('auto');
  const [pill, setPill] = useState(false);
  const resolvedGutterSize = gutterSize === 'auto' ? undefined : gutterSize;
  const args = { size, gutterSize: resolvedGutterSize, pill };
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
        <DemoControlRow name="gutterSize">
          <SegmentedControl<GutterOption>
            value={gutterSize}
            onChange={setGutterSize}
            aria-label="gutterSize"
            size="xs"
          >
            {GUTTER_OPTIONS.map((g) => (
              <SegmentedControl.Option key={g} value={g}>
                {g}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="flex flex-col gap-2.5 justify-start items-start w-[320px]">
          <Input {...args} placeholder="Enter text..." />
          <Input
            {...args}
            placeholder="Search..."
            startAdornment={<Search className="fill-tertiary" />}
          />
          <Input
            {...args}
            value={username}
            placeholder="Username"
            onChange={(evt) => setUsername(evt.target.value)}
            maxLength={16}
            endAdornment={
              <span className="mt-[1.5px] tabular-nums text-tertiary text-[.875em]">
                {username.length}/16
              </span>
            }
          />
        </div>
      </div>
    </>
  );
}

export function InputEndAdornmentDemo() {
  const [value, setValue] = useState('Clearable value');
  const [pill, setPill] = useState(true);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
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
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <Input
            placeholder="Enter text..."
            value={value}
            onChange={(evt) => setValue(evt.target.value)}
            onClear={() => setValue('')}
            pill={pill}
            size={size}
          />
        </div>
      </div>
    </>
  );
}

export function InputCharacterCounterDemo() {
  const [username, setUsername] = useState('');
  return (
    <div className="w-[320px]">
      <Input
        placeholder="Username"
        value={username}
        onChange={(evt) => setUsername(evt.target.value)}
        maxLength={16}
        endAdornment={
          <span className="mt-[1.5px] tabular-nums text-tertiary text-[.875em]">
            {username.length}/16
          </span>
        }
      />
    </div>
  );
}

export function InputDisabledDemo() {
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <Input placeholder="Jane Doe" disabled={disabled} defaultValue="Jane Doe" />
        </div>
      </div>
    </>
  );
}

export function InputInvalidDemo() {
  const [invalid, setInvalid] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <Input placeholder="Invalid input" invalid={invalid} />
        </div>
      </div>
    </>
  );
}

export function InputAutoSelectDemo() {
  const [autoSelect, setAutoSelect] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="autoSelect" value={autoSelect} onChange={setAutoSelect} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <Input
            placeholder="Add text..."
            autoSelect={autoSelect}
            defaultValue="Toggle to auto select"
          />
        </div>
      </div>
    </>
  );
}

export function InputAutofillExtensionsDemo() {
  const [allowAutofillExtensions, setAllowAutofillExtensions] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean
          name="allowAutofillExtensions"
          value={allowAutofillExtensions}
          onChange={setAllowAutofillExtensions}
        />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <Input
            key={String(allowAutofillExtensions)}
            name="email"
            allowAutofillExtensions={allowAutofillExtensions}
            placeholder={allowAutofillExtensions ? 'Allowed' : 'Not allowed'}
          />
        </div>
      </div>
    </>
  );
}

export function InputOpticalAlignDemo() {
  const [opticallyAlign, setOpticallyAlign] = useState(true);
  const [pill, setPill] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="opticallyAlign" value={opticallyAlign} onChange={setOpticallyAlign} />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[400px]">
          <div className="border border-dashed border-alpha/20 rounded-md py-6 px-8">
            <div className="mb-5 text-secondary text-sm">
              {opticallyAlign ? 'opticallyAlign="start"' : "Default"}
            </div>
            <div className="flex flex-col gap-5">
              <Field
                label="Full name"
                opticallyAlign={opticallyAlign ? "start" : undefined}
              >
                <Input placeholder="Jane Doe" pill={pill} />
              </Field>
              <Field
                label="Email"
                description="We'll never share your email."
                errorMessage="Please enter a valid email address."
                required
                opticallyAlign={opticallyAlign ? "start" : undefined}
              >
                <Input placeholder="jane@example.com" pill={pill} />
              </Field>
            </div>
            <Button
              className="mt-6"
              color="primary"
              variant="soft"
              pill={pill}
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function InputWithButtonDemo() {
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl<'outline' | 'soft'>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            <SegmentedControl.Option value="outline">outline</SegmentedControl.Option>
            <SegmentedControl.Option value="soft">soft</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
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
      </div>
      <div data-demo-stage className="py-10">
        <div className="flex w-[320px] gap-2">
          <Input placeholder="jane.doe@gmail.com" size={size} variant={variant} />
          <Button color="primary" size={size} variant={variant} pill={false}>
            Subscribe
          </Button>
        </div>
      </div>
    </>
  );
}



// ---------------------------------------------------------------------------
// SSN mask utilities
// ---------------------------------------------------------------------------

const SSN_MASK = 'XXX-XX-XXXX';

function getSSNDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

function formatSSNValue(rawValue: string): string {
  const digits = getSSNDigits(rawValue);
  if (digits.length < 3) return digits;
  if (digits.length === 3) return `${digits}-`;
  if (digits.length < 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 5) return `${digits.slice(0, 3)}-${digits.slice(3)}-`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function getSSNMaskSuffix(formatted: string): string {
  if (formatted.length >= SSN_MASK.length) return '';
  return SSN_MASK.slice(formatted.length);
}

function splitSSNMaskSuffix(suffix: string): { before: string; highlight: string; after: string } {
  if (!suffix) return { before: '', highlight: '', after: '' };
  const match = suffix.match(/^(-?)([X]+)([\s\S]*)/);
  if (!match) return { before: suffix, highlight: '', after: '' };
  return {
    before: match[1] || '',
    highlight: match[2],
    after: match[3] || '',
  };
}

// ---------------------------------------------------------------------------
// Password with visibility toggle
// ---------------------------------------------------------------------------

export function InputPasswordToggleDemo() {
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [pill, setPill] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl<'outline' | 'soft'>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            <SegmentedControl.Option value="outline">outline</SegmentedControl.Option>
            <SegmentedControl.Option value="soft">soft</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
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
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <Input
            placeholder="Password"
            type={visible ? 'text' : 'password'}
            size={size}
            variant={variant}
            pill={pill}
            endAdornment={
              <Input.AdornmentButton
                aria-label={visible ? 'Hide' : 'Show'}
                aria-pressed={visible}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <EyeOff /> : <Eye />}
              </Input.AdornmentButton>
            }
          />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// SSN masked input
// ---------------------------------------------------------------------------

export function InputSSNDemo() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawDigits, setRawDigits] = useState('');
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [pill, setPill] = useState(false);

  // Measure actual input padding/font for overlay alignment across all sizes
  const [overlayMetrics, setOverlayMetrics] = useState({ padding: '13px', fontSize: '16px', lineHeight: '24px' });
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    setOverlayMetrics({
      padding: `calc(${cs.paddingLeft} + 1px)`,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
    });
  }, [size, pill]);

  const formatted = formatSSNValue(rawDigits);
  const masked = formatted.replace(/\d/g, '\u2022');

  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const raw = evt.target.value;
      const newDigits = getSSNDigits(raw);
      const oldDigits = rawDigits;
      // Backspace through a separator: raw got shorter but digit count unchanged
      if (raw.length < formatted.length && newDigits.length === oldDigits.length) {
        setRawDigits(oldDigits.slice(0, -1));
      } else {
        setRawDigits(newDigits);
      }
    },
    [rawDigits, formatted],
  );

  const maskSuffix = getSSNMaskSuffix(formatted);
  const showBulletOverlay = !visible && rawDigits.length > 0;
  const showMaskOverlay = focused && maskSuffix.length > 0;
  const maskParts = splitSSNMaskSuffix(maskSuffix);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl<'outline' | 'soft'>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            <SegmentedControl.Option value="outline">outline</SegmentedControl.Option>
            <SegmentedControl.Option value="soft">soft</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
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
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <div style={{ position: 'relative' }}>
            <Input
              ref={inputRef}
              placeholder={showMaskOverlay ? undefined : 'Social Security Number'}
              value={formatted}
              size={size}
              variant={variant}
              pill={pill}
              maxLength={11}
              inputMode="numeric"
              autoComplete="off"
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                ...(!visible && rawDigits
                  ? { color: 'transparent', caretColor: 'transparent' }
                  : showMaskOverlay
                    ? { caretColor: 'transparent' }
                    : undefined),
              }}
              endAdornment={
                <Input.AdornmentButton
                  aria-label={visible ? 'Hide' : 'Show'}
                  aria-pressed={visible}
                  onClick={() => setVisible((v) => !v)}
                >
                  {visible ? <EyeOff /> : <Eye />}
                </Input.AdornmentButton>
              }
            />
            {(showBulletOverlay || showMaskOverlay) && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  padding: `0 ${overlayMetrics.padding}`,
                  pointerEvents: 'none',
                  fontSize: overlayMetrics.fontSize,
                  lineHeight: overlayMetrics.lineHeight,
                  zIndex: 2,
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                  overflow: 'hidden',
                }}
              >
                {showBulletOverlay ? (
                  <span style={{ whiteSpace: 'pre' }}>{masked}</span>
                ) : (
                  <span style={{ visibility: 'hidden', whiteSpace: 'pre' }}>
                    {formatted}
                  </span>
                )}
                {showMaskOverlay && (
                  <>
                    {maskParts.before && (
                      <span style={{ color: 'var(--color-text-tertiary)', whiteSpace: 'pre' }}>
                        {maskParts.before}
                      </span>
                    )}
                    {maskParts.highlight && (
                      <span
                        style={{
                          backgroundColor: 'var(--color-background-primary-solid)',
                          color: 'white',
                          whiteSpace: 'pre',
                          borderRadius: '3px',
                          padding: '1px 1px',
                        }}
                      >
                        {maskParts.highlight}
                      </span>
                    )}
                    {maskParts.after && (
                      <span style={{ color: 'var(--color-text-tertiary)', whiteSpace: 'pre' }}>
                        {maskParts.after}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


// ---------------------------------------------------------------------------
// Birthday mask utilities
// ---------------------------------------------------------------------------

const BIRTHDAY_MASK = 'MM / DD / YYYY';

function getBirthdayDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

function formatBirthdayValue(rawValue: string): string {
  const digits = getBirthdayDigits(rawValue);
  const month = digits.slice(0, 2);
  const day = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (digits.length < 2) return month;
  if (digits.length === 2) return `${month} / `;
  if (digits.length < 4) return `${month} / ${day}`;
  if (digits.length === 4) return `${month} / ${day} / `;
  return `${month} / ${day} / ${year}`;
}

function getBirthdayMaskSuffix(formattedValue: string): string {
  if (formattedValue.length >= BIRTHDAY_MASK.length) return '';
  return BIRTHDAY_MASK.slice(formattedValue.length);
}

function splitBirthdayMaskSuffix(suffix: string): { before: string; highlight: string; after: string } {
  if (!suffix) return { before: '', highlight: '', after: '' };
  const match = suffix.match(/^(\s*\/\s*)?([A-Z]+)([\s\S]*)/);
  if (!match) return { before: suffix, highlight: '', after: '' };
  return {
    before: match[1] || '',
    highlight: match[2],
    after: match[3] || '',
  };
}

function isValidBirthday(value: string): boolean {
  const parsed = value.match(/^(\d{2})\s\/\s(\d{2})\s\/\s(\d{4})$/);
  if (!parsed) return false;
  const month = Number(parsed[1]);
  const day = Number(parsed[2]);
  const year = Number(parsed[3]);
  if (month < 1 || month > 12) return false;
  const maxDay = new Date(year, month, 0).getDate();
  return day >= 1 && day <= maxDay;
}

// ---------------------------------------------------------------------------
// Birthday masked input (internal component)
// ---------------------------------------------------------------------------

function InputBirthdayMaskedInput({
  size,
  variant,
  pill,
  value,
  onChange,
  invalid,
}: {
  size: (typeof SIZE_OPTIONS)[number];
  variant: 'outline' | 'soft';
  pill: boolean;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // Measure actual input padding/font for overlay alignment across all sizes
  const [overlayMetrics, setOverlayMetrics] = useState({ padding: '13px', fontSize: '16px', lineHeight: '24px' });
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    setOverlayMetrics({
      padding: `calc(${cs.paddingLeft} + 1px)`,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
    });
  }, [size, pill]);

  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const raw = evt.target.value;
      const newDigits = getBirthdayDigits(raw);
      const oldDigits = getBirthdayDigits(value);
      // Backspace through a separator: raw got shorter but digit count unchanged
      if (raw.length < value.length && newDigits.length === oldDigits.length) {
        const trimmed = newDigits.slice(0, -1);
        onChange(formatBirthdayValue(trimmed));
      } else {
        onChange(formatBirthdayValue(raw));
      }
    },
    [onChange, value],
  );

  const maskSuffix = getBirthdayMaskSuffix(value);
  const showMask = focused && maskSuffix.length > 0;
  const maskParts = splitBirthdayMaskSuffix(maskSuffix);

  return (
    <div style={{ position: 'relative' }}>
      <Input
        ref={inputRef}
        placeholder={showMask ? undefined : 'Birthday (MM / DD / YYYY)'}
        value={value}
        size={size}
        variant={variant}
        pill={pill}
        maxLength={14}
        inputMode="numeric"
        autoComplete="off"
        invalid={invalid}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={showMask ? { caretColor: 'transparent' } : undefined}
      />
      {showMask && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${overlayMetrics.padding}`,
            pointerEvents: 'none',
            fontSize: overlayMetrics.fontSize,
            lineHeight: overlayMetrics.lineHeight,
            zIndex: 2,
                  overflow: 'hidden',
          }}
        >
          {/* Invisible spacer matching width of typed text */}
          <span style={{ visibility: 'hidden', whiteSpace: 'pre' }}>
            {value}
          </span>
          {maskParts.before && (
            <span style={{ color: 'var(--color-text-tertiary)', whiteSpace: 'pre' }}>
              {maskParts.before}
            </span>
          )}
          {maskParts.highlight && (
            <span
              style={{
                backgroundColor: 'var(--color-background-primary-solid)',
                color: 'white',
                whiteSpace: 'pre',
                borderRadius: '3px',
                padding: '1px 1px',
              }}
            >
              {maskParts.highlight}
            </span>
          )}
          {maskParts.after && (
            <span style={{ color: 'var(--color-text-tertiary)', whiteSpace: 'pre' }}>
              {maskParts.after}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Birthday input demo
// ---------------------------------------------------------------------------

export function InputBirthdayDemo() {
  const [birthday, setBirthday] = useState('');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [pill, setPill] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl<'outline' | 'soft'>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            <SegmentedControl.Option value="outline">outline</SegmentedControl.Option>
            <SegmentedControl.Option value="soft">soft</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
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
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <InputBirthdayMaskedInput
            size={size}
            variant={variant}
            pill={pill}
            value={birthday}
            onChange={setBirthday}
          />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Birthday with validation demo
// ---------------------------------------------------------------------------

export function InputBirthdayValidationDemo() {
  const [birthday, setBirthday] = useState('02 / 30 / 2001');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [pill, setPill] = useState(false);
  const errorMessage = birthday ? (isValidBirthday(birthday) ? undefined : 'Please enter a valid date.') : undefined;
  const errorId = 'input-birthday-validation-demo-error';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl<'outline' | 'soft'>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            <SegmentedControl.Option value="outline">outline</SegmentedControl.Option>
            <SegmentedControl.Option value="soft">soft</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
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
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <div className="flex flex-col gap-1.5">
            <InputBirthdayMaskedInput
              size={size}
              variant={variant}
              pill={pill}
              value={birthday}
              onChange={setBirthday}
              invalid={!!errorMessage}
            />
            {errorMessage && <FieldError id={errorId}>{errorMessage}</FieldError>}
          </div>
        </div>
      </div>
    </>
  );
}
