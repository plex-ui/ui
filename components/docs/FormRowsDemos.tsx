'use client';

import { useState, type FormEvent } from 'react';
import type { DateTime } from 'luxon';
import { Badge } from '@plexui/ui/components/Badge';
import { Button } from '@plexui/ui/components/Button';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { InfoCircle, Plus } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Select } from '@plexui/ui/components/Select';
import { Switch } from '@plexui/ui/components/Switch';
import { Textarea } from '@plexui/ui/components/Textarea';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';

const noSubmit = (event: FormEvent) => event.preventDefault();

type TagOption = { value: string; label: string; color?: 'discovery' | 'danger' | 'warning' };

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

const UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
];

const MATERIALS: TagOption[] = [
  { value: 'oak', label: 'Oak' },
  { value: 'steel', label: 'Steel' },
  { value: 'linen', label: 'Linen' },
  { value: 'glass', label: 'Glass' },
  { value: 'wool', label: 'Wool' },
];

const LABELS: TagOption[] = [
  { value: 'new', label: 'New', color: 'discovery' },
  { value: 'sale', label: 'Sale', color: 'danger' },
  { value: 'limited', label: 'Limited', color: 'warning' },
];

export function FormRowsInputsDemo() {
  return (
    <div data-demo-stage className="flex justify-center py-10">
      <form className="flex w-[480px] max-w-full flex-col gap-6" onSubmit={noSubmit}>
        <FieldGroup title="Contact details">
          <Field row label="First name">
            <Input defaultValue="Jane" autoComplete="given-name" />
          </Field>
          <Field row label="Last name">
            <Input defaultValue="Doe" autoComplete="family-name" />
          </Field>
          <Field row label="Email">
            <Input type="email" placeholder="name@example.com" autoComplete="email" />
          </Field>
          <Field row label="Phone">
            <Input type="tel" placeholder="Optional" autoComplete="tel" />
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
            <Select value={language} options={LANGUAGES} onChange={(option) => setLanguage(option.value)} block={false} align="end" />
          </Field>
          <Field row label="Currency">
            <Select value={currency} options={CURRENCIES} onChange={(option) => setCurrency(option.value)} block={false} align="end" />
          </Field>
          <Field row label="Theme">
            <SegmentedControl value={theme} onChange={setTheme} aria-label="Theme">
              <SegmentedControl.Option value="system">System</SegmentedControl.Option>
              <SegmentedControl.Option value="light">Light</SegmentedControl.Option>
              <SegmentedControl.Option value="dark">Dark</SegmentedControl.Option>
            </SegmentedControl>
          </Field>
          <Field row label="Start date">
            <DatePicker value={start} onChange={setStart} triggerDateFormat="MMM d, yyyy" placeholder="Select date" />
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
  const [tags, setTags] = useState(['new', 'sale']);

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
            <Input defaultValue="129" inputMode="decimal" endAdornment={<span className="text-secondary">€</span>} />
          </Field>
          <Field row label="Category">
            <Select value={category} options={CATEGORIES} onChange={(option) => setCategory(option.value)} block={false} align="end" />
          </Field>
          <TagRow label="Tags" one="tag" options={LABELS} value={tags} onChange={setTags} />
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

function AddButton({ one, onClick }: { one: string; onClick?: () => void }) {
  const wide = useBreakpoint('md');

  return (
    <Tooltip content={wide ? `Add ${one}` : null}>
      <Button uniform={wide} pill color="secondary" variant="soft" aria-label={`Add ${one}`} onClick={onClick}>
        {wide ? <Plus /> : 'Add'}
      </Button>
    </Tooltip>
  );
}

function TagRow({
  label,
  one,
  options,
  value,
  onChange,
}: {
  label: string;
  one: string;
  options: TagOption[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Field
      row
      fill
      label={label}
      action={
        <Select
          multiple
          block={false}
          align="end"
          aria-label={`Add ${one}`}
          options={options}
          value={value}
          onChange={(selected) => onChange(selected.map((option) => option.value))}
          trigger={({ onToggle }) => <AddButton one={one} onClick={onToggle} />}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        {options.filter((option) => value.includes(option.value)).map((option) => (
          <Badge
            key={option.value}
            size="xl"
            pill
            variant={option.color ? 'solid' : 'outline'}
            color={option.color ?? 'secondary'}
            removeLabel={`Remove ${option.label}`}
            onRemove={() => onChange(value.filter((item) => item !== option.value))}
          >
            {option.label}
          </Badge>
        ))}
      </div>
    </Field>
  );
}

function ProductFields() {
  const [category, setCategory] = useState('home');
  const [unit, setUnit] = useState('kg');
  const [materials, setMaterials] = useState(['oak', 'steel']);
  const [labels, setLabels] = useState(['new']);

  return (
    <>
      <img src="/demo/picture-3.svg" alt="Product" className="mx-auto block size-28 rounded-3xl object-cover" />
      <FieldGroup>
        <Field row orientation="vertical" label="Name">
          <Input variant="ghost" defaultValue="Oak side table" />
        </Field>
        <Field row orientation="vertical" label="Description">
          <Textarea variant="ghost" rows={2} autoResize defaultValue="Solid oak with a matte finish. Ships flat, assembles in ten minutes without tools." />
        </Field>
      </FieldGroup>
      <FieldGroup>
        <Field row label="Category" description="Also shown under Sale.">
          <Select value={category} options={CATEGORIES} onChange={(option) => setCategory(option.value)} block={false} align="end" />
        </Field>
        <Field row label="Price">
          <Input defaultValue="129" inputMode="decimal" endAdornment={<span className="text-secondary">€</span>} />
        </Field>
        <Field row label="Weight">
          <Input
            defaultValue="12"
            inputMode="decimal"
            endAdornment={<Select aria-label="Unit" value={unit} options={UNITS} onChange={(option) => setUnit(option.value)} variant="ghost" align="end" />}
          />
        </Field>
      </FieldGroup>
      <FieldGroup>
        <Field
          row
          fill
          label="Variants"
          labelAction={<Tooltip content="Sizes and finishes a buyer can choose."><InfoCircle className="text-tertiary" /></Tooltip>}
          action={<AddButton one="variant" />}
        >
          <div />
        </Field>
      </FieldGroup>
      <FieldGroup>
        <TagRow label="Materials" one="material" options={MATERIALS} value={materials} onChange={setMaterials} />
        <TagRow label="Labels" one="label" options={LABELS} value={labels} onChange={setLabels} />
      </FieldGroup>
    </>
  );
}

export function FormRowsGroupsDemo() {
  return (
    <div data-demo-stage className="flex justify-center py-10">
      <form className="flex w-[520px] max-w-full flex-col gap-6" onSubmit={noSubmit}>
        <ProductFields />
        <Button color="primary" size="3xl" pill type="submit">
          Save changes
        </Button>
      </form>
    </div>
  );
}

export function FormRowsTagsDemo() {
  const [materials, setMaterials] = useState(['oak', 'steel', 'linen', 'glass', 'wool']);
  const [labels, setLabels] = useState(['new']);

  return (
    <div data-demo-stage className="flex justify-center py-10">
      <div className="w-[520px] max-w-full">
        <FieldGroup>
          <TagRow label="Materials" one="material" options={MATERIALS} value={materials} onChange={setMaterials} />
          <TagRow label="Labels" one="label" options={LABELS} value={labels} onChange={setLabels} />
        </FieldGroup>
      </div>
    </div>
  );
}

export function FormRowsDialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div data-demo-stage className="flex justify-center py-10">
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline" pill>Edit product</Button>
        </Dialog.Trigger>
        <Dialog.Content width={600} pill>
          <Dialog.Header>
            <Dialog.Title className="flex items-center gap-2">
              Edit product
              <Badge variant="outline" size="md" pill>English</Badge>
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body className="flex flex-col gap-6">
            <ProductFields />
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close>
              <Button color="secondary" variant="outline" pill>Cancel</Button>
            </Dialog.Close>
            <Button color="primary" pill onClick={() => setOpen(false)}>Save changes</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
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
              <Button pill color="secondary" variant="soft">Change</Button>
            </div>
          </Field>
          <Field row label="Password" description="Last changed in March.">
            <div>
              <Button pill color="secondary" variant="soft">Reset</Button>
            </div>
          </Field>
          <Field row label="Delete account" description="This removes your data for good.">
            <div>
              <Button pill color="danger" variant="soft">Delete</Button>
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
            <Input defaultValue="Jane Doe" />
          </Field>
          <Field row label="IBAN" errorMessage="Enter a valid IBAN.">
            <Input defaultValue="ES91 2100" invalid />
          </Field>
          <Field row orientation="vertical" label="Reference" errorMessage="Keep it under 140 characters.">
            <Textarea variant="ghost" rows={2} autoResize defaultValue="Monthly payout for the spring collection, including the two orders that were moved from last month." invalid />
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
