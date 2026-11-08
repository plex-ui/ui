'use client';
import React, { useCallback, useId, useRef, useState } from 'react';
import Image from 'next/image';
import countryLabelStyles from './CountryLabel.module.css';
import { PhoneCountryLabel } from './PhoneCountryLabel';
import { FloatingLabelInput } from '@plexui/ui/components/FloatingLabelInput';
import { FloatingLabelSelect } from '@plexui/ui/components/FloatingLabelSelect';

import { Select, type Option } from '@plexui/ui/components/Select';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Button } from '@plexui/ui/components/Button';
import { FieldError } from '@plexui/ui/components/FieldError';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Input } from '@plexui/ui/components/Input';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { ChevronDown } from '@plexui/ui/components/Icon';
import { AuthFormStage } from './AuthFormStage';
import { AuthInput } from './AuthInput';
import { AuthFields } from './AuthFields';
import { AuthLegalNotice } from './AuthLegalNotice';
import authFieldsStyles from './AuthFields.module.css';
import { FormScreen } from './FormRowsDemos';
import { COUNTRY_LOOKUP, COUNTRY_OPTIONS } from './PhoneInputDemos';
import { usePhoneViewport } from './PreviewEmbed';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
// ---------------------------------------------------------------------------
// Birthday mask utilities
// ---------------------------------------------------------------------------

const MASK = 'MM / DD / YYYY';

/**
 * Extract raw digits from a formatted birthday string.
 */
function getDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

/**
 * Format raw digits into "MM / DD / YYYY" with partial support.
 * When a segment is complete (2 digits for month, 4 for month+day),
 * the trailing separator is included so the cursor advances past it.
 */
function formatBirthdayValue(rawValue: string): string {
  const digits = getDigits(rawValue);
  const month = digits.slice(0, 2);
  const day = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (digits.length < 2) return month;
  if (digits.length === 2) return `${month} / `;
  if (digits.length < 4) return `${month} / ${day}`;
  if (digits.length === 4) return `${month} / ${day} / `;
  return `${month} / ${day} / ${year}`;
}

/**
 * Build the visible mask suffix that appears after the typed text.
 * E.g. typed "12" -> value is "12 / " -> mask suffix is "DD / YYYY"
 *      typed "1"  -> value is "1"     -> mask suffix is "M / DD / YYYY"
 */
function getMaskSuffix(formattedValue: string): string {
  if (formattedValue.length >= MASK.length) return '';
  return MASK.slice(formattedValue.length);
}


/**
 * Split mask suffix into three parts for segment-based highlighting:
 * - before: separator text before the active segment (gray)
 * - highlight: the active/next segment placeholder chars (blue bg)
 * - after: remaining mask text after the active segment (gray)
 *
 * E.g. suffix " / DD / YYYY" => { before: " / ", highlight: "DD", after: " / YYYY" }
 *      suffix "M / DD / YYYY"  => { before: "", highlight: "M", after: " / DD / YYYY" }
 *      suffix "YYY"            => { before: "", highlight: "YYY", after: "" }
 */
function splitMaskSuffix(suffix: string): { before: string; highlight: string; after: string } {
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
// SSN mask utilities
// ---------------------------------------------------------------------------

const SSN_MASK = 'XXX-XX-XXXX';

type FormSubmitEvent = { preventDefault: () => void };

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
// SSNMaskedInput — FloatingLabelInput + SSN formatting + value masking + toggle
// ---------------------------------------------------------------------------

function SSNMaskedInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawDigits, setRawDigits] = useState('');
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

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
    <div style={{ position: 'relative' }}>
      <FloatingLabelInput
        ref={inputRef}
        label="Social Security Number"
        value={formatted}
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
        revealable
        onRevealedChange={setVisible}
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
            padding: '0 calc(var(--floating-input-gutter) + 1px)',
            pointerEvents: 'none',
            font: 'inherit',
            fontSize: '1rem',
            lineHeight: '1.5rem',
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
  );
}

// ---------------------------------------------------------------------------
// BirthdayMaskedInput - FloatingLabelInput + OpenAI-style inline mask
// ---------------------------------------------------------------------------

function BirthdayMaskedInput({
  value,
  onChange,
  invalid,
  disabled,
  className,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  'aria-describedby'?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const raw = evt.target.value;
      const newDigits = getDigits(raw);
      const oldDigits = getDigits(value);
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

  const maskSuffix = getMaskSuffix(value);
  const showMask = focused && maskSuffix.length > 0;
  const maskParts = splitMaskSuffix(maskSuffix);
  return (
    <div style={{ position: 'relative' }}>
      <FloatingLabelInput
        ref={inputRef}
        label="Birthday"
        value={value}
        className={className}
        disabled={disabled}
        maxLength={14}
        inputMode="numeric"
        invalid={invalid}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={showMask ? { caretColor: 'transparent' } : undefined}
        {...rest}
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
            padding: '0 calc(var(--floating-input-gutter) + 1px)',
            pointerEvents: 'none',
            font: 'inherit',
            fontSize: '1rem',
            lineHeight: '1.5rem',
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          {/* Invisible spacer matching width of typed text */}
          <span style={{ visibility: 'hidden', whiteSpace: 'pre' }}>
            {value}
          </span>
          {/* Separator before the active segment (gray) */}
          {maskParts.before && (
            <span style={{ color: 'var(--color-text-tertiary)', whiteSpace: 'pre' }}>
              {maskParts.before}
            </span>
          )}
          {/* Active segment placeholder (accent highlight) */}
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
          {/* Remaining mask text after active segment (gray) */}
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
// Exported demos
// ---------------------------------------------------------------------------
export function FloatingLabelInputTextareaDemo() {
  const [multiline, setMultiline] = useState(true);
  const [value, setValue] = useState('');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="multiline">
          <SegmentedControl<'true' | 'false'>
            value={multiline ? 'true' : 'false'}
            onChange={(v) => setMultiline(v === 'true')}
            aria-label="multiline"
            size="xs"
          >
            <SegmentedControl.Option value="true">true</SegmentedControl.Option>
            <SegmentedControl.Option value="false">false</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[360px]">
          <FloatingLabelInput
            key={String(multiline)}
            label="Message"
            multiline={multiline}
            value={value}
            onChange={(evt) => setValue(evt.target.value)}
          />
        </div>
      </div>
    </>
  );
}

export function FloatingLabelInputWithClearButtonDemoWithControls() {
  const [value, setValue] = useState('clearable@example.com');
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="readOnly" value={readOnly} onChange={setReadOnly} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[360px]">
          <FloatingLabelInput
            label="Email address"
            value={value}
            onChange={(evt) => setValue(evt.target.value)}
            onClear={() => setValue('')}
            disabled={disabled}
            readOnly={readOnly}
          />
        </div>
      </div>
    </>
  );
}
type FloatingLabelValuePreset = 'empty' | 'filled' | 'custom';

export function FloatingLabelInputStatesDemo() {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [errorMessage, setErrorMessage] = useState(false);
  const [description, setDescription] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const preset: FloatingLabelValuePreset = value === '' ? 'empty' : value === 'jane.doe@example.com' ? 'filled' : 'custom';
  const applyPreset = (next: FloatingLabelValuePreset) => {
    if (next !== 'custom') setValue(next === 'filled' ? 'jane.doe@example.com' : '');
  };

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="preset">
          <SegmentedControl<FloatingLabelValuePreset> value={preset} onChange={applyPreset} aria-label="preset" size="xs">
            <SegmentedControl.Option value="empty">Empty</SegmentedControl.Option>
            <SegmentedControl.Option value="filled">Filled</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
        <DemoControlBoolean name="errorMessage" value={errorMessage} onChange={setErrorMessage} />
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="readOnly" value={readOnly} onChange={setReadOnly} />
      </div>
      <div data-demo-stage className="py-10 w-full flex justify-center">
        <div className="w-full min-w-0 max-w-[360px]">
          <FloatingLabelInput
            label="Email address"
            value={value}
            onChange={(evt) => setValue(evt.target.value)}
            invalid={invalid || errorMessage}
            errorMessage={errorMessage ? 'Email is not valid.' : undefined}
            description={description ? "We'll never share your email with anyone else." : undefined}
            disabled={disabled}
            readOnly={readOnly}
          />
        </div>
      </div>
    </>
  );
}
export function FloatingLabelInputSSNDemo() {
  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <SSNMaskedInput />
      </div>
    </div>
  );
}
export function FloatingLabelInputBirthdayDemo() {
  const [birthday, setBirthday] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const preset: FloatingLabelValuePreset = birthday === '' ? 'empty' : birthday === '01 / 15 / 1995' ? 'filled' : 'custom';
  const applyPreset = (next: FloatingLabelValuePreset) => {
    if (next !== 'custom') setBirthday(next === 'filled' ? '01 / 15 / 1995' : '');
  };

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="preset">
          <SegmentedControl<FloatingLabelValuePreset> value={preset} onChange={applyPreset} aria-label="preset" size="xs">
            <SegmentedControl.Option value="empty">Empty</SegmentedControl.Option>
            <SegmentedControl.Option value="filled">Filled</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="readOnly" value={readOnly} onChange={setReadOnly} />
      </div>
      <div data-demo-stage className="py-10 w-full flex justify-center">
        <div className="w-full min-w-0 max-w-[360px]">
          <BirthdayMaskedInput
            value={birthday}
            onChange={setBirthday}
            invalid={invalid}
            disabled={disabled}
            readOnly={readOnly}
          />
        </div>
      </div>
    </>
  );
}
export function FloatingLabelInputBirthdayValidationDemo() {
  const [birthday, setBirthday] = useState('02 / 30 / 2001');
  const errorMessage = birthday ? (isValidBirthday(birthday) ? undefined : 'Please enter a valid date.') : undefined;
  const errorId = 'birthday-validation-demo-error';

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <div className="flex flex-col gap-1.5">
          <BirthdayMaskedInput
            value={birthday}
            onChange={setBirthday}
            invalid={!!errorMessage}
            aria-describedby={errorMessage ? errorId : undefined}
          />
          {errorMessage && <FieldError id={errorId}>{errorMessage}</FieldError>}
        </div>
      </div>
    </div>
  );
}

