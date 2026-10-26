'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Field } from '@plexui/ui/components/Field';
import { FieldError } from '@plexui/ui/components/FieldError';
import { Input } from '@plexui/ui/components/Input';
import { Textarea } from '@plexui/ui/components/Textarea';
import { Select } from '@plexui/ui/components/Select';
import { Button } from '@plexui/ui/components/Button';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import { Switch } from '@plexui/ui/components/Switch';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { TagInput } from '@plexui/ui/components/TagInput';
import { TextLink } from '@plexui/ui/components/TextLink';
import dynamic from 'next/dynamic';

const Slider = dynamic(
  () => import('@plexui/ui/components/Slider').then((mod) => mod.Slider),
  { ssr: false }
);
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';

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
  const controlId = "demo-switch-" + name.toLowerCase().replace(/\s+/g, "-");

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

export function FieldOverviewDemo() {
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [description, setDescription] = useState(true);
  const [error, setError] = useState(true);
  const [required, setRequired] = useState(true);
  const [horizontal, setHorizontal] = useState(false);
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
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <DemoControlBoolean name="errorMessage" value={error} onChange={setError} />
        <DemoControlBoolean name="required" value={required} onChange={setRequired} />
        <DemoControlBoolean name="horizontal" value={horizontal} onChange={setHorizontal} />
      </div>
      <div data-demo-stage className="py-10">
        <div className={horizontal ? "w-full max-w-[480px]" : "w-full max-w-[320px]"}>
          <Field
            label="Email"
            size={size}
            description={description ? "We'll never share your email with anyone else." : undefined}
            errorMessage={error ? "Please enter a valid email address." : undefined}
            required={required}
            orientation={horizontal ? "horizontal" : "vertical"}
          >
            <Input placeholder="Enter email..." size={size} pill={pill} />
          </Field>
        </div>
      </div>
    </>
  );
}

export function FieldWithDescriptionDemo() {
  return (
    <div className="w-[320px]">
      <Field
        label="Email"
        description="We'll never share your email with anyone else."
      >
        <Input placeholder="Enter email..." />
      </Field>
    </div>
  );
}

export function FieldWithErrorDemo() {
  const [showError, setShowError] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="errorMessage" value={showError} onChange={setShowError} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <Field
            label="Email"
            errorMessage={showError ? 'Please enter a valid email address' : undefined}
          >
            <Input placeholder="Enter email..." />
          </Field>
        </div>
      </div>
    </>
  );
}

export function FieldRequiredDemo() {
  const [required, setRequired] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="required" value={required} onChange={setRequired} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <Field label="Email" required={required}>
            <Input placeholder="Enter email..." />
          </Field>
        </div>
      </div>
    </>
  );
}

export function FieldOrientationDemo() {
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('horizontal');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="orientation">
          <SegmentedControl<'vertical' | 'horizontal'>
            value={orientation}
            onChange={setOrientation}
            aria-label="orientation"
            size="xs"
          >
            <SegmentedControl.Option value="vertical">vertical</SegmentedControl.Option>
            <SegmentedControl.Option value="horizontal">horizontal</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-full max-w-[480px] flex flex-col gap-4">
          <Field label="First name" orientation={orientation}>
            <Input placeholder="Jane" />
          </Field>
          <Field label="Last name" orientation={orientation}>
            <Input placeholder="Doe" />
          </Field>
        </div>
      </div>
    </>
  );
}

export function FieldWithTextareaDemo() {
  return (
    <div className="w-[320px]">
      <Field label="Bio" description="Write a short bio for your profile.">
        <Textarea placeholder="Tell us about yourself..." rows={3} />
      </Field>
    </div>
  );
}

export function FieldWithSelectDemo() {
  const [role, setRole] = useState('');
  return (
    <div className="w-[320px]">
      <Field label="Role" description="Select your primary role.">
        <Select
          placeholder="Select a role..."
          value={role}
          onChange={(opt) => setRole(opt.value)}
          options={[
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ]}
        />
      </Field>
    </div>
  );
}

