'use client';

import React, { useState } from 'react';
import type { DateTime } from 'luxon';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Input } from '@plexui/ui/components/Input';
import { Textarea } from '@plexui/ui/components/Textarea';
import { Select } from '@plexui/ui/components/Select';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Button } from '@plexui/ui/components/Button';
import { TextLink } from '@plexui/ui/components/TextLink';
import { ArrowUpRight } from '@plexui/ui/components/Icon';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow, DemoControlSelect } from './ButtonDemos';
import { PhoneRowsStage, phoneCalendarSecondRowStageClassName, usePhoneRows } from './PhoneRows';

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

/** Where the label stands: above, in columns (values from one column), with the value at the row's end, or hidden. */
const LAYOUTS = ['above', 'columns', 'end', 'hidden'] as const;
type Layout = (typeof LAYOUTS)[number];

const roles = [{ label: 'Admin', value: 'admin' }, { label: 'Editor', value: 'editor' }, { label: 'Viewer', value: 'viewer' }];

function SegmentedRow<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return (
    <DemoControlRow name={name}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => (
          <SegmentedControl.Option key={option} value={option}>{option}</SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );
}

// ---------------------------------------------------------------------------
// Overview: one field in four places of its label. On the web a field stands on its own; on a phone it is a cell
// of a FieldGroup, as every iOS form is, and its words go in the group's footer.
// ---------------------------------------------------------------------------

