'use client';

import { useState, type FormEvent } from 'react';
import type { DateTime } from 'luxon';
import { Button } from '@plexui/ui/components/Button';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Input } from '@plexui/ui/components/Input';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Select } from '@plexui/ui/components/Select';
import { Switch } from '@plexui/ui/components/Switch';
import { TagInput, type Tag } from '@plexui/ui/components/TagInput';
import { Textarea } from '@plexui/ui/components/Textarea';

const noSubmit = (event: FormEvent) => event.preventDefault();

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'pl', label: 'Polish' },
];

const CURRENCIES = [
  { value: 'eur', label: 'Euro' },
  { value: 'usd', label: 'US dollar' },
  { value: 'gbp', label: 'Pound sterling' },
];

const CATEGORIES = [
  { value: 'home', label: 'Home' },
  { value: 'garden', label: 'Garden' },
  { value: 'office', label: 'Office' },
];

export function FormRowsInputsDemo() {
  return (
    <div data-demo-stage className="flex justify-center py-10">
      <form className="flex w-[480px] max-w-full flex-col gap-6" onSubmit={noSubmit}>
        <FieldGroup title="Contact details">
          <Field row label="First name">
            <Input variant="ghost" defaultValue="Jane" autoComplete="given-name" />
          </Field>
          <Field row label="Last name">
            <Input variant="ghost" defaultValue="Doe" autoComplete="family-name" />
          </Field>
          <Field row label="Email">
            <Input variant="ghost" type="email" placeholder="name@example.com" autoComplete="email" />
          </Field>
          <Field row label="Phone">
            <Input variant="ghost" type="tel" placeholder="Optional" autoComplete="tel" />
          </Field>
        </FieldGroup>
        <FieldGroup title="Delivery">
          <Field row orientation="vertical" label="Address">
            <Input variant="ghost" placeholder="Street and building" autoComplete="street-address" />
          </Field>
          <Field row orientation="vertical" label="Note for the courier">
            <Textarea variant="ghost" rows={2} autoResize placeholder="Gate code, floor, a safe place to leave it" />
          </Field>
        </FieldGroup>
        <Button color="primary" size="3xl" pill type="submit">
          Save
        </Button>
      </form>
    </div>
  );
}