export function FieldLabelActionDemo() {
  return (
    <div className="w-[320px]">
      <Field label="Password" labelAction={<TextLink href="#reset-password">Forgot password?</TextLink>}>
        <Input type="password" placeholder="Enter password..." />
      </Field>
    </div>
  );
}

export function FieldWithSliderDemo() {
  const [price, setPrice] = useState<number[]>([200, 800]);
  return (
    <div className="w-[400px]">
      <Field label="Price Range" description={`Set your budget range ($${price[0].toLocaleString()} – ${price[1].toLocaleString()}).`}>
        <Slider
          range
          value={price}
          onChange={setPrice}
          min={0}
          max={1000}
          step={10}
          prefixUnit="$"
        />
      </Field>
    </div>
  );
}

export function FieldFieldsetDemo() {
  return (
    <div className="w-[400px]">
      <div className="mb-3">
        <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Address Information</h3>
        <p className="text-xs text-tertiary mt-0.5">We need your address to deliver your order.</p>
      </div>
      <div className="flex flex-col gap-4">
        <Field label="Street Address">
          <Input placeholder="123 Main St" />
        </Field>
        <div className="flex gap-3">
          <Field label="City" className="flex-1">
            <Input placeholder="New York" />
          </Field>
          <Field label="Postal Code" className="flex-1">
            <Input placeholder="90502" />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function FieldWithCheckboxGroupDemo() {
  return (
    <div className="w-[320px]">
      <Field label="Notifications" description="Choose which notifications you'd like to receive.">
        {() => (
          <div className="flex flex-col gap-3 mt-1">
            <Checkbox label="Email notifications" />
            <Checkbox label="Push notifications" />
            <Checkbox label="SMS notifications" />
          </div>
        )}
      </Field>
    </div>
  );
}

export function FieldWithRadioGroupDemo() {
  const [plan, setPlan] = useState('free');
  return (
    <div className="w-[320px]">
      <Field label="Subscription plan" description="Select your preferred plan.">
        {(fieldProps) => (
          <RadioGroup
            aria-label="Subscription plan"
            value={plan}
            onChange={setPlan}
            direction="col"
          >
            <RadioGroup.Item value="free">Free</RadioGroup.Item>
            <RadioGroup.Item value="pro">Pro — $9/mo</RadioGroup.Item>
            <RadioGroup.Item value="enterprise">Enterprise — $29/mo</RadioGroup.Item>
          </RadioGroup>
        )}
      </Field>
    </div>
  );
}

export function FieldWithSwitchDemo() {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="self-stretch mx-auto !max-w-[480px]">
      <Field label="Marketing emails" orientation="horizontal" className="justify-between [--field-horizontal-label-width:auto] [--field-horizontal-control-width:auto] [--field-label-horizontal-offset:0px]">
        {(fieldProps) => (
          <Switch
            id={fieldProps.id}
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        )}
      </Field>
    </div>
  );
}

export function FieldGroupDemo() {
  return (
    <div className="w-[400px] divide-y divide-alpha/15">
      <div className="pb-6">
        <Field
          label="Responses"
          description="Get notified when the assistant responds to requests that take time, like research or image generation."
        >
          {() => (
            <div className="flex flex-col gap-3 mt-1">
              <Checkbox label="Push notifications" defaultChecked />
            </div>
          )}
        </Field>
      </div>
      <div className="py-6">
        <Field
          label="Tasks"
          description="Get notified when tasks you've created have updates."
        >
          {() => (
            <div className="flex flex-col gap-3 mt-1">
              <Checkbox label="Push notifications" />
              <Checkbox label="Email notifications" />
            </div>
          )}
        </Field>
      </div>
    </div>
  );
}

export function FieldValidationDemo() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('bad-email');
  const [submitted, setSubmitted] = useState(true);

  const nameError = submitted && !name ? 'Name is required' : undefined;
  const emailError = submitted && !email.includes('@') ? 'Please enter a valid email address' : undefined;

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="show errors" value={submitted} onChange={setSubmitted} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[320px] flex flex-col gap-4">
          <Field label="Name" required errorMessage={nameError}>
            <Input
              placeholder="Enter your name"
              value={name}
              onChange={(evt) => setName(evt.target.value)}
            />
          </Field>
          <Field label="Email" required errorMessage={emailError}>
            <Input
              placeholder="Enter your email"
              value={email}
              onChange={(evt) => setEmail(evt.target.value)}
            />
          </Field>
        </div>
      </div>
    </>
  );
}

