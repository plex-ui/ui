'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import Image from 'next/image';
import type { DateTime } from 'luxon';
import { Badge } from '@plexui/ui/components/Badge';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Dialog } from '@plexui/ui/components/Dialog';
import { EmptyMessage } from '@plexui/ui/components/EmptyMessage';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Disclosure, Plus } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { InputGroup } from '@plexui/ui/components/InputGroup';
import { Menu } from '@plexui/ui/components/Menu';
import { Page } from '@plexui/ui/components/Page';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Select, type Option } from '@plexui/ui/components/Select';
import { DropdownIcon } from '@plexui/ui/components/SelectControl';
import { Switch } from '@plexui/ui/components/Switch';
import { Textarea } from '@plexui/ui/components/Textarea';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { DemoControlBoolean, controlsTableStyle } from './ButtonDemos';
import { DemoBackButton } from './DemoBackButton';
import { MobileTagRow } from './MobileTagRow';
import { ProductVariants, type ProductVariant } from './ProductVariants';
import { AuthFields } from './AuthFields';
import { AuthInput } from './AuthInput';
import { usePhoneViewport, usePreviewEmbed } from './PreviewEmbed';
import { removeTagWithFocus } from './tagRemovalFocus';
import { ScreenPresentationControls, useScreenPresentation, type ScreenSurface } from './ScreenPresentationControls';
import { useDialogStagePresence } from './useDialogStagePresence';
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

type Theme = 'system' | 'light' | 'dark';

const THEMES: Option<Theme>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
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
export function FormScreen({
  title,
  children,
  submitLabel,
  wide = false,
  onSubmit = noSubmit,
  noValidate = false,
  dialog = false,
  surface = 'grouped',
  fill = false,
  onDialogChange,
}: {
  title: string;
  children: ReactNode;
  submitLabel?: string;
  wide?: boolean;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  noValidate?: boolean;
  dialog?: boolean;
  surface?: ScreenSurface;
  /** Fill the available content area for a full empty state. */
  fill?: boolean;
  onDialogChange?: (open: boolean) => void;
}) {
  const formId = useId();
  const heading = useRef<HTMLDivElement>(null);
  const phonePreview = usePreviewEmbed() !== null;
  const hiddenPhoneHost = usePhoneViewport() && !phonePreview;
  const { open: dialogOpen, present: dialogPresent, onOpenAutoFocus: onDialogScopeOpen, onCloseAutoFocus: onDialogScopeClose, pageRef: bindPage } = useDialogStagePresence(dialog, !hiddenPhoneHost);
  const showDialog = dialogPresent;
  const form = <form id={formId} data-form-content={showDialog || undefined} className={`flex flex-col gap-6 [--field-group-gap:11px]${fill ? ` ${s.FillForm}` : ''}`} onSubmit={(event) => {
    onSubmit(event);
    if (showDialog && !phonePreview) onDialogChange?.(false);
  }} noValidate={noValidate}>{children}</form>;

  if (showDialog) return <div data-demo-stage className={`${s.ScreenStage} flex justify-center py-10`}>
    <Dialog open={dialogOpen} onOpenChange={phonePreview ? undefined : onDialogChange}>
      <Dialog.Content mobileVariant="sheet" surface={surface} width={wide ? 600 : 480} className={s.FormDialog}
        onCloseAutoFocus={onDialogScopeClose}
        onOpenAutoFocus={(event) => { onDialogScopeOpen(event); event.preventDefault(); if (!phonePreview) heading.current?.focus({ preventScroll: true }); }}>
        <Toolbar>
          <Toolbar.Leading>
            <Dialog.Close><NavigationButton action="close" aria-label="Close dialog" /></Dialog.Close>
          </Toolbar.Leading>
          <Toolbar.Title>{title}</Toolbar.Title>
        </Toolbar>
        <Dialog.Header>
          <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>{title}</Dialog.Title></div>
          <Dialog.Description className="sr-only">Review and edit this form.</Dialog.Description>
        </Dialog.Header>
        <Dialog.Body className={fill ? s.FillContent : undefined}>{form}</Dialog.Body>
        {submitLabel && <Dialog.Footer>
          <Dialog.Close><Button color="secondary" variant="outline" pill>Cancel</Button></Dialog.Close>
          <Button color="primary" pill type="submit" form={formId}>{submitLabel}</Button>
        </Dialog.Footer>}
        {submitLabel && <Toolbar placement="bottom">
          <Toolbar.Content fill><Button color="primary" pill block type="submit" form={formId}>{submitLabel}</Button></Toolbar.Content>
        </Toolbar>}
      </Dialog.Content>
    </Dialog>
  </div>;

  return (
    <div data-demo-stage className={`${s.ScreenStage} flex justify-center py-10`}>
      <Page ref={bindPage} tabIndex={-1} role="region" aria-label={title} surface={surface} className="h-dvh" data-form-screen data-form-width={wide ? 'wide' : undefined}>
        <Toolbar>
          <Toolbar.Leading><DemoBackButton /></Toolbar.Leading>
          <Toolbar.Title>{title}</Toolbar.Title>
        </Toolbar>
        <Page.Content fill={fill} data-form-content data-form-content-fill={fill || undefined}>
          {form}
        </Page.Content>
        {submitLabel && (
          <Page.Footer data-form-footer>
            {/* A desktop form ends with its action at the end, as the dialog's footer does; a phone takes the bottom Toolbar */}
            <Button color="primary" pill type="submit" form={formId}>
              {submitLabel}
            </Button>
          </Page.Footer>
        )}
        {submitLabel && (
          <Toolbar placement="bottom">
            <Toolbar.Content fill>
              <Button color="primary" pill block type="submit" form={formId}>{submitLabel}</Button>
            </Toolbar.Content>
          </Toolbar>
        )}
      </Page>
    </div>
  );
}

