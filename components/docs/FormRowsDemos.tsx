'use client';

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import type { DateTime } from 'luxon';
import { Badge } from '@plexui/ui/components/Badge';
import { Button } from '@plexui/ui/components/Button';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Dropdown, InfoCircle, Plus } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { InputGroup } from '@plexui/ui/components/InputGroup';
import { Menu } from '@plexui/ui/components/Menu';
import { Page } from '@plexui/ui/components/Page';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Select } from '@plexui/ui/components/Select';
import { Switch } from '@plexui/ui/components/Switch';
import { Textarea } from '@plexui/ui/components/Textarea';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { DemoControlBoolean, controlsTableStyle } from './ButtonDemos';
import { usePreviewEmbed } from './PreviewEmbed';
import s from './FormRowsDemos.module.css';

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

/** A compact desktop form and a complete phone screen share the same fields. */
function FormScreen({
  title,
  children,
  submitLabel,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  submitLabel?: string;
  wide?: boolean;
}) {
  const formId = useId();

  return (
    <div data-demo-stage className={`${s.ScreenStage} flex justify-center py-10`}>
      <Page className="h-dvh" data-form-screen data-form-width={wide ? 'wide' : undefined}>
        <Page.Header data-form-header>
          <Page.Bar><Page.Title>{title}</Page.Title></Page.Bar>
        </Page.Header>
        <Page.Content data-form-content>
          <form id={formId} className="flex flex-col gap-6" onSubmit={noSubmit}>
            {children}
          </form>
        </Page.Content>
        {submitLabel && (
          <Page.Footer data-form-footer>
            <Button color="primary" size="3xl" pill block type="submit" form={formId}>
              {submitLabel}
            </Button>
          </Page.Footer>
        )}
      </Page>
    </div>
  );
}

export function FormRowsInputsDemo() {
  return (
    <FormScreen title="Edit contact" submitLabel="Save">
      <FieldGroup title="Contact details" columns>
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
    </FormScreen>
  );
}

export function FormRowsMixedDemo() {
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('eur');
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [start, setStart] = useState<DateTime | null>(null);

  return (
    <FormScreen title="Settings">
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
    </FormScreen>
  );
}

export function FormRowsChoiceDemo() {
  const [plan, setPlan] = useState('team');
  const wide = useBreakpoint('md');
  const [signIns, setSignIns] = useState(true);
  const [invoices, setInvoices] = useState(true);
  const [news, setNews] = useState(false);

  return (
    <FormScreen title="Preferences">
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
          {wide ? (
            <Checkbox checked={signIns} onCheckedChange={(value) => setSignIns(value === true)} />
          ) : (
            <Switch checked={signIns} onCheckedChange={setSignIns} />
          )}
        </Field>
        <Field row label="Invoices">
          {wide ? (
            <Checkbox checked={invoices} onCheckedChange={(value) => setInvoices(value === true)} />
          ) : (
            <Switch checked={invoices} onCheckedChange={setInvoices} />
          )}
        </Field>
        <Field row label="Product news">
          {wide ? (
            <Checkbox checked={news} onCheckedChange={(value) => setNews(value === true)} />
          ) : (
            <Switch checked={news} onCheckedChange={setNews} />
          )}
        </Field>
      </FieldGroup>
    </FormScreen>
  );
}