export function FormRowsMixedDemo() {
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('eur');
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [start, setStart] = useState<DateTime | null>(null);

  return (
    <div data-demo-stage className="flex justify-center py-10">
      <form className="flex w-[480px] max-w-full flex-col gap-6" onSubmit={noSubmit}>
        <FieldGroup title="Preferences" description="Saved for every device you sign in on.">
          <Field row label="Language">
            <Select value={language} options={LANGUAGES} onChange={(option) => setLanguage(option.value)} variant="soft" block={false} listMinWidth={180} align="end" />
          </Field>
          <Field row label="Currency">
            <Select value={currency} options={CURRENCIES} onChange={(option) => setCurrency(option.value)} variant="soft" block={false} listMinWidth={180} align="end" />
          </Field>
          <Field row label="Theme">
            <SegmentedControl value={theme} onChange={setTheme} aria-label="Theme">
              <SegmentedControl.Option value="system">System</SegmentedControl.Option>
              <SegmentedControl.Option value="light">Light</SegmentedControl.Option>
              <SegmentedControl.Option value="dark">Dark</SegmentedControl.Option>
            </SegmentedControl>
          </Field>
          <Field row label="Start date">
            <DatePicker value={start} onChange={setStart} triggerDateFormat="MMM d, yyyy" placeholder="Select date" variant="soft" />
          </Field>
          <Field row label="Weekly summary" description="Sent on Mondays.">
            <Switch defaultChecked />
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}

export function FormRowsChoiceDemo() {
  const [plan, setPlan] = useState('team');

  return (
    <div data-demo-stage className="flex justify-center py-10">
      <form className="flex w-[480px] max-w-full flex-col gap-6" onSubmit={noSubmit}>
        <RadioGroup value={plan} onChange={setPlan} direction="col" aria-label="Plan" className="w-full">
          <FieldGroup title="Plan" className="w-full">
            <Field row label="Starter" description="For one person.">
              <RadioGroup.Item value="starter" />
            </Field>
            <Field row label="Team" description="Up to 10 people.">
              <RadioGroup.Item value="team" />
            </Field>
            <Field row label="Business" description="No limit on people.">
              <RadioGroup.Item value="business" />
            </Field>
          </FieldGroup>
        </RadioGroup>
        <FieldGroup title="Email me about">
          <Field row label="New sign-ins">
            <Checkbox defaultChecked />
          </Field>
          <Field row label="Invoices">
            <Checkbox defaultChecked />
          </Field>
          <Field row label="Product news">
            <Checkbox />
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}

export function FormRowsProductDemo() {
  const [category, setCategory] = useState('home');
  const [tags, setTags] = useState<Tag[]>([
    { value: 'New', valid: true },
    { value: 'Sale', valid: true },
  ]);

  return (
    <div data-demo-stage className="flex justify-center py-10">
      <form className="flex w-[480px] max-w-full flex-col gap-6" onSubmit={noSubmit}>
        <FieldGroup title="Product">
          <Field row orientation="vertical" label="Name">
            <Input variant="ghost" defaultValue="Oak side table" />
          </Field>
          <Field row orientation="vertical" label="Description">
            <Textarea variant="ghost" rows={2} autoResize defaultValue="Solid oak with a matte finish. Ships flat, assembles in ten minutes without tools." />
          </Field>
          <Field row label="Price">
            <Input variant="ghost" inputMode="decimal" defaultValue="€129.00" />
          </Field>
          <Field row label="Category">
            <Select value={category} options={CATEGORIES} onChange={(option) => setCategory(option.value)} variant="soft" block={false} listMinWidth={180} align="end" />
          </Field>
          <Field row orientation="vertical" label="Tags">
            <TagInput value={tags} onChange={setTags} variant="ghost" size="md" placeholder="Add a tag" />
          </Field>
          <Field row label="In stock">
            <Switch defaultChecked />
          </Field>
        </FieldGroup>
        <Button color="primary" size="3xl" pill type="submit">
          Save
        </Button>
      </form>
    </div>
  );
}

export function FormRowsActionsDemo() {
  return (
    <div data-demo-stage className="flex justify-center py-10">
      <div className="flex w-[480px] max-w-full flex-col gap-6">
        <FieldGroup title="Account">
          <Field row label="Email" description="jane@example.com">
            <div>
              <Button color="secondary" variant="soft" size="sm">Change</Button>
            </div>
          </Field>
          <Field row label="Password" description="Last changed in March.">
            <div>
              <Button color="secondary" variant="soft" size="sm">Reset</Button>
            </div>
          </Field>
          <Field row label="Delete account" description="This removes your data for good.">
            <div>
              <Button color="danger" variant="soft" size="sm">Delete</Button>
            </div>
          </Field>
        </FieldGroup>
      </div>
    </div>
  );
}

export function FormRowsErrorsDemo() {
  return (
    <div data-demo-stage className="flex justify-center py-10">
      <form className="flex w-[480px] max-w-full flex-col gap-6" onSubmit={noSubmit}>
        <FieldGroup title="Payout details">
          <Field row label="Account holder">
            <Input variant="ghost" defaultValue="Jane Doe" />
          </Field>
          <Field row label="IBAN" errorMessage="Enter a valid IBAN.">
            <Input variant="ghost" defaultValue="ES91 2100" invalid />
          </Field>
          <Field row orientation="vertical" label="Reference" errorMessage="Keep it under 140 characters.">
            <Textarea variant="ghost" rows={2} autoResize defaultValue="Monthly payout for the spring collection, including the two orders that were moved from last month." invalid />
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