export function FormRowsInputsDemo() {
  const presentation = useScreenPresentation();
  const [values, setValues] = useState({ first: 'Jane', last: 'Doe', email: '', phone: '', address: '', note: '' });
  const change = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  return (
    <><div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Edit contact" submitLabel="Save" {...presentation} onDialogChange={presentation.setDialog}>
      <FieldGroup title="Contact details" columns>
        <Field row label="First name">
          <Input value={values.first} onChange={(event) => change('first', event.target.value)} autoComplete="given-name" />
        </Field>
        <Field row label="Last name">
          <Input value={values.last} onChange={(event) => change('last', event.target.value)} autoComplete="family-name" />
        </Field>
        <Field row label="Email">
          <Input type="email" value={values.email} onChange={(event) => change('email', event.target.value)} placeholder="name@example.com" autoComplete="email" />
        </Field>
        <Field row label="Phone">
          <Input type="tel" value={values.phone} onChange={(event) => change('phone', event.target.value)} placeholder="Optional" autoComplete="tel" />
        </Field>
      </FieldGroup>
      <FieldGroup title="Delivery">
        <Field row orientation="vertical" label="Address">
          <Input variant="ghost" value={values.address} onChange={(event) => change('address', event.target.value)} placeholder="Street and building" autoComplete="street-address" />
        </Field>
        <Field row orientation="vertical" label="Note for the courier">
          <Textarea variant="ghost" rows={2} autoResize maxRows={6} value={values.note} onChange={(event) => change('note', event.target.value)} placeholder="Gate code, floor, a safe place to leave it" />
        </Field>
      </FieldGroup>
    </FormScreen></>
  );
}

export function FormRowsMixedDemo() {
  const presentation = useScreenPresentation();
  const [summary, setSummary] = useState(true);
  const wide = useBreakpoint('md');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('eur');
  const [theme, setTheme] = useState<Theme>('system');
  const [start, setStart] = useState<DateTime | null>(null);

  return (
    <><div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Settings" {...presentation} onDialogChange={presentation.setDialog}>
      <FieldGroup
        title="Preferences"
        footer="Saved for every device you sign in on."
      >
        <Field row label="Language">
          <Select value={language} options={LANGUAGES} onChange={(option) => setLanguage(option.value)} block={false} align="end" />
        </Field>
        <Field row label="Currency">
          <Select value={currency} options={CURRENCIES} onChange={(option) => setCurrency(option.value)} block={false} align="end" />
        </Field>
        <Field row label="Theme">
          {wide ? (
            <SegmentedControl value={theme} onChange={setTheme} aria-label="Theme">
              <SegmentedControl.Option value="system">System</SegmentedControl.Option>
              <SegmentedControl.Option value="light">Light</SegmentedControl.Option>
              <SegmentedControl.Option value="dark">Dark</SegmentedControl.Option>
            </SegmentedControl>
          ) : (
            <Select value={theme} options={THEMES} onChange={(option) => setTheme(option.value)} block={false} align="end" />
          )}
        </Field>
        <Field row label="Start date">
          <DatePicker value={start} onChange={setStart} triggerDateFormat="MMM d, yyyy" triggerShowIcon={wide} placeholder="Select date" />
        </Field>
        <Field row label="Weekly summary" description="Sent on Mondays.">
          <Switch color="accent" checked={summary} onCheckedChange={setSummary} />
        </Field>
      </FieldGroup>
    </FormScreen></>
  );
}

