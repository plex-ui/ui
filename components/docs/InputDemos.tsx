'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@plexui/ui/components/Input';
import { Button } from '@plexui/ui/components/Button';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Eye, EyeOff } from '@plexui/ui/components/Icon';
import { FieldError } from '@plexui/ui/components/FieldError';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow, Segments } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const GUTTER_OPTIONS = ['auto', '2xs', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
type GutterOption = (typeof GUTTER_OPTIONS)[number];

// On a phone an input is the value of a grouped row, as in the Form Examples: the row
// sets its height, insets and type, so size, gutterSize, pill and variant stay on the web.
function PhoneCounter({ length }: { length: number }) {
  return <span className="tabular-nums text-secondary">{length}/16</span>;
}

const OVERVIEW_VARIANTS = ['outline', 'soft', 'ghost'] as const;
const ADORNMENT_OPTIONS = ['none', 'start', 'end'] as const;
const ALIGN_OPTIONS = ['none', 'start', 'end'] as const;
const ORIENTATION_OPTIONS = ['horizontal', 'vertical'] as const;
const USERNAME_ERROR = 'This username is taken.';

/**
 * The Overview, one username field with every setting of an input: what the page's examples once showed one by one
 * (Variants, Adornments, Clear button, Sizing & roundness, Behavior, Optical alignment) are its settings (owner 11.11:
 * «в первом примере можно сразу показать все со всеми настройками»). `adornment` is not a prop: it puts an `@` before
 * the value (`startAdornment`) or a counter after it (`endAdornment`); `clearable` passes `onClear`. On a desktop the
 * field stands under a `Field` label, the content `opticallyAlign` lines its text up with. On a phone the input is the
 * value of a grouped row, which sets its height, insets and type, so `variant`, `size`, `gutterSize`, `pill`,
 * `opticallyAlign` and `allowAutofillExtensions` stay on the desktop; the row puts its value at its end, at one column
 * (`columns`) or under its label (`orientation`), and shows an error as its `errorMessage`. A setting that is not
 * offered gives its default, as the Vue demo's hidden controls do.
 */
export function InputOverviewDemo() {
  const phone = usePhoneRows();
  const [value, setValue] = useState('janeappleseed');
  const [variant, setVariant] = useState<(typeof OVERVIEW_VARIANTS)[number]>('outline');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [gutterSize, setGutterSize] = useState<GutterOption>('auto');
  const [pill, setPill] = useState(false);
  const [adornment, setAdornment] = useState<(typeof ADORNMENT_OPTIONS)[number]>('none');
  const [clearable, setClearable] = useState(false);
  const [opticallyAlign, setOpticallyAlign] = useState<(typeof ALIGN_OPTIONS)[number]>('none');
  const [autoSelect, setAutoSelect] = useState(false);
  const [allowAutofillExtensions, setAllowAutofillExtensions] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [orientation, setOrientation] = useState<(typeof ORIENTATION_OPTIONS)[number]>('horizontal');
  const [columns, setColumns] = useState(false);
  const vertical = orientation === 'vertical';
  const shared = {
    name: 'username',
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
    onClear: clearable ? () => setValue('') : undefined,
    maxLength: 16,
    autoSelect,
    readOnly,
    disabled,
    invalid,
  };
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={OVERVIEW_VARIANTS} value={variant} onChange={setVariant} desktopOnly />
        <Segments name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} desktopOnly />
        <Segments name="gutterSize" options={GUTTER_OPTIONS} value={gutterSize} onChange={setGutterSize} desktopOnly />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />
        <Segments name="orientation" options={ORIENTATION_OPTIONS} value={orientation} onChange={setOrientation} phoneOnly />
        {!vertical && <DemoControlBoolean name="columns" value={columns} onChange={setColumns} phoneOnly />}
        <Segments name="adornment" options={ADORNMENT_OPTIONS} value={adornment} onChange={setAdornment} />
        <DemoControlBoolean name="clearable" value={clearable} onChange={setClearable} />
        <Segments name="opticallyAlign" options={ALIGN_OPTIONS} value={opticallyAlign} onChange={setOpticallyAlign} desktopOnly />
        <DemoControlBoolean name="autoSelect" value={autoSelect} onChange={setAutoSelect} />
        <DemoControlBoolean name="allowAutofillExtensions" value={allowAutofillExtensions} onChange={setAllowAutofillExtensions} desktopOnly />
        <DemoControlBoolean name="readOnly" value={readOnly} onChange={setReadOnly} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      {phone ? (
        <PhoneRowsStage>
          <FieldGroup columns={!vertical && columns}>
            <Field row orientation={orientation} label="Username" errorMessage={invalid ? USERNAME_ERROR : undefined}>
              {/* A phone has no autofill extensions setting: its field takes the default, as the phone code does */}
              <Input
                {...shared}
                variant={vertical ? 'ghost' : undefined}
                placeholder="Required"
                startAdornment={adornment === 'start' ? <span className="text-secondary">@</span> : undefined}
                endAdornment={adornment === 'end' ? <PhoneCounter length={value.length} /> : undefined}
              />
            </Field>
          </FieldGroup>
        </PhoneRowsStage>
      ) : (
        <div data-demo-stage className="py-10">
          <div className="w-[320px]">
            <Field label="Username" errorMessage={invalid ? USERNAME_ERROR : undefined}>
              <Input
                // The extensions are let in, or kept out, as the field mounts
                key={String(allowAutofillExtensions)}
                {...shared}
                variant={variant}
                size={size}
                gutterSize={gutterSize === 'auto' ? undefined : gutterSize}
                pill={pill}
                opticallyAlign={opticallyAlign === 'none' ? undefined : opticallyAlign}
                allowAutofillExtensions={allowAutofillExtensions}
                placeholder="Choose a username"
                startAdornment={adornment === 'start' ? <span className="text-tertiary">@</span> : undefined}
                endAdornment={
                  adornment === 'end' ? (
                    <span className="mt-[1.5px] tabular-nums text-tertiary text-[.875em]">{value.length}/16</span>
                  ) : undefined
                }
              />
            </Field>
          </div>
        </div>
      )}
    </>
  );
}