export function FieldFormExampleDemo() {
  const [pill, setPill] = useState(false);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>

      <div data-demo-stage>
        <div className="flex flex-col gap-8 w-full !max-w-[460px]">
          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Payment Method</h3>
              <p className="text-xs text-tertiary mt-0.5">All transactions are secure and encrypted</p>
            </div>

            <Field label="Name on Card">
              <Input placeholder="Evil Rabbit" pill={pill} autoComplete="off" />
            </Field>

            <Field label="Card Number">
              <Input placeholder="1234 5678 9012 3456" pill={pill} autoComplete="off" />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Month">
                {(fieldProps) => (
                  <Select
                    id={fieldProps.id}
                    placeholder="MM"
                    pill={pill}
                    value={month}
                    onChange={(opt) => setMonth(opt.value)}
                    options={Array.from({ length: 12 }, (_, i) => {
                      const v = String(i + 1).padStart(2, '0');
                      return { label: v, value: v };
                    })}
                  />
                )}
              </Field>
              <Field label="Year">
                {(fieldProps) => (
                  <Select
                    id={fieldProps.id}
                    placeholder="YYYY"
                    pill={pill}
                    value={year}
                    onChange={(opt) => setYear(opt.value)}
                    options={Array.from({ length: 10 }, (_, i) => {
                      const v = String(2025 + i);
                      return { label: v, value: v };
                    })}
                  />
                )}
              </Field>
              <Field label="CVV">
                <Input placeholder="123" pill={pill} />
              </Field>
            </div>
          </fieldset>

          <hr className="border-default" />

          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Billing Address</h3>
              <p className="text-xs text-tertiary mt-0.5">The billing address associated with your payment method</p>
            </div>

            <Checkbox label="Same as shipping address" defaultChecked />

            <Field label="Comments">
              <Textarea placeholder="Add any additional comments" />
            </Field>
          </fieldset>

          <div className="flex gap-2">
            <Button color="primary" pill={pill}>Submit</Button>
            <Button color="secondary" variant="outline" pill={pill}>Cancel</Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function FieldOpticalAlignDemo() {
  const [opticallyAlign, setOpticallyAlign] = useState(true);
  const [pill, setPill] = useState(false);

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

// ---------------------------------------------------------------------------
// Birthday composition demos
// ---------------------------------------------------------------------------

const BIRTHDAY_MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((month, index) => ({
  label: month,
  value: String(index + 1).padStart(2, '0'),
}));

const BIRTHDAY_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const day = String(index + 1).padStart(2, '0');
  return { label: day, value: day };
});

const BIRTHDAY_YEAR_OPTIONS = Array.from({ length: 2025 - 1920 + 1 }, (_, index) => {
  const year = String(2025 - index);
  return { label: year, value: year };
});

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

function isValidBirthday(value: string): boolean {
  const parsed = value.match(/^(\d{2})\s\/\s(\d{2})\s\/\s(\d{4})$/);
  if (!parsed) return false;
  const m = Number(parsed[1]);
  const d = Number(parsed[2]);
  const y = Number(parsed[3]);
  if (m < 1 || m > 12) return false;
  const maxDay = new Date(y, m, 0).getDate();
  return d >= 1 && d <= maxDay;
}