export function FormRowsChoiceDemo() {
  const presentation = useScreenPresentation();
  const [plan, setPlan] = useState('team');
  const wide = useBreakpoint('md');
  const [signIns, setSignIns] = useState(true);
  const [invoices, setInvoices] = useState(true);
  const [news, setNews] = useState(false);

  return (
    <><div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Preferences" {...presentation} onDialogChange={presentation.setDialog}>
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
            <Switch color="accent" checked={signIns} onCheckedChange={setSignIns} />
          )}
        </Field>
        <Field row label="Invoices">
          {wide ? (
            <Checkbox checked={invoices} onCheckedChange={(value) => setInvoices(value === true)} />
          ) : (
            <Switch color="accent" checked={invoices} onCheckedChange={setInvoices} />
          )}
        </Field>
        <Field row label="Product news">
          {wide ? (
            <Checkbox checked={news} onCheckedChange={(value) => setNews(value === true)} />
          ) : (
            <Switch color="accent" checked={news} onCheckedChange={setNews} />
          )}
        </Field>
      </FieldGroup>
    </FormScreen></>
  );
}

export function FormRowsProductDemo() {
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const [category, setCategory] = useState('home');
  const [tags, setTags] = useState(['new', 'sale']);
  const [tagOptions, setTagOptions] = useState(LABELS);
  const [name, setName] = useState('Oak side table');
  const [description, setDescription] = useState('Solid oak with a matte finish. Ships flat, assembles in ten minutes without tools.');
  const [price, setPrice] = useState('129');
  const [inStock, setInStock] = useState(true);

  return (
    <><div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Edit product" submitLabel="Save" {...presentation} onDialogChange={presentation.setDialog}>
      <FieldGroup title="Product" columns={!wide}>
        <Field row orientation="vertical" label="Name">
          <Input variant="ghost" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field row orientation="vertical" label="Description">
          <Textarea variant="ghost" rows={2} autoResize value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <Field row label="Price">
          <Input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" endAdornment={<span className="text-secondary">€</span>} />
        </Field>
        <Field row label="Category">
          <Select value={category} options={CATEGORIES} onChange={(option) => setCategory(option.value)} block={false} align={wide ? 'end' : 'start'} />
        </Field>
        <TagRow label="Tags" one="tag" options={tagOptions} onOptionsChange={setTagOptions} value={tags} onChange={setTags} />
        <Field row label="In stock">
          <Switch color="accent" checked={inStock} onCheckedChange={setInStock} />
        </Field>
      </FieldGroup>
    </FormScreen></>
  );
}

function AddButton({ one, onClick }: { one: string; onClick?: () => void }) {
  const wide = useBreakpoint('md');

  return (
    <Tooltip content={wide ? `Add ${one}` : null}>
      <Button data-tag-add uniform={wide} pill color={wide ? 'secondary' : 'info'} variant={wide ? 'soft' : 'ghost'} aria-label={`Add ${one}`} onClick={onClick}>
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
  onOptionsChange,
}: {
  label: string;
  one: string;
  options: TagOption[];
  value: string[];
  onChange: (value: string[]) => void;
  onOptionsChange: (value: TagOption[]) => void;
}) {
  const wide = useBreakpoint('md');
  const available = options;
  if (!wide) return <MobileTagRow label={label} one={one} options={available}
    onOptionsChange={onOptionsChange} value={value} onChange={onChange} />;

  return (
    <Field
      row
      fill
      data-tag-row
      className="max-md:[--field-row-action-size:44px] max-md:[--button-size-md:44px]"
      label={label}
      action={
        <Select
          multiple
          block={false}
          align="end"
          aria-label={`Add ${one}`}
          options={available}
          value={value}
          onChange={(selected) => onChange(selected.map((option) => option.value))}
          trigger={({ onToggle }) => <AddButton one={one} onClick={onToggle} />}
        />
      }
    >
      <div data-tag-list className="flex flex-wrap gap-2">
        {available.filter((option) => value.includes(option.value)).map((option) => (
          <Badge
            key={option.value}
            size="xl"
            pill
            variant={option.color ? 'solid' : 'outline'}
            color={option.color ?? 'secondary'}
            removeLabel={`Remove ${option.label}`}
            onRemove={(event) => removeTagWithFocus(event, () => onChange(value.filter((item) => item !== option.value)))}
          >
            {option.label}
          </Badge>
        ))}
      </div>
    </Field>
  );
}