export function InputWithButtonDemo() {
  const phone = usePhoneRows();
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup>
          <Field row label="Email">
            <Input type="email" placeholder="jane.doe@gmail.com" />
          </Field>
        </FieldGroup>
        <Button color="primary" size="3xl" pill block>
          Subscribe
        </Button>
      </PhoneRowsStage>
    );
  }
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
  const phone = usePhoneRows();
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [pill, setPill] = useState(false);
  const toggle = (
    <Input.AdornmentButton
      aria-label={visible ? 'Hide' : 'Show'}
      aria-pressed={visible}
      onClick={() => setVisible((v) => !v)}
    >
      {visible ? <EyeOff /> : <Eye />}
    </Input.AdornmentButton>
  );
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup>
          <Field row label="Password">
            <Input placeholder="Required" type={visible ? 'text' : 'password'} endAdornment={toggle} />
          </Field>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
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
            endAdornment={toggle}
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
  const phone = usePhoneRows();
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

  if (phone) {
    // A row is the input's frame, so the phone field formats as you type and hides as a
    // secure field: the overlay of the web needs a wrapper the row cannot frame.
    return (
      <PhoneRowsStage>
        <FieldGroup>
          <Field row label="SSN">
            <Input
              placeholder="XXX-XX-XXXX"
              value={formatted}
              type={visible ? 'text' : 'password'}
              maxLength={11}
              inputMode="numeric"
              autoComplete="off"
              allowAutofillExtensions={false}
              onChange={handleChange}
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
          </Field>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }

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

/** The phone row: formatting as you type and the pattern as the placeholder, as in the Form Examples. */
function PhoneBirthdayRow({ value, onChange, errorMessage }: { value: string; onChange: (value: string) => void; errorMessage?: string }) {
  return (
    <Field row label="Birthday" errorMessage={errorMessage}>
      <Input
        placeholder="MM / DD / YYYY"
        value={value}
        maxLength={14}
        inputMode="numeric"
        autoComplete="bday"
        invalid={!!errorMessage}
        onChange={(evt) => {
          const raw = evt.target.value;
          const digits = getBirthdayDigits(raw);
          onChange(formatBirthdayValue(raw.length < value.length && digits.length === getBirthdayDigits(value).length ? digits.slice(0, -1) : raw));
        }}
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Birthday input demo
// ---------------------------------------------------------------------------

export function InputBirthdayDemo() {
  const phone = usePhoneRows();
  const [birthday, setBirthday] = useState('');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [pill, setPill] = useState(false);
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup>
          <PhoneBirthdayRow value={birthday} onChange={setBirthday} />
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
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
  const phone = usePhoneRows();
  const [birthday, setBirthday] = useState('02 / 30 / 2001');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [pill, setPill] = useState(false);
  const errorMessage = birthday ? (isValidBirthday(birthday) ? undefined : 'Please enter a valid date.') : undefined;
  const errorId = 'input-birthday-validation-demo-error';
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup>
          <PhoneBirthdayRow value={birthday} onChange={setBirthday} errorMessage={errorMessage} />
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
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