export function FieldBirthdayInputDemo() {
  const [birthday, setBirthday] = useState('');

  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const raw = evt.target.value;
      const newDigits = getBirthdayDigits(raw);
      const oldDigits = getBirthdayDigits(birthday);
      if (raw.length < birthday.length && newDigits.length === oldDigits.length) {
        setBirthday(formatBirthdayValue(newDigits.slice(0, -1)));
      } else {
        setBirthday(formatBirthdayValue(raw));
      }
    },
    [birthday],
  );

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[320px]">
        <Field label="Birthday">
          <Input
            placeholder="MM / DD / YYYY"
            value={birthday}
            onChange={handleChange}
            inputMode="numeric"
            maxLength={14}
            autoComplete="off"
          />
        </Field>
      </div>
    </div>
  );
}

export function FieldBirthdayValidationDemo() {
  const [birthday, setBirthday] = useState('02 / 30 / 2001');
  const errorMessage = birthday ? (isValidBirthday(birthday) ? undefined : 'Please enter a valid date.') : undefined;

  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const raw = evt.target.value;
      const newDigits = getBirthdayDigits(raw);
      const oldDigits = getBirthdayDigits(birthday);
      if (raw.length < birthday.length && newDigits.length === oldDigits.length) {
        setBirthday(formatBirthdayValue(newDigits.slice(0, -1)));
      } else {
        setBirthday(formatBirthdayValue(raw));
      }
    },
    [birthday],
  );

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[320px]">
        <Field label="Birthday" errorMessage={errorMessage}>
          <Input
            placeholder="MM / DD / YYYY"
            value={birthday}
            onChange={handleChange}
            inputMode="numeric"
            maxLength={14}
            autoComplete="off"
          />
        </Field>
      </div>
    </div>
  );
}

export function FieldBirthdaySegmentedDemo() {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');

  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const handleSegmentChange = (
    rawValue: string,
    maxLength: number,
    setValue: (value: string) => void,
    nextRef?: React.RefObject<HTMLInputElement | null>,
  ) => {
    const nextValue = rawValue.replace(/\D/g, '').slice(0, maxLength);
    setValue(nextValue);

    if (nextRef && nextValue.length === maxLength) {
      nextRef.current?.focus();
    }
  };

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[320px]">
        <Field label="Birthday">
          <div className="flex items-center gap-2">
            <Input
              value={month}
              onChange={(evt) => handleSegmentChange(evt.target.value, 2, setMonth, dayRef)}
              placeholder="MM"
              inputMode="numeric"
              maxLength={2}
              size="md"
              variant="outline"
              autoComplete="off"
              className="w-[56px]"
            />
            <span className="text-secondary">/</span>
            <Input
              ref={dayRef}
              value={day}
              onChange={(evt) => handleSegmentChange(evt.target.value, 2, setDay, yearRef)}
              placeholder="DD"
              inputMode="numeric"
              maxLength={2}
              size="md"
              variant="outline"
              autoComplete="off"
              className="w-[56px]"
            />
            <span className="text-secondary">/</span>
            <Input
              ref={yearRef}
              value={year}
              onChange={(evt) => handleSegmentChange(evt.target.value, 4, setYear)}
              placeholder="YYYY"
              inputMode="numeric"
              maxLength={4}
              size="md"
              variant="outline"
              autoComplete="off"
              className="w-[80px]"
            />
          </div>
        </Field>
      </div>
    </div>
  );
}