export function FieldOverviewDemo() {
  const [layout, setLayout] = useState<Layout>('above');
  const [description, setDescription] = useState(true);
  const [error, setError] = useState(true);
  const [required, setRequired] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [labelAction, setLabelAction] = useState(false);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(false);
  const [opticallyAlign, setOpticallyAlign] = useState(false);
  const phone = usePhoneRows();
  // A link that acts on the field stands at the end of a label above it or in its column
  const withLabelAction = labelAction && (layout === 'above' || layout === 'columns');

  const note = "We'll never share your email with anyone else.";
  const errorMessage = error ? 'Enter a valid email address.' : undefined;
  const email = error ? 'jane@example' : undefined;
  const hidden = layout === 'hidden';

  const controls = (
    <div data-demo-controls style={controlsTableStyle}>
      <SegmentedRow name="layout" value={layout} options={LAYOUTS} onChange={setLayout} />
      <DemoControlBoolean name="description" value={description} onChange={setDescription} />
      <DemoControlBoolean name="errorMessage" value={error} onChange={setError} />
      <DemoControlBoolean name="required" value={required} onChange={setRequired} />
      <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      {(layout === 'above' || layout === 'columns') && <DemoControlBoolean name="labelAction" value={labelAction} onChange={setLabelAction} />}
      <DemoControlSelect name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} desktopOnly />
      {/* A row field is a pill of its own: the setting is for a field outside a row */}
      {layout !== 'end' && <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />}
      {layout !== 'end' && <DemoControlBoolean name="opticallyAlign" value={opticallyAlign} onChange={setOpticallyAlign} desktopOnly />}
    </div>
  );
  const link = <TextLink href="#overview">Use phone instead</TextLink>;

  if (phone) {
    // A required field says so in its placeholder, as iOS account forms do; a hidden label leaves the placeholder
    // to name the field
    const placeholder = (name: string, example: string) => (hidden ? name : required ? 'Required' : example);
    const orientation = layout === 'above' ? 'vertical' : undefined;
    return (
      <>
        {controls}
        <PhoneRowsStage>
          <div className="flex flex-col">
          <FieldGroup columns={layout === 'columns'} footer={description ? note : undefined}>
            <Field row label="Name" orientation={orientation} hideLabel={hidden}>
              <Input placeholder={placeholder('Name', 'Jane Appleseed')} autoComplete="name" disabled={disabled} />
            </Field>
            <Field row label="Email" orientation={orientation} hideLabel={hidden} errorMessage={errorMessage}>
              <Input key={String(error)} type="email" placeholder={placeholder('Email', 'name@example.com')} defaultValue={email} autoComplete="email" disabled={disabled} />
            </Field>
          </FieldGroup>
          {/* A row has no label line: the link stands under the group in the rows' text, as "Forgot password?" under
              the Apple Account sign-in */}
          {withLabelAction && (
            <TextLink primary href="#overview" className="mt-[15px] self-start text-[length:var(--field-row-label-font-size)] leading-[var(--field-row-label-line-height)]">Use phone instead</TextLink>
          )}
          </div>
        </PhoneRowsStage>
      </>
    );
  }

  const control = { size, pill: layout === 'end' ? undefined : pill, disabled };
  const align = opticallyAlign && layout !== 'end' ? ('start' as const) : undefined;
  const name = <Input placeholder={hidden ? 'Name' : 'Jane Appleseed'} autoComplete="name" {...control} />;
  const emailInput = <Input key={String(error)} type="email" placeholder={hidden ? 'Email' : 'name@example.com'} defaultValue={email} autoComplete="email" {...control} />;
  return (
    <>
      {controls}
      <div data-demo-stage className="py-10">
        {layout === 'end' ? (
          <div className="w-full max-w-[480px]">
            <FieldGroup>
              <Field row label="Name" required={required}>{name}</Field>
              <Field row label="Email" required={required} description={description ? note : undefined} errorMessage={errorMessage}>{emailInput}</Field>
            </FieldGroup>
          </div>
        ) : (
          <div className={`flex w-full flex-col gap-4 ${layout === 'columns' ? 'max-w-[480px]' : 'max-w-[320px]'}`}>
            <Field label="Name" required={required} hideLabel={hidden} orientation={layout === 'columns' ? 'horizontal' : 'vertical'} opticallyAlign={align}>{name}</Field>
            <Field label="Email" required={required} hideLabel={hidden} orientation={layout === 'columns' ? 'horizontal' : 'vertical'} opticallyAlign={align} labelAction={withLabelAction ? link : undefined} description={description ? note : undefined} errorMessage={errorMessage}>{emailInput}</Field>
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// FieldGroup: the header (standard or increased, an action at its end), the rows, the footer
// ---------------------------------------------------------------------------

const ADDRESS = { street: '12 Market Street', city: 'Springfield', postcode: '62701' };

export function FieldGroupDemo() {
  const [prominence, setProminence] = useState<'standard' | 'increased'>('standard');
  const [action, setAction] = useState(true);
  const [footer, setFooter] = useState(true);
  const [columns, setColumns] = useState(false);
  const [address, setAddress] = useState(ADDRESS);
  const phone = usePhoneRows();
  const edit = (key: keyof typeof ADDRESS) => (event: React.ChangeEvent<HTMLInputElement>) => setAddress({ ...address, [key]: event.target.value });

  const group = (
    <FieldGroup
      title="Billing address"
      headerProminence={prominence}
      action={action ? <Button color="primary" variant="ghost" size="sm" onClick={() => setAddress({ street: '', city: '', postcode: '' })}>Clear</Button> : undefined}
      footer={footer ? <p>Your bank checks this address against your card. <TextLink href="#group">Learn more</TextLink></p> : undefined}
      columns={columns}
    >
      <Field row label="Street"><Input placeholder="Required" value={address.street} onChange={edit('street')} autoComplete="address-line1" /></Field>
      <Field row label="City"><Input placeholder="Required" value={address.city} onChange={edit('city')} autoComplete="address-level2" /></Field>
      <Field row label="Postcode"><Input placeholder="Required" value={address.postcode} onChange={edit('postcode')} autoComplete="postal-code" /></Field>
    </FieldGroup>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <SegmentedRow name="headerProminence" value={prominence} options={['standard', 'increased'] as const} onChange={setProminence} />
        <DemoControlBoolean name="action" value={action} onChange={setAction} />
        <DemoControlBoolean name="footer" value={footer} onChange={setFooter} />
        <DemoControlBoolean name="columns" value={columns} onChange={setColumns} />
      </div>
      {phone ? <PhoneRowsStage>{group}</PhoneRowsStage> : (
        <div data-demo-stage className="py-10">
          <div className="w-full max-w-[480px]">{group}</div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Action rows: a row that is a Button, as an iOS List draws one (simulator, iOS 27.2): tinted words where a row's
// label starts, red for a destructive one, an arrow at the trailing edge for a link out, no chevron
// ---------------------------------------------------------------------------

export function FieldActionRowsDemo() {
  const [trailingIcon, setTrailingIcon] = useState(true);
  const [destructive, setDestructive] = useState(true);
  const [centered, setCentered] = useState(true);
  const phone = usePhoneRows();

  const groups = (
    <>
      <FieldGroup>
        <div data-row><Button block color="info" variant="ghost">Edit Menu</Button></div>
        <div data-row>
          <Button block color="info" variant="ghost">Privacy Policy{trailingIcon && <ArrowUpRight />}</Button>
        </div>
        {destructive && <div data-row><Button block color="danger" variant="ghost">Delete Account</Button></div>}
      </FieldGroup>
      {centered && (
        <FieldGroup>
          <div data-row data-align="center"><Button block color="info" variant="ghost">Reset to Default</Button></div>
        </FieldGroup>
      )}
    </>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="trailingIcon" value={trailingIcon} onChange={setTrailingIcon} />
        <DemoControlBoolean name="destructive" value={destructive} onChange={setDestructive} />
        <DemoControlBoolean name="centered" value={centered} onChange={setCentered} />
      </div>
      {phone ? <PhoneRowsStage>{groups}</PhoneRowsStage> : (
        <div data-demo-stage className="py-10">
          <div className="flex w-full max-w-[480px] flex-col gap-6 [--field-group-gap:11px]">{groups}</div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Spacing between groups: on a phone the groups space themselves as an iOS 27.2 inset list, for every pairing
// of a footer above and a header below (37, a header 60, a footer 49.5 and 16 a further line, both 72)
// ---------------------------------------------------------------------------

export function FieldGroupSpacingDemo() {
  const phone = usePhoneRows();
  const row = (label: string) => <Field row label={label}><Switch defaultChecked aria-label={label} /></Field>;

  const groups = (
    <>
      <FieldGroup>{row('Rows to rows')}</FieldGroup>
      <FieldGroup>{row('No header')}</FieldGroup>
      <FieldGroup title="Header">{row('Under a header')}</FieldGroup>
      <FieldGroup footer={<p>A footer of one line.</p>}>{row('Over a footer')}</FieldGroup>
      <FieldGroup footer={<p>A footer that runs on to a second line, so the next group stands 16 further down.</p>}>{row('After a footer')}</FieldGroup>
      <FieldGroup title="Header after a footer" footer={<p>A footer of one line.</p>}>{row('Both')}</FieldGroup>
      <FieldGroup title="Prominent header" headerProminence="increased">{row('Prominent')}</FieldGroup>
    </>
  );

  return phone ? <PhoneRowsStage>{groups}</PhoneRowsStage> : (
    <div data-demo-stage className="py-10">
      <div className="flex w-full max-w-[480px] flex-col gap-6 [--field-group-gap:11px]">{groups}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Other controls: a native one is named by the label's `htmlFor`; a Select or DatePicker trigger by
// `aria-labelledby`, which Field adds
// ---------------------------------------------------------------------------

export function FieldControlsDemo() {
  const [role, setRole] = useState('editor');
  const [start, setStart] = useState<DateTime | null>(null);
  const phone = usePhoneRows();

  if (phone) {
    return (
      <PhoneRowsStage className={phoneCalendarSecondRowStageClassName}>
        <FieldGroup>
          <Field row label="Role">
            <Select value={role} onChange={(option) => setRole(option.value)} options={roles} />
          </Field>
          <Field row label="Starts">
            <DatePicker triggerDateFormat="MMM d, yyyy" triggerShowIcon={false} placeholder="Select date" value={start} onChange={setStart} />
          </Field>
          <Field row label="Notes" orientation="vertical">
            <Textarea placeholder="Anything the team should know" rows={3} autoResize />
          </Field>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }

  return (
    <div data-demo-stage className="py-10">
      <div className="flex w-full max-w-[320px] flex-col gap-4">
        <Field label="Role" description="What this person can change.">
          <Select value={role} onChange={(option) => setRole(option.value)} options={roles} />
        </Field>
        <Field label="Starts">
          <DatePicker placeholder="Select date" value={start} onChange={setStart} />
        </Field>
        <Field label="Notes">
          <Textarea placeholder="Anything the team should know" rows={3} />
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Label action: on the web at the end of the label row; a phone has no label row, so the link stands under the group
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Several controls in one field: the render prop puts the field's id on the first; the others name themselves
// ---------------------------------------------------------------------------

const BIRTHDAY_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  .map((month, index) => ({ label: month, value: String(index + 1).padStart(2, '0') }));
const BIRTHDAY_DAYS = Array.from({ length: 31 }, (_, index) => {
  const day = String(index + 1);
  return { label: day, value: day };
});
const BIRTHDAY_YEARS = Array.from({ length: 2025 - 1920 + 1 }, (_, index) => {
  const year = String(2025 - index);
  return { label: year, value: year };
});

export function FieldSeveralControlsDemo() {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');

  // The web only: on a phone a birthday is one row and one value, whose wheel sets day, month and year
  // (Contacts, IMG_5644); PlexUI has no such wheel
  return (
    <div data-demo-stage className="py-10">
      <div className="w-[320px]">
        <Field label="Birthday">
          {(fieldProps) => (
            <div className="flex gap-2">
              <div className="w-[130px]">
                <Select id={fieldProps.id} aria-labelledby={fieldProps['aria-labelledby']} value={month} options={BIRTHDAY_MONTHS} placeholder="Month" onChange={(option) => setMonth(option.value)} />
              </div>
              <div className="w-[84px]">
                <Select value={day} options={BIRTHDAY_DAYS} placeholder="Day" aria-label="Day" onChange={(option) => setDay(option.value)} />
              </div>
              <div className="w-[96px]">
                <Select value={year} options={BIRTHDAY_YEARS} placeholder="Year" aria-label="Year" onChange={(option) => setYear(option.value)} />
              </div>
            </div>
          )}
        </Field>
      </div>
    </div>
  );
}