export function FloatingLabelInputAboutYouFormDemo() {
  const [fullName, setFullName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [birthdayError, setBirthdayError] = useState<string | null>(null);
  const birthdayFieldId = useId();
  const handleSubmit = (evt: FormSubmitEvent) => {
    evt.preventDefault();
    if (!birthday) {
      setBirthdayError('Birthday is required.');
      return;
    }
    if (!isValidBirthday(birthday)) {
      setBirthdayError('Please enter a valid date.');
      return;
    }
    setBirthdayError(null);
  };

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[320px]">
        <div className="mb-6">
          <h3 data-auth-title className="text-2xl font-semibold tracking-tight">Tell us about you</h3>
          <p data-auth-description className="text-secondary text-sm mt-1">This helps us customize your experience.</p>
        </div>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <FloatingLabelInput
            label="Full name"
            value={fullName}
            onChange={(evt) => setFullName(evt.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <BirthdayMaskedInput
              value={birthday}
              onChange={(val) => {
                setBirthday(val);
                setBirthdayError(null);
              }}
              invalid={!!birthdayError}
              aria-describedby={birthdayError ? birthdayFieldId : undefined}
            />
            {birthdayError && <FieldError id={birthdayFieldId}>{birthdayError}</FieldError>}
          </div>
          <p className="text-xs text-center text-tertiary mt-3">
            By clicking &ldquo;Continue&rdquo;, you agree to our{' '}
            <span className="underline">Terms</span> and have read our{' '}
            <span className="underline">Privacy Policy</span>.
          </p>
          <Button color="primary" size="3xl" type="submit" className="h-[3.25rem]">Continue</Button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlagIcon — SVG flags from lipis/flag-icons CDN (matching PhoneInputDemos)
// ---------------------------------------------------------------------------
function FlagIcon({ code }: { code: string }) {
  return (
    <span
      style={{
        display: 'block',
        height: 16,
        aspectRatio: '4 / 3',
        borderRadius: 2,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <Image
        src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.5.0/flags/4x3/${code}.svg`}
        alt=""
        width={64}
        height={48}
        unoptimized
        loading="lazy"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Country select data (full list matching PhoneInputDemos)
// ---------------------------------------------------------------------------
const COUNTRIES: { value: string; label: string }[] = [
  { value: 'af', label: 'Afghanistan' },
  { value: 'al', label: 'Albania' },
  { value: 'dz', label: 'Algeria' },
  { value: 'as', label: 'American Samoa' },
  { value: 'ad', label: 'Andorra' },
  { value: 'ao', label: 'Angola' },
  { value: 'ai', label: 'Anguilla' },
  { value: 'ag', label: 'Antigua and Barbuda' },
  { value: 'ar', label: 'Argentina' },
  { value: 'am', label: 'Armenia' },
  { value: 'aw', label: 'Aruba' },
  { value: 'au', label: 'Australia' },
  { value: 'at', label: 'Austria' },
  { value: 'az', label: 'Azerbaijan' },
  { value: 'bs', label: 'Bahamas' },
  { value: 'bh', label: 'Bahrain' },
  { value: 'bd', label: 'Bangladesh' },
  { value: 'bb', label: 'Barbados' },
  { value: 'by', label: 'Belarus' },
  { value: 'be', label: 'Belgium' },
  { value: 'bz', label: 'Belize' },
  { value: 'bj', label: 'Benin' },
  { value: 'bm', label: 'Bermuda' },
  { value: 'bt', label: 'Bhutan' },
  { value: 'bo', label: 'Bolivia' },
  { value: 'ba', label: 'Bosnia and Herzegovina' },
  { value: 'bw', label: 'Botswana' },
  { value: 'br', label: 'Brazil' },
  { value: 'bn', label: 'Brunei' },
  { value: 'bg', label: 'Bulgaria' },
  { value: 'bf', label: 'Burkina Faso' },
  { value: 'bi', label: 'Burundi' },
  { value: 'kh', label: 'Cambodia' },
  { value: 'cm', label: 'Cameroon' },
  { value: 'ca', label: 'Canada' },
  { value: 'cv', label: 'Cape Verde' },
  { value: 'ky', label: 'Cayman Islands' },
  { value: 'cf', label: 'Central African Republic' },
  { value: 'td', label: 'Chad' },
  { value: 'cl', label: 'Chile' },
  { value: 'cn', label: 'China' },
  { value: 'co', label: 'Colombia' },
  { value: 'km', label: 'Comoros' },
  { value: 'cg', label: 'Congo' },
  { value: 'cd', label: 'Congo (DRC)' },
  { value: 'ck', label: 'Cook Islands' },
  { value: 'cr', label: 'Costa Rica' },
  { value: 'ci', label: "C\u00f4te d'Ivoire" },
  { value: 'hr', label: 'Croatia' },
  { value: 'cu', label: 'Cuba' },
  { value: 'cw', label: 'Cura\u00e7ao' },
  { value: 'cy', label: 'Cyprus' },
  { value: 'cz', label: 'Czech Republic' },
  { value: 'dk', label: 'Denmark' },
  { value: 'dj', label: 'Djibouti' },
  { value: 'dm', label: 'Dominica' },
  { value: 'do', label: 'Dominican Republic' },
  { value: 'ec', label: 'Ecuador' },
  { value: 'eg', label: 'Egypt' },
  { value: 'sv', label: 'El Salvador' },
  { value: 'gq', label: 'Equatorial Guinea' },
  { value: 'er', label: 'Eritrea' },
  { value: 'ee', label: 'Estonia' },
  { value: 'sz', label: 'Eswatini' },
  { value: 'et', label: 'Ethiopia' },
  { value: 'fk', label: 'Falkland Islands' },
  { value: 'fo', label: 'Faroe Islands' },
  { value: 'fj', label: 'Fiji' },
  { value: 'fi', label: 'Finland' },
  { value: 'fr', label: 'France' },
  { value: 'gf', label: 'French Guiana' },
  { value: 'pf', label: 'French Polynesia' },
  { value: 'ga', label: 'Gabon' },
  { value: 'gm', label: 'Gambia' },
  { value: 'ge', label: 'Georgia' },
  { value: 'de', label: 'Germany' },
  { value: 'gh', label: 'Ghana' },
  { value: 'gi', label: 'Gibraltar' },
  { value: 'gr', label: 'Greece' },
  { value: 'gl', label: 'Greenland' },
  { value: 'gd', label: 'Grenada' },
  { value: 'gp', label: 'Guadeloupe' },
  { value: 'gu', label: 'Guam' },
  { value: 'gt', label: 'Guatemala' },
  { value: 'gn', label: 'Guinea' },
  { value: 'gw', label: 'Guinea-Bissau' },
  { value: 'gy', label: 'Guyana' },
  { value: 'ht', label: 'Haiti' },
  { value: 'hn', label: 'Honduras' },
  { value: 'hk', label: 'Hong Kong' },
  { value: 'hu', label: 'Hungary' },
  { value: 'is', label: 'Iceland' },
  { value: 'in', label: 'India' },
  { value: 'id', label: 'Indonesia' },
  { value: 'ir', label: 'Iran' },
  { value: 'iq', label: 'Iraq' },
  { value: 'ie', label: 'Ireland' },
  { value: 'il', label: 'Israel' },
  { value: 'it', label: 'Italy' },
  { value: 'jm', label: 'Jamaica' },
  { value: 'jp', label: 'Japan' },
  { value: 'jo', label: 'Jordan' },
  { value: 'kz', label: 'Kazakhstan' },
  { value: 'ke', label: 'Kenya' },
  { value: 'ki', label: 'Kiribati' },
  { value: 'xk', label: 'Kosovo' },
  { value: 'kw', label: 'Kuwait' },
  { value: 'kg', label: 'Kyrgyzstan' },
  { value: 'la', label: 'Laos' },
  { value: 'lv', label: 'Latvia' },
  { value: 'lb', label: 'Lebanon' },
  { value: 'ls', label: 'Lesotho' },
  { value: 'lr', label: 'Liberia' },
  { value: 'ly', label: 'Libya' },
  { value: 'li', label: 'Liechtenstein' },
  { value: 'lt', label: 'Lithuania' },
  { value: 'lu', label: 'Luxembourg' },
  { value: 'mo', label: 'Macao' },
  { value: 'mg', label: 'Madagascar' },
  { value: 'mw', label: 'Malawi' },
  { value: 'my', label: 'Malaysia' },
  { value: 'mv', label: 'Maldives' },
  { value: 'ml', label: 'Mali' },
  { value: 'mt', label: 'Malta' },
  { value: 'mh', label: 'Marshall Islands' },
  { value: 'mq', label: 'Martinique' },
  { value: 'mr', label: 'Mauritania' },
  { value: 'mu', label: 'Mauritius' },
  { value: 'mx', label: 'Mexico' },
  { value: 'fm', label: 'Micronesia' },
  { value: 'md', label: 'Moldova' },
  { value: 'mc', label: 'Monaco' },
  { value: 'mn', label: 'Mongolia' },
  { value: 'me', label: 'Montenegro' },
  { value: 'ms', label: 'Montserrat' },
  { value: 'ma', label: 'Morocco' },
  { value: 'mz', label: 'Mozambique' },
  { value: 'mm', label: 'Myanmar' },
  { value: 'na', label: 'Namibia' },
  { value: 'nr', label: 'Nauru' },
  { value: 'np', label: 'Nepal' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'nc', label: 'New Caledonia' },
  { value: 'nz', label: 'New Zealand' },
  { value: 'ni', label: 'Nicaragua' },
  { value: 'ne', label: 'Niger' },
  { value: 'ng', label: 'Nigeria' },
  { value: 'kp', label: 'North Korea' },
  { value: 'mk', label: 'North Macedonia' },
  { value: 'no', label: 'Norway' },
  { value: 'om', label: 'Oman' },
  { value: 'pk', label: 'Pakistan' },
  { value: 'pw', label: 'Palau' },
  { value: 'ps', label: 'Palestine' },
  { value: 'pa', label: 'Panama' },
  { value: 'pg', label: 'Papua New Guinea' },
  { value: 'py', label: 'Paraguay' },
  { value: 'pe', label: 'Peru' },
  { value: 'ph', label: 'Philippines' },
  { value: 'pl', label: 'Poland' },
  { value: 'pt', label: 'Portugal' },
  { value: 'pr', label: 'Puerto Rico' },
  { value: 'qa', label: 'Qatar' },
  { value: 're', label: 'R\u00e9union' },
  { value: 'ro', label: 'Romania' },
  { value: 'ru', label: 'Russia' },
  { value: 'rw', label: 'Rwanda' },
  { value: 'kn', label: 'Saint Kitts and Nevis' },
  { value: 'lc', label: 'Saint Lucia' },
  { value: 'vc', label: 'Saint Vincent and the Grenadines' },
  { value: 'ws', label: 'Samoa' },
  { value: 'sm', label: 'San Marino' },
  { value: 'st', label: 'S\u00e3o Tom\u00e9 and Pr\u00edncipe' },
  { value: 'sa', label: 'Saudi Arabia' },
  { value: 'sn', label: 'Senegal' },
  { value: 'rs', label: 'Serbia' },
  { value: 'sc', label: 'Seychelles' },
  { value: 'sl', label: 'Sierra Leone' },
  { value: 'sg', label: 'Singapore' },
  { value: 'sk', label: 'Slovakia' },
  { value: 'si', label: 'Slovenia' },
  { value: 'sb', label: 'Solomon Islands' },
  { value: 'so', label: 'Somalia' },
  { value: 'za', label: 'South Africa' },
  { value: 'kr', label: 'South Korea' },
  { value: 'ss', label: 'South Sudan' },
  { value: 'es', label: 'Spain' },
  { value: 'lk', label: 'Sri Lanka' },
  { value: 'sd', label: 'Sudan' },
  { value: 'sr', label: 'Suriname' },
  { value: 'se', label: 'Sweden' },
  { value: 'ch', label: 'Switzerland' },
  { value: 'sy', label: 'Syria' },
  { value: 'tw', label: 'Taiwan' },
  { value: 'tj', label: 'Tajikistan' },
  { value: 'tz', label: 'Tanzania' },
  { value: 'th', label: 'Thailand' },
  { value: 'tl', label: 'Timor-Leste' },
  { value: 'tg', label: 'Togo' },
  { value: 'to', label: 'Tonga' },
  { value: 'tt', label: 'Trinidad and Tobago' },
  { value: 'tn', label: 'Tunisia' },
  { value: 'tr', label: 'Turkey' },
  { value: 'tm', label: 'Turkmenistan' },
  { value: 'tc', label: 'Turks and Caicos Islands' },
  { value: 'tv', label: 'Tuvalu' },
  { value: 'ug', label: 'Uganda' },
  { value: 'ua', label: 'Ukraine' },
  { value: 'ae', label: 'United Arab Emirates' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
  { value: 'uy', label: 'Uruguay' },
  { value: 'uz', label: 'Uzbekistan' },
  { value: 'vu', label: 'Vanuatu' },
  { value: 'va', label: 'Vatican City' },
  { value: 've', label: 'Venezuela' },
  { value: 'vn', label: 'Vietnam' },
  { value: 'vg', label: 'Virgin Islands (British)' },
  { value: 'vi', label: 'Virgin Islands (U.S.)' },
  { value: 'ye', label: 'Yemen' },
  { value: 'zm', label: 'Zambia' },
  { value: 'zw', label: 'Zimbabwe' },
];

// ---------------------------------------------------------------------------
// Country item renderer (shared between demos)
// ---------------------------------------------------------------------------
function CountryLabel({ code, label }: { code: string; label: string }) {
  return (
    <span className={countryLabelStyles.Root}>
      <FlagIcon code={code} />
      <span className={countryLabelStyles.Text}>{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Country option renderer for Select dropdown
// ---------------------------------------------------------------------------
const CountryOptionView = ({ value, label }: Option) => (
  <CountryLabel code={value} label={label} />
);

// ---------------------------------------------------------------------------
// Stable trigger renderers for Select (must not be inline per Select docs)
// ---------------------------------------------------------------------------
function useCountryTrigger(
  country: string,
  onClear: () => void,
  extra?: { invalid?: boolean; 'aria-describedby'?: string },
) {
  const selected = COUNTRIES.find((c) => c.value === country);
  return useCallback(
    ({ open }: { open: boolean; onToggle: () => void }) => (
      <FloatingLabelSelect
        label="Country"
        selected={!!selected}
        open={open}
        onClearClick={selected ? onClear : undefined}
        {...extra}
      >
        {selected && <CountryLabel code={selected.value} label={selected.label} />}
      </FloatingLabelSelect>
    ),
    [selected, onClear, extra],
  );
}

// ---------------------------------------------------------------------------
// FloatingLabelSelect demos
// ---------------------------------------------------------------------------
export function FloatingLabelSelectCountryDemo() {
  const [country, setCountry] = useState('');
  const handleClear = useCallback(() => setCountry(''), []);
  const trigger = useCountryTrigger(country, handleClear);

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <Select
          value={country}
          options={COUNTRIES}
          onChange={(option) => setCountry(option.value)}
          searchPlaceholder="Search countries..."
          OptionView={CountryOptionView}
          listMinWidth={360}
          block
          trigger={trigger}
          checkPosition="end"
        />
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// Plain text select (no icons)
// ---------------------------------------------------------------------------
const ROLES: Option[] = [
  { value: 'designer', label: 'Designer' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'product-manager', label: 'Product Manager' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'sales', label: 'Sales' },
];

function useRoleTrigger(role: string, onClear: () => void) {
  const selected = ROLES.find((r) => r.value === role);
  return useCallback(
    ({ open }: { open: boolean; onToggle: () => void }) => (
      <FloatingLabelSelect
        label="Role"
        selected={!!selected}
        open={open}
        onClearClick={selected ? onClear : undefined}
      >
        {selected?.label}
      </FloatingLabelSelect>
    ),
    [selected, onClear],
  );
}

export function FloatingLabelSelectPlainDemo() {
  const [role, setRole] = useState('');
  const handleClear = useCallback(() => setRole(''), []);
  const trigger = useRoleTrigger(role, handleClear);

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <Select
          value={role}
          options={ROLES}
          onChange={(option) => setRole(option.value)}
          searchPlaceholder="Search roles..."
          listMinWidth={360}
          block
          trigger={trigger}
          checkPosition="end"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Label inside the box
// ---------------------------------------------------------------------------
function useInsideCountryTrigger(country: string) {
  const label = COUNTRIES.find((c) => c.value === country)?.label;
  return useCallback(
    ({ open }: { open: boolean; onToggle: () => void }) => (
      <FloatingLabelSelect label="Country or region" labelPlacement="inside" selected={!!label} open={open}>
        {label}
      </FloatingLabelSelect>
    ),
    [label],
  );
}

export function FloatingLabelInsideDemo() {
  const [country, setCountry] = useState('es');
  const trigger = useInsideCountryTrigger(country);

  return (
    <div data-demo-stage className="py-10">
      <div className="flex w-[360px] flex-col gap-3">
        <FloatingLabelInput label="Full name" labelPlacement="inside" defaultValue="Jane Doe" />
        <Select
          value={country}
          options={COUNTRIES}
          onChange={(option) => setCountry(option.value)}
          searchPlaceholder="Search countries..."
          listMinWidth={360}
          block
          trigger={trigger}
          checkPosition="end"
        />
        <FloatingLabelInput label="Address line 1" labelPlacement="inside" />
        <FloatingLabelInput label="Delivery notes" labelPlacement="inside" multiline />
      </div>
    </div>
  );
}

export function FloatingLabelInsideBillingFormDemo() {
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const phoneViewport = usePhoneViewport();
  const [inputType, setInputType] = useState<'border-pill' | 'border-rounded' | 'inside-rounded'>('inside-rounded');
  const labelPlacement = inputType === 'inside-rounded' ? 'inside' : 'border';
  const pill = inputType === 'border-pill';
  const [country, setCountry] = useState('es');
  const [billing, setBilling] = useState({
    email: 'jane.doe@example.com', name: 'Jane Doe', address1: '', address2: '', postalCode: '', city: '',
  });
  const update = (key: keyof typeof billing) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setBilling((current) => ({ ...current, [key]: value }));
  };
  const countryLabel = COUNTRIES.find((option) => option.value === country)?.label;
  const trigger = useCallback(({ open }: { open: boolean }) => (
    <FloatingLabelSelect label="Country or region" labelPlacement={labelPlacement} pill={pill} selected={!!countryLabel} open={open}>
      {countryLabel}
    </FloatingLabelSelect>
  ), [countryLabel, labelPlacement, pill]);
  const controls = <div data-demo-controls style={controlsTableStyle}>
    <ScreenPresentationControls {...presentation} />
    {wide && !phoneViewport && <DemoControlRow name="type">
      <SegmentedControl value={inputType} onChange={setInputType} aria-label="type" size="xs">
        <SegmentedControl.Option value="border-pill">Border pill</SegmentedControl.Option>
        <SegmentedControl.Option value="border-rounded">Border rounded</SegmentedControl.Option>
        <SegmentedControl.Option value="inside-rounded">Inside rounded</SegmentedControl.Option>
      </SegmentedControl>
    </DemoControlRow>}
  </div>;

  if (!wide) {
    return (
      <>
      {controls}
      <FormScreen title="Billing details" submitLabel="Save" surface={presentation.surface} dialog={presentation.dialog} onDialogChange={presentation.setDialog}>
        <FieldGroup columns>
          <Field row label="Billing email">
            <Input type="email" value={billing.email} onChange={update('email')} autoComplete="email" />
          </Field>
          <Field row label="Full name">
            <Input value={billing.name} onChange={update('name')} autoComplete="name" />
          </Field>
        </FieldGroup>
        <FieldGroup title="Billing address" columns>
          <Field row label="Country">
            <Select value={country} options={COUNTRIES} onChange={(option) => setCountry(option.value)} searchPlaceholder="Search countries..." block={false} align="end" checkPosition="end" />
          </Field>
          <Field row label="Address line 1">
            <Input value={billing.address1} onChange={update('address1')} autoComplete="address-line1" />
          </Field>
          <Field row label="Address line 2">
            <Input value={billing.address2} onChange={update('address2')} placeholder="Optional" autoComplete="address-line2" />
          </Field>
          <Field row label="Postal code">
            <Input value={billing.postalCode} onChange={update('postalCode')} autoComplete="postal-code" />
          </Field>
          <Field row label="City">
            <Input value={billing.city} onChange={update('city')} autoComplete="address-level2" />
          </Field>
        </FieldGroup>
      </FormScreen>
      </>
    );
  }

  return (
    <>
    {controls}
    <AuthFormStage title="Billing details" surface={presentation.surface} dialog={presentation.dialog} onDialogChange={presentation.setDialog}>
      <form className="flex w-[360px] flex-col gap-3" onSubmit={(evt) => evt.preventDefault()}>
        <FloatingLabelInput label="Billing email" labelPlacement={labelPlacement} pill={pill} type="email" value={billing.email} onChange={update('email')} autoComplete="email" />
        <FloatingLabelInput label="Full name" labelPlacement={labelPlacement} pill={pill} value={billing.name} onChange={update('name')} autoComplete="name" />
        <Select
          value={country}
          options={COUNTRIES}
          onChange={(option) => setCountry(option.value)}
          searchPlaceholder="Search countries..."
          listMinWidth={360}
          block
          trigger={trigger}
          checkPosition="end"
        />
        <FloatingLabelInput label="Address line 1" labelPlacement={labelPlacement} pill={pill} value={billing.address1} onChange={update('address1')} autoComplete="address-line1" />
        <FloatingLabelInput label="Address line 2" labelPlacement={labelPlacement} pill={pill} value={billing.address2} onChange={update('address2')} autoComplete="address-line2" />
        <div className="flex gap-3">
          <FloatingLabelInput className="flex-1" label="Postal code" labelPlacement={labelPlacement} pill={pill} value={billing.postalCode} onChange={update('postalCode')} autoComplete="postal-code" />
          <FloatingLabelInput className="flex-1" label="City" labelPlacement={labelPlacement} pill={pill} value={billing.city} onChange={update('city')} autoComplete="address-level2" />
        </div>
        <Button color="primary" size="3xl" type="submit" pill={pill} className="mt-3">Save</Button>
      </form>
    </AuthFormStage>
    </>
  );
}

// ---------------------------------------------------------------------------
// Multi-select with clearable
// ---------------------------------------------------------------------------
const SKILLS: Option[] = [
  { value: 'figma', label: 'Figma' },
  { value: 'react', label: 'React' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'tailwind', label: 'Tailwind CSS' },
  { value: 'nodejs', label: 'Node.js' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'rust', label: 'Rust' },
];

function useSkillsTrigger(skills: string[], onClear: () => void) {
  const hasSelection = skills.length > 0;
  const display =
    skills.length === 1
      ? (SKILLS.find((s) => s.value === skills[0])?.label ?? '')
      : skills.length > 1
        ? `${skills.length} skills`
        : '';
  return useCallback(
    ({ open }: { open: boolean; onToggle: () => void }) => (
      <FloatingLabelSelect
        label="Skills"
        selected={hasSelection}
        open={open}
        onClearClick={hasSelection ? onClear : undefined}
      >
        {display}
      </FloatingLabelSelect>
    ),
    [hasSelection, display, onClear],
  );
}

export function FloatingLabelSelectMultiDemo() {
  const [skills, setSkills] = useState<string[]>([]);
  const handleClear = useCallback(() => setSkills([]), []);
  const trigger = useSkillsTrigger(skills, handleClear);

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <Select
          multiple
          clearable
          value={skills}
          options={SKILLS}
          onChange={(options) => setSkills(options.map((o) => o.value))}
          searchPlaceholder="Search skills..."
          listMinWidth={360}
          block
          trigger={trigger}
          checkPosition="end"
        />
      </div>
    </div>
  );
}

export function FloatingLabelSelectAboutYouFormDemo() {
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const mobileFormId = useId();

  const [fullName, setFullName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [country, setCountry] = useState('');
  const [birthdayError, setBirthdayError] = useState<string | null>(null);
  const [countryError, setCountryError] = useState<string | null>(null);
  const birthdayFieldId = useId();
  const countryFieldId = useId();
  const handleClearCountry = useCallback(() => {
    setCountry('');
    setCountryError(null);
  }, []);
  const triggerExtra = {
    invalid: !!countryError,
    'aria-describedby': countryError ? countryFieldId : undefined,
  };
  const trigger = useCountryTrigger(country, handleClearCountry, triggerExtra);
  const handleSubmit = (evt: FormSubmitEvent) => {
    evt.preventDefault();
    let hasError = false;
    if (!birthday) {
      setBirthdayError('Birthday is required.');
      hasError = true;
    } else if (!isValidBirthday(birthday)) {
      setBirthdayError('Please enter a valid date.');
      hasError = true;
    } else {
      setBirthdayError(null);
    }
    if (!country) {
      setCountryError('Please select a country.');
      hasError = true;
    } else {
      setCountryError(null);
    }
    if (hasError) return;
  };

  const mobileFields = (
    <AuthFields>
      <AuthInput label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
      <AuthInput label="Birthday" errorMessage={birthdayError ?? undefined}
        value={birthday} placeholder="MM / DD / YYYY" inputMode="numeric" maxLength={14} autoComplete="bday" onChange={(event) => {
          const raw = event.target.value;
          const digits = getDigits(raw);
          setBirthday(formatBirthdayValue(raw.length < birthday.length && digits.length === getDigits(birthday).length ? digits.slice(0, -1) : raw));
          setBirthdayError(null);
        }} />
      <div className={authFieldsStyles.Row}>
        {/* The row has no visible label: a hidden one names the trigger together with its value. */}
        <span id={countryFieldId + "-label"} className="sr-only">Country</span>
        <Select value={country} options={COUNTRIES} onChange={(option) => { setCountry(option.value); setCountryError(null); }}
          aria-labelledby={countryFieldId + "-label"} aria-invalid={!!countryError || undefined} aria-describedby={countryError ? countryFieldId : undefined}
          searchPlaceholder="Search countries..." placeholder="Select country" clearable
          variant="ghost" size="3xl" triggerClassName={authFieldsStyles.Country} block align="start" checkPosition="end" />
        {countryError && <FieldError id={countryFieldId} className={authFieldsStyles.Note}>{countryError}</FieldError>}
      </div>
    </AuthFields>
  );

  const heading = (
    <div className="mb-6 text-center">
      <h3 data-auth-title className="text-2xl font-semibold tracking-tight">Tell us about you</h3>
      <p data-auth-description className="text-secondary text-sm mt-1">This helps us customize your experience.</p>
    </div>
  );

  const formContent = (
    <div className="w-[360px]">
      {heading}
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <FloatingLabelInput
          label="Full name"
          value={fullName}
          onChange={(evt) => setFullName(evt.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <BirthdayMaskedInput
            value={birthday}
            onChange={(val) => {
              setBirthday(val);
              setBirthdayError(null);
            }}
            invalid={!!birthdayError}
            aria-describedby={birthdayError ? birthdayFieldId : undefined}
          />
          {birthdayError && <FieldError id={birthdayFieldId}>{birthdayError}</FieldError>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Select
            value={country}
            options={COUNTRIES}
            onChange={(option) => { setCountry(option.value); setCountryError(null); }}
            searchPlaceholder="Search countries..."
            OptionView={CountryOptionView}
            listMinWidth={320}
            block
            trigger={trigger}
            checkPosition="end"
          />
          {countryError && <FieldError id={countryFieldId}>{countryError}</FieldError>}
        </div>
        <AuthLegalNotice />
        <Button color="primary" size="3xl" type="submit" pill className="h-[3.25rem]">Continue</Button>
      </form>
    </div>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <ScreenPresentationControls {...presentation} />
      </div>
      <AuthFormStage
        title="Tell us about you"
        surface={presentation.surface}
        dialog={presentation.dialog}
        onDialogChange={presentation.setDialog}
        footer={<div className={authFieldsStyles.ConsentActions}><AuthLegalNotice /><Button color="primary" size="3xl" type="submit" form={mobileFormId} pill block>Continue</Button></div>}
      >
        {wide ? formContent : (
          <div className="w-[360px]">
            {heading}
            <form id={mobileFormId} onSubmit={handleSubmit} noValidate>{mobileFields}</form>
          </div>
        )}
      </AuthFormStage>
    </>
  );
}

const DIAL_CODES: Record<string, string> = {
  af: '+93', al: '+355', dz: '+213', as: '+1684', ad: '+376', ao: '+244',
  ai: '+1264', ag: '+1268', ar: '+54', am: '+374', aw: '+297', au: '+61',
  at: '+43', az: '+994', bs: '+1242', bh: '+973', bd: '+880', bb: '+1246',
  by: '+375', be: '+32', bz: '+501', bj: '+229', bm: '+1441', bt: '+975',
  bo: '+591', ba: '+387', bw: '+267', br: '+55', bn: '+673', bg: '+359',
  bf: '+226', bi: '+257', kh: '+855', cm: '+237', ca: '+1', cv: '+238',
  ky: '+1345', cf: '+236', td: '+235', cl: '+56', cn: '+86', co: '+57',
  km: '+269', cg: '+242', cd: '+243', ck: '+682', cr: '+506', ci: '+225',
  hr: '+385', cu: '+53', cw: '+599', cy: '+357', cz: '+420', dk: '+45',
  dj: '+253', dm: '+1767', do: '+1809', ec: '+593', eg: '+20', sv: '+503',
  gq: '+240', er: '+291', ee: '+372', sz: '+268', et: '+251', fk: '+500',
  fo: '+298', fj: '+679', fi: '+358', fr: '+33', gf: '+594', pf: '+689',
  ga: '+241', gm: '+220', ge: '+995', de: '+49', gh: '+233', gi: '+350',
  gr: '+30', gl: '+299', gd: '+1473', gp: '+590', gu: '+1671', gt: '+502',
  gn: '+224', gw: '+245', gy: '+592', ht: '+509', hn: '+504', hk: '+852',
  hu: '+36', is: '+354', in: '+91', id: '+62', ir: '+98', iq: '+964',
  ie: '+353', il: '+972', it: '+39', jm: '+1876', jp: '+81', jo: '+962',
  kz: '+7', ke: '+254', ki: '+686', xk: '+383', kw: '+965', kg: '+996',
  la: '+856', lv: '+371', lb: '+961', ls: '+266', lr: '+231', ly: '+218',
  li: '+423', lt: '+370', lu: '+352', mo: '+853', mg: '+261', mw: '+265',
  my: '+60', mv: '+960', ml: '+223', mt: '+356', mh: '+692', mq: '+596',
  mr: '+222', mu: '+230', mx: '+52', fm: '+691', md: '+373', mc: '+377',
  mn: '+976', me: '+382', ms: '+1664', ma: '+212', mz: '+258', mm: '+95',
  na: '+264', nr: '+674', np: '+977', nl: '+31', nc: '+687', nz: '+64',
  ni: '+505', ne: '+227', ng: '+234', kp: '+850', mk: '+389', no: '+47',
  om: '+968', pk: '+92', pw: '+680', ps: '+970', pa: '+507', pg: '+675',
  py: '+595', pe: '+51', ph: '+63', pl: '+48', pt: '+351', pr: '+1787',
  qa: '+974', re: '+262', ro: '+40', ru: '+7', rw: '+250', kn: '+1869',
  lc: '+1758', vc: '+1784', ws: '+685', sm: '+378', st: '+239', sa: '+966',
  sn: '+221', rs: '+381', sc: '+248', sl: '+232', sg: '+65', sk: '+421',
  si: '+386', sb: '+677', so: '+252', za: '+27', kr: '+82', ss: '+211',
  es: '+34', lk: '+94', sd: '+249', sr: '+597', se: '+46', ch: '+41',
  sy: '+963', tw: '+886', tj: '+992', tz: '+255', th: '+66', tl: '+670',
  tg: '+228', to: '+676', tt: '+1868', tn: '+216', tr: '+90', tm: '+993',
  tc: '+1649', tv: '+688', ug: '+256', ua: '+380', ae: '+971', gb: '+44',
  us: '+1', uy: '+598', uz: '+998', vu: '+678', va: '+379', ve: '+58',
  vn: '+84', vg: '+1284', vi: '+1340', ye: '+967', zm: '+260', zw: '+263',
};

const PHONE_FORMATS: Record<string, number[]> = {
  us: [3, 3, 4], ca: [3, 3, 4], mx: [2, 4, 4], jm: [3, 4],
  pr: [3, 3, 4], tt: [3, 4],
  gb: [4, 3, 3], de: [3, 4, 4], fr: [1, 2, 2, 2, 2], es: [3, 2, 2, 2],
  it: [3, 3, 4], pt: [3, 3, 3], nl: [2, 3, 4], be: [3, 2, 2, 2],
  at: [3, 3, 4], ch: [2, 3, 2, 2], se: [2, 3, 2, 2], no: [3, 2, 3],
  dk: [2, 2, 2, 2], fi: [2, 3, 4], pl: [3, 3, 3], cz: [3, 3, 3],
  ie: [2, 3, 4], ro: [3, 3, 3], hu: [2, 3, 4], gr: [3, 3, 4],
  bg: [3, 3, 3], hr: [2, 3, 3], sk: [3, 3, 3], si: [2, 3, 2, 2],
  rs: [2, 3, 4], ee: [3, 4], lv: [2, 3, 3], lt: [3, 2, 3],
  ua: [2, 3, 2, 2], ru: [3, 3, 2, 2], tr: [3, 3, 2, 2],
  is: [3, 4], lu: [3, 3], mt: [4, 4], cy: [2, 6],
  al: [3, 3, 3], ba: [2, 3, 3], me: [2, 3, 3], mk: [2, 3, 3],
  md: [2, 3, 3], by: [2, 3, 2, 2], ge: [3, 2, 2, 2],
  am: [2, 3, 3], az: [2, 3, 2, 2], mc: [4, 4], li: [3, 2, 2],
  jp: [2, 4, 4], kr: [2, 4, 4], cn: [3, 4, 4], in: [5, 5],
  sg: [4, 4], hk: [4, 4], tw: [3, 3, 3], th: [2, 3, 4],
  id: [3, 4, 4], my: [2, 4, 4], ph: [3, 3, 4], vn: [2, 3, 4],
  kh: [2, 3, 3], mm: [2, 3, 4], la: [2, 4, 4], bn: [3, 4],
  kz: [3, 3, 2, 2], uz: [2, 3, 2, 2], kg: [3, 3, 3],
  tj: [2, 3, 4], tm: [2, 3, 4], mn: [4, 4],
  pk: [3, 3, 4], bd: [4, 3, 3], lk: [2, 3, 4], np: [3, 3, 4],
  ae: [2, 3, 4], sa: [2, 3, 4], il: [2, 3, 4], jo: [1, 4, 4],
  lb: [1, 3, 3], kw: [4, 4], qa: [4, 4], bh: [4, 4],
  om: [4, 4], iq: [3, 3, 4], ir: [3, 3, 4],
  za: [2, 3, 4], ng: [3, 3, 4], eg: [3, 3, 4], ke: [3, 3, 3],
  gh: [2, 3, 4], tz: [3, 3, 3], ug: [3, 3, 3], et: [2, 3, 4],
  ma: [4, 6], tn: [2, 3, 3], dz: [3, 2, 2, 2],
  br: [2, 5, 4], ar: [2, 4, 4], cl: [1, 4, 4], co: [3, 3, 4],
  pe: [3, 3, 3], ve: [3, 3, 4], ec: [2, 3, 4], uy: [2, 3, 2],
  py: [3, 3, 3], bo: [1, 3, 4],
  au: [3, 3, 3], nz: [3, 3, 3], fj: [3, 4],
};

const DEFAULT_PHONE_FORMAT = [3, 3, 4];

function formatPhoneNumber(raw: string, countryCode?: string): string {
  const allDigits = raw.replace(/\D/g, '');
  if (!allDigits) return '';
  const format = (countryCode && PHONE_FORMATS[countryCode]) || DEFAULT_PHONE_FORMAT;
  const maxDigits = format.reduce((sum, n) => sum + n, 0);
  const digits = allDigits.slice(0, maxDigits);
  const groups: string[] = [];
  let i = 0;
  for (const groupSize of format) {
    if (i >= digits.length) break;
    groups.push(digits.slice(i, i + groupSize));
    i += groupSize;
  }
  return groups.join(' ');
}

function stripFormatting(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

const PHONE_COUNTRY_OPTIONS = COUNTRIES.map((country) => ({
  ...country,
  label: `${country.label} (${DIAL_CODES[country.value] || ''})`,
}));
const PHONE_COUNTRY_LOOKUP = new Map(COUNTRIES.map((country) => [country.value, country]));

const phoneCountrySearchPredicate = (option: Option, searchTerm: string): boolean => {
  const country = PHONE_COUNTRY_LOOKUP.get(option.value);
  if (!country) return option.label.toLowerCase().includes(searchTerm);
  const dialCode = DIAL_CODES[option.value] || '';
  return country.label.toLowerCase().includes(searchTerm) || dialCode.includes(searchTerm);
};

const PhoneCountryOptionView = ({ value, label }: Option) => (
  <CountryLabel code={value} label={label} />
);

const PhoneCountryTriggerView = ({ value, label }: Option) => {
  const selected = COUNTRY_LOOKUP.get(value);
  return <PhoneCountryLabel label={selected?.label ?? label} dialCode={selected?.dialCode} />;
};

function usePhoneCountryTrigger(country: string) {
  const selected = COUNTRIES.find((c) => c.value === country);
  const dialCode = selected ? DIAL_CODES[selected.value] : undefined;
  return useCallback(
    ({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          height: '3.25rem',
          borderRadius: 'var(--floating-input-border-radius)',
          border: '1px solid var(--floating-input-border-color)',
          padding: '0 var(--floating-input-gutter)',
          backgroundColor: 'var(--floating-input-background)',
          color: selected ? 'var(--color-text)' : 'var(--color-text-tertiary)',
          fontSize: '1rem',
          lineHeight: '1.5rem',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {selected ? (
          <span className={countryLabelStyles.Root}>
            <FlagIcon code={selected.value} />
            <PhoneCountryLabel label={selected.label} dialCode={dialCode} />
          </span>
        ) : (
          'Country'
        )}
        <ChevronDown style={{ marginLeft: 'auto', flexShrink: 0, width: 12, height: 7, color: 'var(--color-text-tertiary)' }} />
      </button>
    ),
    [selected, dialCode],
  );
}

export function FloatingLabelInputPhoneDemo() {
  const [country, setCountry] = useState('es');
  const [phone, setPhone] = useState('');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const dialCode = DIAL_CODES[country] || '+1';
  const trigger = usePhoneCountryTrigger(country);

  const handleCountryChange = useCallback((option: Option) => {
    setCountry(option.value);
    setTimeout(() => phoneInputRef.current?.focus(), 0);
  }, []);

  const handlePhoneChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    const raw = evt.target.value.replace(/\D/g, '');
    setPhone(formatPhoneNumber(raw, country));
  }, [country]);

  const phoneInputProps = {
    label: 'Phone number',
    startAdornment: <span className="text-tertiary whitespace-nowrap select-none mr-2">{dialCode}</span>,
    value: phone,
    onChange: handlePhoneChange,
    type: 'tel' as const,
    inputMode: 'tel' as const,
  };

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px] flex flex-col gap-3">
        <Select
          value={country}
          options={PHONE_COUNTRY_OPTIONS}
          onChange={handleCountryChange}
          searchPlaceholder="Search countries..."
          OptionView={PhoneCountryOptionView}
          searchPredicate={phoneCountrySearchPredicate}
          listMinWidth={360}
          block
          size="3xl"
          trigger={trigger}
          checkPosition="end"
        />
        <FloatingLabelInput ref={phoneInputRef} {...phoneInputProps} />
      </div>
    </div>
  );
}

export function FloatingLabelInputPhoneLoginFormDemo() {
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const formId = useId();

  const [country, setCountry] = useState('es');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const dialCode = DIAL_CODES[country] || '+1';
  const trigger = usePhoneCountryTrigger(country);

  const handleCountryChange = useCallback((option: Option) => {
    setCountry(option.value);
    setSubmitted(false);
    setTimeout(() => phoneInputRef.current?.focus(), 0);
  }, []);

  const handlePhoneChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    const raw = evt.target.value.replace(/\D/g, '');
    setPhone(formatPhoneNumber(raw, country));
    setSubmitted(false);
  }, [country]);

  const digits = stripFormatting(phone);
  const isPhoneValid = digits.length >= 7 && digits.length <= 15;
  const showError = submitted && !isPhoneValid;

  const phoneInputProps = {
    label: 'Phone number',
    startAdornment: wide ? <span className="text-tertiary whitespace-nowrap select-none mr-2">{dialCode}</span> : undefined,
    value: phone,
    onChange: handlePhoneChange,
    type: 'tel' as const,
    inputMode: 'tel' as const,
    invalid: showError,
    errorMessage: showError ? 'Phone number is not valid.' : undefined,
  };

  const handleSubmit = (evt: FormSubmitEvent) => {
    evt.preventDefault();
    setSubmitted(true);
    if (!isPhoneValid) return;
  };

  const formContent = (
    <div className="w-[360px]">
      <div className="mb-6 text-center">
        <h3 data-auth-title className="text-2xl font-semibold tracking-tight">Welcome back</h3>
        <p data-auth-description className="text-secondary text-sm mt-1">Enter your phone number to continue.</p>
      </div>
      <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        <AuthFields>
        <Select
          value={country}
          options={PHONE_COUNTRY_OPTIONS}
          onChange={handleCountryChange}
          searchPlaceholder="Search countries..."
          OptionView={PhoneCountryOptionView}
          searchPredicate={phoneCountrySearchPredicate}
          listMinWidth={360}
          block
          size="3xl"
          trigger={wide ? trigger : undefined}
          TriggerView={PhoneCountryTriggerView}
          triggerClassName={wide ? undefined : authFieldsStyles.Country}
          variant={wide ? 'outline' : 'ghost'}
          aria-label="Country"
          checkPosition="end"
        />
        <AuthInput ref={phoneInputRef} {...phoneInputProps} />
        </AuthFields>
        {wide && <Button color="primary" size="3xl" type="submit" pill className="w-full h-[3.25rem] mt-3">Continue</Button>}
        <p className={["text-base text-center mt-4", authFieldsStyles.CrossActionRow].join(" ")}>
          Don&apos;t have an account?{' '}
          <Button type="button" color="info" variant="ghost" className={authFieldsStyles.TextAction}>
            Sign up
          </Button>
        </p>
      </form>
    </div>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <ScreenPresentationControls {...presentation} />
      </div>
      <AuthFormStage
        title="Log in with phone"
        surface={presentation.surface}
        dialog={presentation.dialog}
        onDialogChange={presentation.setDialog}
        footer={<Button color="primary" size="3xl" type="submit" form={formId} pill block>Continue</Button>}
      >
        {formContent}
      </AuthFormStage>
    </>
  );
}

export function FloatingLabelInputPhoneSignupFormDemo() {
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const formId = useId();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('es');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const dialCode = DIAL_CODES[country] || '+1';
  const trigger = usePhoneCountryTrigger(country);

  const handleCountryChange = useCallback((option: Option) => {
    setCountry(option.value);
    setSubmitted(false);
    setTimeout(() => phoneInputRef.current?.focus(), 0);
  }, []);

  const handlePhoneChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    const raw = evt.target.value.replace(/\D/g, '');
    setPhone(formatPhoneNumber(raw, country));
    setSubmitted(false);
  }, [country]);

  const digits = stripFormatting(phone);
  const isPhoneValid = digits.length >= 7 && digits.length <= 15;
  const showError = submitted && !isPhoneValid;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailError = submitted && !isEmailValid;

  const phoneInputProps = {
    label: 'Phone number',
    startAdornment: wide ? <span className="text-tertiary whitespace-nowrap select-none mr-2">{dialCode}</span> : undefined,
    value: phone,
    onChange: handlePhoneChange,
    type: 'tel' as const,
    inputMode: 'tel' as const,
    invalid: showError,
    errorMessage: showError ? 'Phone number is not valid.' : undefined,
  };

  const handleSubmit = (evt: FormSubmitEvent) => {
    evt.preventDefault();
    setSubmitted(true);
    if (!isPhoneValid || !isEmailValid) return;
  };

  const formContent = (
    <div className="w-[360px]">
      <div className="mb-6 text-center">
        <h3 data-auth-title className="text-2xl font-semibold tracking-tight">Create your account</h3>
        <p data-auth-description className="text-secondary text-sm mt-1">Enter your details to get started.</p>
      </div>
      <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Full name"
          value={fullName}
          onChange={(evt) => setFullName(evt.target.value)}
        />
        <AuthInput
          label="Email address"
          type="email"
          value={email}
          onChange={(evt) => {
            setEmail(evt.target.value);
            setSubmitted(false);
          }}
          invalid={emailError}
          errorMessage={emailError ? 'Enter a valid email address.' : undefined}
        />
        <AuthFields>
        <Select
          value={country}
          options={PHONE_COUNTRY_OPTIONS}
          onChange={handleCountryChange}
          searchPlaceholder="Search countries..."
          OptionView={PhoneCountryOptionView}
          searchPredicate={phoneCountrySearchPredicate}
          listMinWidth={360}
          block
          size="3xl"
          trigger={wide ? trigger : undefined}
          TriggerView={PhoneCountryTriggerView}
          triggerClassName={wide ? undefined : authFieldsStyles.Country}
          variant={wide ? 'outline' : 'ghost'}
          aria-label="Country"
          checkPosition="end"
        />
        <AuthInput ref={phoneInputRef} {...phoneInputProps} />
        </AuthFields>
        {wide && <AuthLegalNotice />}
        {wide && <Button color="primary" size="3xl" type="submit" pill className="w-full h-[3.25rem]">Continue</Button>}
        <p className={["text-base text-center mt-4", authFieldsStyles.CrossActionRow].join(" ")}>
          Already have an account?{' '}
          <Button type="button" color="info" variant="ghost" className={authFieldsStyles.TextAction}>
            Log in
          </Button>
        </p>
      </form>
    </div>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <ScreenPresentationControls {...presentation} />
      </div>
      <AuthFormStage
        title="Create an account"
        surface={presentation.surface}
        dialog={presentation.dialog}
        onDialogChange={presentation.setDialog}
        footer={<div className={authFieldsStyles.ConsentActions}><AuthLegalNotice /><Button color="primary" size="3xl" type="submit" form={formId} pill block>Continue</Button></div>}
      >
        {formContent}
      </AuthFormStage>
    </>
  );
}

export function FloatingLabelInputPasswordFormDemo() {
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const formId = useId();
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [navigationStep, setNavigationStep] = useState(0);
  const focusPhoneEditor = useRef(false);
  const [phoneCountry, setPhoneCountry] = useState('us');
  const [phone, setPhone] = useState('555 123 4567');
  const [draftCountry, setDraftCountry] = useState(phoneCountry);
  const [draftPhone, setDraftPhone] = useState(phone);
  const phoneInput = useRef<HTMLInputElement>(null);
  const returnToEdit = useRef(false);
  const showError = submitted && !password;
  const digits = stripFormatting(draftPhone);
  const phoneValid = digits.length >= 7 && digits.length <= 15;
  const phoneError = submitted && !phoneValid;
  const title = editingPhone ? 'Edit phone number' : 'Enter your password';
  const displayPhone = `${COUNTRY_LOOKUP.get(phoneCountry)?.dialCode || '+1'} ${phone}`;
  const closePhoneEditor = () => {
    setNavigationStep((step) => step + 1);
    focusPhoneEditor.current = false;
    returnToEdit.current = true;
    setEditingPhone(false);
    setSubmitted(false);
  };
  const openPhoneEditor = () => {
    setNavigationStep((step) => step + 1);
    focusPhoneEditor.current = true;
    setDraftCountry(phoneCountry);
    setDraftPhone(phone);
    setSubmitted(false);
    setEditingPhone(true);
  };
  const handleSubmit = (event: FormSubmitEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (editingPhone && phoneValid) {
      setPhoneCountry(draftCountry);
      setPhone(draftPhone);
      closePhoneEditor();
    }
  };
  const phoneSummary = (
    <AuthInput label="Phone number" readOnly value={displayPhone}
      endAdornment={<Button ref={(button) => {
        if (button && returnToEdit.current) {
          returnToEdit.current = false;
          button.focus({ preventScroll: true });
        }
      }} type="button" color="info" variant="ghost" className={authFieldsStyles.TextAction} onClick={openPhoneEditor}>Edit</Button>} />
  );
  const passwordInput = (
    <AuthInput label="Password" type="password" value={password}
      onChange={(event) => { setPassword(event.target.value); setSubmitted(false); }}
      invalid={showError} errorMessage={showError ? 'Password is required.' : undefined} />
  );
  const forgotPassword = <Button type="button" color="info" variant="ghost" className={[authFieldsStyles.TextAction, authFieldsStyles.ForgotAction].join(' ')}>Forgot password?</Button>;

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
      <AuthFormStage navigation={wide ? undefined : { step: navigationStep, direction: editingPhone ? 'forward' : 'back' }} title={title} surface={presentation.surface} dialog={presentation.dialog}
        onDialogChange={presentation.setDialog} onBack={editingPhone ? closePhoneEditor : undefined}
        backLabel={editingPhone ? 'Back to password' : undefined}
        footer={<Button color="primary" size="3xl" type="submit" form={formId} pill block>Continue</Button>}>
        <div className="w-[360px]">
          <div className="mb-6 text-center"><h3 data-auth-title tabIndex={-1} ref={(node) => {
            if (node && focusPhoneEditor.current && editingPhone) {
              focusPhoneEditor.current = false;
              node.focus({ preventScroll: true });
            }
          }} className="text-2xl font-semibold tracking-tight">{title}</h3></div>
          <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
            {editingPhone ? (
              <AuthFields className="flex flex-col gap-3">
                <Select value={draftCountry} options={COUNTRY_OPTIONS} aria-label="Country" TriggerView={PhoneCountryTriggerView}
                  onChange={(option) => { setDraftCountry(option.value); setSubmitted(false); phoneInput.current?.focus(); }}
                  searchPlaceholder="Search countries..." size="3xl" block checkPosition="end"
                  variant={wide ? 'outline' : 'ghost'} triggerClassName={wide ? undefined : authFieldsStyles.Country} />
                <AuthInput ref={phoneInput} label="Phone number" type="tel" inputMode="tel" autoComplete="tel-national"
                  value={draftPhone} onChange={(event) => { setDraftPhone(formatPhoneNumber(event.target.value, draftCountry)); setSubmitted(false); }}
                  invalid={phoneError} errorMessage={phoneError ? 'Phone number is not valid.' : undefined} />
              </AuthFields>
            ) : wide ? <>{phoneSummary}<div>{passwordInput}{forgotPassword}</div></> : <>
              <AuthFields>{phoneSummary}{passwordInput}</AuthFields>{forgotPassword}
            </>}
            {wide && <div className="flex gap-3 mt-2">
              {editingPhone && <Button type="button" color="secondary" variant="ghost" onClick={closePhoneEditor}>Back</Button>}
              <Button color="primary" size="3xl" type="submit" pill block>Continue</Button>
            </div>}
            {!editingPhone && <p className={['text-base text-center mt-4', authFieldsStyles.CrossActionRow].join(' ')}>
              Don&apos;t have an account? <Button type="button" color="info" variant="ghost" className={authFieldsStyles.TextAction}>Sign up</Button>
            </p>}
          </form>
        </div>
      </AuthFormStage>
    </>
  );
}

export function FloatingLabelInputEmailLoginFormDemo() {
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const formId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailError = submitted && !isEmailValid;
  const passwordError = submitted && !password;

  const handleSubmit = (evt: FormSubmitEvent) => {
    evt.preventDefault();
    setSubmitted(true);
  };

  const formContent = (
    <div className="w-[360px]">
      <div className="mb-6 text-center">
        <h3 data-auth-title className="text-2xl font-semibold tracking-tight">Welcome back</h3>
        <p data-auth-description className="text-secondary text-sm mt-1">Log in to your account.</p>
      </div>
      <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        {wide ? (<>
        <AuthInput
          label="Email address"
          type="email"
          value={email}
          onChange={(evt) => {
            setEmail(evt.target.value);
            setSubmitted(false);
          }}
          invalid={emailError}
          errorMessage={emailError ? 'Enter a valid email address.' : undefined}
        />
        <div>
          <AuthInput
            label="Password"
            type="password"
            value={password}
            onChange={(evt) => {
              setPassword(evt.target.value);
              setSubmitted(false);
            }}
            invalid={passwordError}
            errorMessage={passwordError ? 'Password is required.' : undefined}
          />
          <Button type="button" color="info" variant="ghost" className={[authFieldsStyles.TextAction, authFieldsStyles.ForgotAction].join(" ")}>
            Forgot password?
          </Button>
        </div>
        </>) : (<>
        <AuthFields>
        <AuthInput
          label="Email address"
          type="email"
          value={email}
          onChange={(evt) => {
            setEmail(evt.target.value);
            setSubmitted(false);
          }}
          invalid={emailError}
          errorMessage={emailError ? 'Enter a valid email address.' : undefined}
        />
          <AuthInput
            label="Password"
            type="password"
            value={password}
            onChange={(evt) => {
              setPassword(evt.target.value);
              setSubmitted(false);
            }}
            invalid={passwordError}
            errorMessage={passwordError ? 'Password is required.' : undefined}
          />
        </AuthFields>
        <Button type="button" color="info" variant="ghost" className={[authFieldsStyles.TextAction, authFieldsStyles.ForgotAction].join(" ")}>
            Forgot password?
          </Button>
        </>)}
        {wide && <Button color="primary" size="3xl" type="submit" pill className="w-full h-[3.25rem] mt-2">Log in</Button>}
        <p className={["text-base text-center mt-4", authFieldsStyles.CrossActionRow].join(" ")}>
          Don&apos;t have an account?{' '}
          <Button type="button" color="info" variant="ghost" className={authFieldsStyles.TextAction}>
            Sign up
          </Button>
        </p>
      </form>
    </div>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <ScreenPresentationControls {...presentation} />
      </div>
      <AuthFormStage
        title="Welcome back"
        surface={presentation.surface}
        dialog={presentation.dialog}
        onDialogChange={presentation.setDialog}
        footer={<Button color="primary" size="3xl" type="submit" form={formId} pill block>Log in</Button>}
      >
        {formContent}
      </AuthFormStage>
    </>
  );
}