export function FormRowsProductDemo() {
  const [category, setCategory] = useState('home');
  const [tags, setTags] = useState(['new', 'sale']);

  return (
    <FormScreen title="Edit product" submitLabel="Save">
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
    </FormScreen>
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

function ProductFields({ columns = false }: { columns?: boolean }) {
  const [category, setCategory] = useState('home');
  const [unit, setUnit] = useState('kg');
  const [materials, setMaterials] = useState(['oak', 'steel']);
  const [labels, setLabels] = useState(['new']);

  return (
    <>
      <Image src="/demo/picture-3.svg" alt="Product" width={112} height={112} className="mx-auto block size-28 rounded-3xl object-cover" />
      <FieldGroup columns={columns}>
        <Field row orientation="vertical" label="Name">
          <Input variant="ghost" defaultValue="Oak side table" />
        </Field>
        <Field row orientation="vertical" label="Description">
          <Textarea variant="ghost" rows={2} autoResize defaultValue="Solid oak with a matte finish. Ships flat, assembles in ten minutes without tools." />
        </Field>
      </FieldGroup>
      <FieldGroup columns={columns}>
        <Field row label="Category" description={columns ? undefined : 'Also shown under Sale.'}>
          <Select value={category} options={CATEGORIES} onChange={(option) => setCategory(option.value)} block={false} align={columns ? 'start' : 'end'} />
        </Field>
        <Field row label="Price">
          <Input defaultValue="129" inputMode="decimal" endAdornment={<span className="text-secondary">€</span>} />
        </Field>
        <Field row label="Weight">
          {(control) => (
          <InputGroup>
            <InputGroup.Input {...control} defaultValue="12" inputMode="decimal" />
            <InputGroup.Addon align="inline-end">
              <Menu>
                <Menu.Trigger>
                  <InputGroup.Button aria-label="Unit" className="text-secondary text-sm font-normal">
                    {unit}
                    <Dropdown data-no-autosize width={8} height={12} className="ms-1 opacity-75" />
                  </InputGroup.Button>
                </Menu.Trigger>
                <Menu.Content align="end" minWidth="auto">
                  {UNITS.map((item) => (
                    <Menu.CheckboxItem key={item.value} checked={unit === item.value} onCheckedChange={() => setUnit(item.value)} indicatorPosition="start" indicatorVariant="ghost">
                      {item.label}
                    </Menu.CheckboxItem>
                  ))}
                </Menu.Content>
              </Menu>
            </InputGroup.Addon>
          </InputGroup>
          )}
        </Field>
      </FieldGroup>
      <FieldGroup columns={columns}>
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
      <FieldGroup columns={columns}>
        <TagRow label="Materials" one="material" options={MATERIALS} value={materials} onChange={setMaterials} />
        <TagRow label="Labels" one="label" options={LABELS} value={labels} onChange={setLabels} />
      </FieldGroup>
    </>
  );
}

export function FormRowsGroupsDemo() {
  const [columns, setColumns] = useState(false);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="columns" value={columns} onChange={setColumns} />
      </div>
      <FormScreen title="Edit product" submitLabel="Save changes" wide>
        <ProductFields columns={columns} />
      </FormScreen>
    </>
  );
}

export function FormRowsTagsDemo() {
  const [materials, setMaterials] = useState(['oak', 'steel', 'linen', 'glass', 'wool']);
  const [labels, setLabels] = useState(['new']);

  return (
    <FormScreen title="Product tags" wide>
      <FieldGroup>
        <TagRow label="Materials" one="material" options={MATERIALS} value={materials} onChange={setMaterials} />
        <TagRow label="Labels" one="label" options={LABELS} value={labels} onChange={setLabels} />
      </FieldGroup>
    </FormScreen>
  );
}

export function FormRowsDialogDemo() {
  const heading = useRef<HTMLDivElement>(null);
  const phonePreview = usePreviewEmbed() !== null;
  const [open, setOpen] = useState(false);

  return (
    <div data-demo-stage className="flex justify-center py-10">
      <Dialog open={phonePreview || open} onOpenChange={setOpen}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline" pill>Edit product</Button>
        </Dialog.Trigger>
        <Dialog.Content mobileVariant="sheet" width={600} pill onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus(); }}>
          <Dialog.Header>
            <div ref={heading} tabIndex={-1} className="outline-none">
              <Dialog.Title className="flex items-center gap-2">
                Edit product
                <Badge variant="outline" size="md" pill>English</Badge>
              </Dialog.Title>
            </div>
            <Dialog.Description className="sr-only">Edit product details and save your changes.</Dialog.Description>
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
    <FormScreen title="Account settings">
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
    </FormScreen>
  );
}

export function FormRowsErrorsDemo() {
  return (
    <FormScreen title="Edit payout details">
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
    </FormScreen>
  );
}