function useProductFieldsState() {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [name, setName] = useState('Oak side table');
  const [description, setDescription] = useState('Solid oak with a matte finish. Ships flat, assembles in ten minutes without tools.');
  const [price, setPrice] = useState('129');
  const [weight, setWeight] = useState('12');
  const [category, setCategory] = useState('home');
  const [unit, setUnit] = useState('kg');
  const [materials, setMaterials] = useState(['oak', 'steel']);
  const [labels, setLabels] = useState(['new']);
  const [materialOptions, setMaterialOptions] = useState(MATERIALS);
  const [labelOptions, setLabelOptions] = useState(LABELS);
  return { name, setName, description, setDescription, price, setPrice, weight, setWeight,
    category, setCategory, unit, setUnit, materials, setMaterials, labels, setLabels,
    materialOptions, setMaterialOptions, labelOptions, setLabelOptions, variants, setVariants };
}

function ProductFields({ columns: columnsOverride, state }: { columns?: boolean; state: ReturnType<typeof useProductFieldsState> }) {
  const wide = useBreakpoint('md');
  const columns = columnsOverride ?? !wide;
  const { name, setName, description, setDescription, price, setPrice, weight, setWeight,
    category, setCategory, unit, setUnit, materials, setMaterials, labels, setLabels,
    materialOptions, setMaterialOptions, labelOptions, setLabelOptions, variants, setVariants } = state;

  return (
    <>
      <Image src="/demo/picture-3.svg" alt="Product" width={112} height={112} className="mx-auto block size-28 rounded-3xl object-cover" />
      <FieldGroup columns={columns}>
        <Field row orientation="vertical" label="Name">
          <Input variant="ghost" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field row orientation="vertical" label="Description">
          <Textarea variant="ghost" rows={2} autoResize value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
      </FieldGroup>
      <FieldGroup columns={columns}>
        <Field row label="Category" description={columns ? undefined : 'Also shown under Sale.'}>
          <Select value={category} options={CATEGORIES} onChange={(option) => setCategory(option.value)} block={false} align={columns ? 'start' : 'end'} />
        </Field>
        <Field row label="Price">
          <Input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" endAdornment={<span className="text-secondary">€</span>} />
        </Field>
        <Field row label="Weight">
          {(control) => (
          <InputGroup>
            <InputGroup.Input {...control} value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" />
            <InputGroup.Addon align="inline-end">
              <Menu>
                <Menu.Trigger>
                  <InputGroup.Button aria-label={`Unit: ${unit}`} className="text-secondary md:text-sm font-normal">
                    {unit}
                    <span className="ms-1"><DropdownIcon iconType="dropdown" /></span>
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
        <ProductVariants value={variants} onChange={setVariants} wide={wide} />
      </FieldGroup>
      <FieldGroup columns={columns}>
        <TagRow label="Materials" one="material" options={materialOptions} onOptionsChange={setMaterialOptions} value={materials} onChange={setMaterials} />
        <TagRow label="Labels" one="label" options={labelOptions} onOptionsChange={setLabelOptions} value={labels} onChange={setLabels} />
      </FieldGroup>
    </>
  );
}

export function FormRowsGroupsDemo() {
  const presentation = useScreenPresentation();
  const product = useProductFieldsState();
  const wide = useBreakpoint('md');
  const phoneViewport = usePhoneViewport();
  const [columnsOverride, setColumns] = useState<boolean>();
  const columns = columnsOverride ?? (phoneViewport || !wide);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="columns" value={columns} onChange={setColumns} />
        <ScreenPresentationControls {...presentation} />
      </div>
      <FormScreen title="Edit product" submitLabel="Save changes" wide {...presentation} onDialogChange={presentation.setDialog}>
        <ProductFields columns={columns} state={product} />
      </FormScreen>
    </>
  );
}

export function FormRowsTagsDemo() {
  const presentation = useScreenPresentation();
  const [materials, setMaterials] = useState(['oak', 'steel', 'linen', 'glass', 'wool']);
  const [labels, setLabels] = useState(['new']);
  const [materialOptions, setMaterialOptions] = useState(MATERIALS);
  const [labelOptions, setLabelOptions] = useState(LABELS);

  return (
    <><div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <FormScreen title="Product tags" wide {...presentation} onDialogChange={presentation.setDialog}>
      <FieldGroup>
        <TagRow label="Materials" one="material" options={materialOptions} onOptionsChange={setMaterialOptions} value={materials} onChange={setMaterials} />
        <TagRow label="Labels" one="label" options={labelOptions} onOptionsChange={setLabelOptions} value={labels} onChange={setLabels} />
      </FieldGroup>
    </FormScreen></>
  );
}

export function FormRowsActionsDemo() {
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const editFormId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreButton = useRef<HTMLButtonElement>(null);
  const firstAction = useRef<HTMLButtonElement>(null);
  const focusRestored = useRef(false);
  const [panel, setPanel] = useState<'email' | 'password' | 'delete' | null>(null);
  const [email, setEmail] = useState('jane@example.com');
  const [emailDraft, setEmailDraft] = useState(email);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordDescription, setPasswordDescription] = useState('Last changed in March.');
  const [deleted, setDeleted] = useState(false);
  const openEmail = (event: MouseEvent<HTMLButtonElement>) => { trigger.current = event.currentTarget; setEmailDraft(email); setPanel('email'); };
  const openPassword = (event: MouseEvent<HTMLButtonElement>) => { trigger.current = event.currentTarget; setPasswordDraft(''); setPanel('password'); };
  const openDelete = (event: MouseEvent<HTMLButtonElement>) => { trigger.current = event.currentTarget; setPanel('delete'); };
  const restore = () => {
    setEmail('jane@example.com');
    setPasswordDescription('Last changed in March.');
    setDeleted(false);
    focusRestored.current = true;
  };
  // Restore removes its own button: focus moves to the first action of the restored account.
  useEffect(() => {
    if (deleted || !focusRestored.current) return;
    focusRestored.current = false;
    firstAction.current?.focus();
  }, [deleted]);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (panel === 'email') setEmail(emailDraft);
    if (panel === 'password') setPasswordDescription('Updated in this preview.');
    setPasswordDraft('');
    setPanel(null);
  };

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
      <FormScreen title="Account settings" {...presentation} onDialogChange={presentation.setDialog} fill={deleted}>
        {deleted ? (
          <EmptyMessage>
            <EmptyMessage.Title>No sample account</EmptyMessage.Title>
            <EmptyMessage.Description>The account was removed from this preview.</EmptyMessage.Description>
            <EmptyMessage.ActionRow><Button ref={restoreButton} color="primary" size="xl" onClick={restore}>Restore sample account</Button></EmptyMessage.ActionRow>
          </EmptyMessage>
        ) : wide ? (
          <FieldGroup title="Account">
            <Field row label="Email" description={email}>
              <div><Button ref={firstAction} pill color="secondary" variant="soft" onClick={openEmail}>Change</Button></div>
            </Field>
            <Field row label="Password" description={passwordDescription}>
              <div><Button pill color="secondary" variant="soft" onClick={openPassword}>Reset</Button></div>
            </Field>
            <Field row label="Delete account" description="This removes your data for good.">
              <div><Button pill color="danger" variant="soft" onClick={openDelete}>Delete</Button></div>
            </Field>
          </FieldGroup>
        ) : (
          <>
            <FieldGroup title="Account" bodyClassName="overflow-hidden">
              <div data-row>
                <Button ref={firstAction} data-account-row block color="primary" variant="ghost" aria-label={`Email ${email}`} aria-haspopup="dialog" onClick={openEmail}>
                  <span className="flex w-full min-w-0 items-center justify-between gap-4">
                    <span className="min-w-0"><span className="block">Email</span><span data-account-detail>{email}</span></span>
                    <Disclosure data-no-autosize="" data-row-disclosure="" />
                  </span>
                </Button>
              </div>
              <div data-row>
                <Button data-account-row block color="primary" variant="ghost" aria-label={`Password ${passwordDescription}`} aria-haspopup="dialog" onClick={openPassword}>
                  <span className="flex w-full min-w-0 items-center justify-between gap-4">
                    <span className="min-w-0"><span className="block">Password</span><span data-account-detail>{passwordDescription}</span></span>
                    <Disclosure data-no-autosize="" data-row-disclosure="" />
                  </span>
                </Button>
              </div>
            </FieldGroup>
            <FieldGroup bodyClassName="overflow-hidden" footer="Deleting your account removes its data permanently.">
              <div data-row>
                <Button data-account-row block color="danger" variant="ghost" aria-haspopup="dialog" onClick={openDelete}>
                  <span className="w-full">Delete account</span>
                </Button>
              </div>
            </FieldGroup>
          </>
        )}
      <Dialog open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <Dialog.Content mobileVariant={panel === 'delete' ? 'alert' : 'sheet'} surface={panel === 'delete' ? 'plain' : 'grouped'} onCloseAutoFocus={(event) => { event.preventDefault(); (deleted ? restoreButton.current : trigger.current)?.focus(); }}>
          <Dialog.Header>
            <Dialog.Title>{panel === 'delete' ? 'Delete sample account?' : panel === 'email' ? 'Email' : 'Password'}</Dialog.Title>
            {panel === 'delete' && <Dialog.Description>This removes the sample account from this preview. You can restore it to try again.</Dialog.Description>}
          </Dialog.Header>
          {panel !== 'delete' && (
            <Dialog.Body>
              <form id={editFormId} onSubmit={save}>
                {wide ? (
                <FieldGroup columns>
                  {panel === 'email' ? (
                    <Field row label="Email"><Input type="email" autoComplete="email" required value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} /></Field>
                  ) : (
                    <Field row label="New password"><Input type="password" autoComplete="new-password" required minLength={8} value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} /></Field>
                  )}
                </FieldGroup>
                ) : (
                  <AuthFields>
                    {panel === 'email' ? (
                      <AuthInput label="Email" type="email" placeholder="Email address" autoComplete="email" required value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} />
                    ) : (
                      <AuthInput label="New password" type="password" placeholder="New password" autoComplete="new-password" required minLength={8} value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} />
                    )}
                  </AuthFields>
                )}
              </form>
            </Dialog.Body>
          )}
          <Dialog.Footer>
            <Dialog.Close><Button color="secondary" variant="soft">Cancel</Button></Dialog.Close>
            {panel === 'delete' ? (
              <Button color="danger" onClick={() => { setDeleted(true); setPanel(null); }}>Delete account</Button>
            ) : (
              <Button color="primary" type="submit" form={editFormId}>Save</Button>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
      </FormScreen>
    </>
  );
}