export function FieldBirthdaySelectDemo() {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[320px]">
        <Field label="Birthday">
          {(fieldProps) => (
            <div className="flex gap-2">
              <div className="w-[130px]">
                <Select
                  id={fieldProps.id}
                  value={month}
                  options={BIRTHDAY_MONTH_OPTIONS}
                  placeholder="Month"
                  size="md"
                  variant="outline"
                  onChange={(option) => setMonth(option.value)}
                />
              </div>
              <div className="w-[84px]">
                <Select
                  value={day}
                  options={BIRTHDAY_DAY_OPTIONS}
                  placeholder="Day"
                  size="md"
                  variant="outline"
                  onChange={(option) => setDay(option.value)}
                  aria-label="Day"
                />
              </div>
              <div className="w-[108px]">
                <Select
                  value={year}
                  options={BIRTHDAY_YEAR_OPTIONS}
                  placeholder="Year"
                  size="md"
                  variant="outline"
                  onChange={(option) => setYear(option.value)}
                  aria-label="Year"
                />
              </div>
            </div>
          )}
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form example: User Profile Settings
// ---------------------------------------------------------------------------

export function FieldProfileSettingsDemo() {
  const [pill, setPill] = useState(false);
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('system');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>

      <div data-demo-stage>
        <div className="flex flex-col gap-8 w-full !max-w-[460px]">
          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Personal Information</h3>
              <p className="text-xs text-tertiary mt-0.5">Your public profile details</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <Input placeholder="Jane" defaultValue="Jane" pill={pill} />
              </Field>
              <Field label="Last name">
                <Input placeholder="Doe" defaultValue="Doe" pill={pill} />
              </Field>
            </div>

            <Field label="Email" description="This is the email associated with your account.">
              <Input placeholder="jane@example.com" defaultValue="jane@example.com" pill={pill} />
            </Field>

            <Field label="Bio" description="Brief description for your profile. Max 160 characters.">
              <Textarea placeholder="Tell us about yourself..." rows={3} />
            </Field>
          </fieldset>

          <hr className="border-default" />

          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Preferences</h3>
              <p className="text-xs text-tertiary mt-0.5">Customize your experience</p>
            </div>

            <Field label="Language">
              {(fieldProps) => (
                <Select
                  id={fieldProps.id}
                  pill={pill}
                  value={language}
                  onChange={(opt) => setLanguage(opt.value)}
                  options={[
                    { label: 'English', value: 'en' },
                    { label: 'Spanish', value: 'es' },
                    { label: 'French', value: 'fr' },
                    { label: 'German', value: 'de' },
                    { label: 'Japanese', value: 'ja' },
                  ]}
                />
              )}
            </Field>

            <Field label="Theme" description="Select your preferred appearance.">
              {(fieldProps) => (
                <RadioGroup
                  aria-label="Theme"
                  value={theme}
                  onChange={setTheme}
                  direction="col"
                >
                  <RadioGroup.Item value="system">System</RadioGroup.Item>
                  <RadioGroup.Item value="light">Light</RadioGroup.Item>
                  <RadioGroup.Item value="dark">Dark</RadioGroup.Item>
                </RadioGroup>
              )}
            </Field>
          </fieldset>

          <hr className="border-default" />

          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Notifications</h3>
              <p className="text-xs text-tertiary mt-0.5">Manage how you receive updates</p>
            </div>

            <Field label="Email notifications" description="Receive weekly digests and important updates." orientation="horizontal" className="justify-between [--field-horizontal-label-width:auto] [--field-horizontal-control-width:auto] [--field-label-horizontal-offset:0px]">
              {(fieldProps) => (
                <Switch id={fieldProps.id} defaultChecked />
              )}
            </Field>

            <Field label="Push notifications" description="Get real-time alerts in your browser." orientation="horizontal" className="justify-between [--field-horizontal-label-width:auto] [--field-horizontal-control-width:auto] [--field-label-horizontal-offset:0px]">
              {(fieldProps) => (
                <Switch id={fieldProps.id} />
              )}
            </Field>

            <Field label="Marketing emails" description="Tips, product updates, and promotions." orientation="horizontal" className="justify-between [--field-horizontal-label-width:auto] [--field-horizontal-control-width:auto] [--field-label-horizontal-offset:0px]">
              {(fieldProps) => (
                <Switch id={fieldProps.id} />
              )}
            </Field>
          </fieldset>

          <div className="flex gap-2">
            <Button color="primary" pill={pill}>Save changes</Button>
            <Button color="secondary" variant="outline" pill={pill}>Cancel</Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Form example: Create Project
// ---------------------------------------------------------------------------

export function FieldCreateProjectDemo() {
  const [pill, setPill] = useState(false);
  const [visibility, setVisibility] = useState('private');
  const [region, setRegion] = useState('');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>

      <div data-demo-stage>
        <div className="flex flex-col gap-8 w-full !max-w-[460px]">
          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">General</h3>
              <p className="text-xs text-tertiary mt-0.5">Basic information about your project</p>
            </div>

            <Field label="Project name" required>
              <Input placeholder="my-project" pill={pill} />
            </Field>

            <Field label="Description" description="A short summary shown in project listings.">
              <Textarea placeholder="What does this project do?" rows={3} />
            </Field>

            <Field label="Visibility" description="Controls who can see this project.">
              {() => (
                <RadioGroup
                  aria-label="Visibility"
                  value={visibility}
                  onChange={setVisibility}
                  direction="col"
                >
                  <RadioGroup.Item value="private">Private — only invited members</RadioGroup.Item>
                  <RadioGroup.Item value="internal">Internal — anyone in your organization</RadioGroup.Item>
                  <RadioGroup.Item value="public">Public — visible to everyone</RadioGroup.Item>
                </RadioGroup>
              )}
            </Field>
          </fieldset>

          <hr className="border-default" />

          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Team Access</h3>
              <p className="text-xs text-tertiary mt-0.5">Invite collaborators and set permissions</p>
            </div>

            <Field label="Team members" description="Add people by email address.">
              {(fieldProps) => (
                <TagInput
                  id={fieldProps.id}
                  placeholder="Add email..."
                  defaultValue={[
                    { value: 'alice@team.com', valid: true },
                    { value: 'bob@team.com', valid: true },
                  ]}
                  validator={(v) => v.includes('@')}
                />
              )}
            </Field>

            <Field label="Permissions" description="Default permissions for new members.">
              {() => (
                <div className="flex flex-col gap-3 mt-1">
                  <Checkbox label="Can view project" defaultChecked />
                  <Checkbox label="Can edit resources" defaultChecked />
                  <Checkbox label="Can manage members" />
                  <Checkbox label="Can delete project" />
                </div>
              )}
            </Field>
          </fieldset>

          <hr className="border-default" />

          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Infrastructure</h3>
              <p className="text-xs text-tertiary mt-0.5">Deployment and resource configuration</p>
            </div>

            <Field label="Region">
              {(fieldProps) => (
                <Select
                  id={fieldProps.id}
                  pill={pill}
                  placeholder="Select region..."
                  value={region}
                  onChange={(opt) => setRegion(opt.value)}
                  options={[
                    { label: 'US East (N. Virginia)', value: 'us-east-1' },
                    { label: 'US West (Oregon)', value: 'us-west-2' },
                    { label: 'Europe (Frankfurt)', value: 'eu-central-1' },
                    { label: 'Asia Pacific (Tokyo)', value: 'ap-northeast-1' },
                  ]}
                />
              )}
            </Field>

            <Field label="Auto-deploy" description="Automatically deploy on push to main branch." orientation="horizontal" className="justify-between [--field-horizontal-label-width:auto] [--field-horizontal-control-width:auto] [--field-label-horizontal-offset:0px]">
              {(fieldProps) => (
                <Switch id={fieldProps.id} defaultChecked />
              )}
            </Field>
          </fieldset>

          <div className="flex gap-2">
            <Button color="primary" pill={pill}>Create project</Button>
            <Button color="secondary" variant="outline" pill={pill}>Cancel</Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Form example: Field Configuration (API key / CMS field setup)
// ---------------------------------------------------------------------------

export function FieldConfigurationDemo() {
  const [pill, setPill] = useState(false);
  const [type, setType] = useState('string');
  const [expiresIn, setExpiresIn] = useState('');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>

      <div data-demo-stage>
        <div className="flex flex-col gap-8 w-full !max-w-[460px]">
          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Setup</h3>
              <p className="text-xs text-tertiary mt-0.5">Define the basic field properties</p>
            </div>

            <Field label="Key" description="Unique identifier used in the API. Cannot be changed later.">
              <Input placeholder="registration_method" defaultValue="registration_method" pill={pill} />
            </Field>

            <Field label="Label" description="Human-readable name displayed in the UI.">
              <Input placeholder="Registration method" defaultValue="Registration method" pill={pill} />
            </Field>

            <Field label="Type">
              {(fieldProps) => (
                <Select
                  id={fieldProps.id}
                  pill={pill}
                  value={type}
                  onChange={(opt) => setType(opt.value)}
                  options={[
                    { label: 'String', value: 'string' },
                    { label: 'Number', value: 'number' },
                    { label: 'Boolean', value: 'boolean' },
                    { label: 'Date', value: 'date' },
                    { label: 'JSON', value: 'json' },
                    { label: 'Rich text', value: 'richtext' },
                  ]}
                />
              )}
            </Field>

            <Field label="Default value" description="Value assigned when the field is empty.">
              <Input placeholder="Set default value (optional)" pill={pill} />
            </Field>
          </fieldset>

          <hr className="border-default" />

          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Formatting</h3>
              <p className="text-xs text-tertiary mt-0.5">Input constraints and sanitization rules</p>
            </div>

            <Field label="Max length" description="Max length cannot exceed 4096.">
              <Input placeholder="256" inputMode="numeric" pill={pill} />
            </Field>

            <Field label="HTML sanitization" description="Strip potentially unsafe HTML tags from input." orientation="horizontal" className="justify-between [--field-horizontal-label-width:auto] [--field-horizontal-control-width:auto] [--field-label-horizontal-offset:0px]">
              {(fieldProps) => (
                <Switch id={fieldProps.id} />
              )}
            </Field>
          </fieldset>

          <hr className="border-default" />

          <fieldset className="flex flex-col gap-5">
            <div className="mb-1">
              <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Privacy & Access</h3>
              <p className="text-xs text-tertiary mt-0.5">Control field visibility and mutability</p>
            </div>

            <Field label="Not redactable" description="Prevent this field from being redacted." orientation="horizontal" className="justify-between [--field-horizontal-label-width:auto] [--field-horizontal-control-width:auto] [--field-label-horizontal-offset:0px]">
              {(fieldProps) => (
                <Switch id={fieldProps.id} />
              )}
            </Field>

            <Field label="Write once" description="Value can only be set once and cannot be changed." orientation="horizontal" className="justify-between [--field-horizontal-label-width:auto] [--field-horizontal-control-width:auto] [--field-label-horizontal-offset:0px]">
              {(fieldProps) => (
                <Switch id={fieldProps.id} />
              )}
            </Field>

            <Field label="Expires in" description="Automatically delete the field value after the specified period.">
              {(fieldProps) => (
                <Select
                  id={fieldProps.id}
                  pill={pill}
                  placeholder="Never"
                  value={expiresIn}
                  onChange={(opt) => setExpiresIn(opt.value)}
                  options={[
                    { label: 'Never', value: 'never' },
                    { label: '30 days', value: '30d' },
                    { label: '90 days', value: '90d' },
                    { label: '1 year', value: '1y' },
                  ]}
                />
              )}
            </Field>
          </fieldset>

          <div className="flex gap-2">
            <Button color="primary" pill={pill}>Save field</Button>
            <Button color="secondary" variant="outline" pill={pill}>Cancel</Button>
          </div>
        </div>
      </div>
    </>
  );
}