export function FormRowsPayoutDemo() {
  const wide = useBreakpoint('md');
  const presentation = useScreenPresentation();
  const [error, setError] = useState(false);
  const [holder, setHolder] = useState('Jane Doe');
  const [iban, setIban] = useState('ES00 0000 0000 0000 0000 0000');
  const [reference, setReference] = useState('Monthly payout for the spring collection, including the two orders that were moved from last month.');

  return (
    <><div data-demo-controls style={controlsTableStyle}>
      <DemoControlBoolean name="error" value={error} onChange={setError} />
      <ScreenPresentationControls {...presentation} />
    </div>
    <FormScreen title="Edit payout details" {...presentation} onDialogChange={presentation.setDialog}>
      <FieldGroup title="Payout details">
        <Field row orientation={wide ? undefined : "vertical"} label="Account holder">
          <Input variant={wide ? undefined : "ghost"} value={holder} onChange={(event) => setHolder(event.target.value)} />
        </Field>
        <Field row orientation={wide ? undefined : "vertical"} label="IBAN" errorMessage={error ? 'Enter a valid IBAN.' : undefined}>
          <Input variant={wide ? undefined : "ghost"} value={iban} onChange={(event) => setIban(event.target.value)} invalid={error} autoCapitalize="characters" spellCheck={false} />
        </Field>
        <Field row orientation="vertical" label="Reference" errorMessage={error ? 'Keep it under 140 characters.' : undefined}>
          <Textarea variant="ghost" rows={2} autoResize value={reference} onChange={(event) => setReference(event.target.value)} invalid={error} />
        </Field>
      </FieldGroup>
    </FormScreen></>
  );
}
