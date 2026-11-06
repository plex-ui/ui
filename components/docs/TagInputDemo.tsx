'use client';

import { useState } from 'react';
import { TagInput, type Tag } from '@plexui/ui/components/TagInput';
import { Button } from '@plexui/ui/components/Button';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { SelectControl } from '@plexui/ui/components/SelectControl';
import { Menu } from '@plexui/ui/components/Menu';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

// On a phone a tag input is the ghost value of a row under its label, in a FieldGroup, as the Form Examples
// put a textarea: the row is its frame and sets its insets and type, so the phone examples drop the desktop
// size and pill controls. Picking from a fixed list is the Form Examples' tag row with its sheet instead.

const MIN_ROWS_OPTIONS = ['auto', 'min 2', 'min 3'] as const;
const MIN_ROWS_TO_NUMBER: Record<(typeof MIN_ROWS_OPTIONS)[number], number> = {
  auto: 1,
  'min 2': 2,
  'min 3': 3,
};
const SIZE_OPTIONS = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

export function TagInputBaseDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <div style={{ width: 350 }}>
        <TagInput
          placeholder="Add a tag..."
          rows={3}
        />
      </div>
    </div>
  );
}

export function TagInputBaseDemoWithControls() {
  const [minRows, setMinRows] = useState<(typeof MIN_ROWS_OPTIONS)[number]>('auto');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(false);
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {!phone && (
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
        )}
        <DemoControlRow name="minRows">
          <SegmentedControl<(typeof MIN_ROWS_OPTIONS)[number]>
            value={minRows}
            onChange={setMinRows}
            aria-label="minRows"
            size="xs"
          >
            {MIN_ROWS_OPTIONS.map((r) => (
              <SegmentedControl.Option key={r} value={r}>
                {r}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        {!phone && <DemoControlBoolean name="pill" value={pill} onChange={setPill} />}
      </div>
      {phone ? (
        <PhoneRowsStage>
          <FieldGroup>
            <Field row orientation="vertical" label="Tags">
              <TagInput variant="ghost" placeholder="Add a tag..." rows={MIN_ROWS_TO_NUMBER[minRows]} />
            </Field>
          </FieldGroup>
        </PhoneRowsStage>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <div className="w-full min-w-0 max-w-[480px]">
            <TagInput
              placeholder="Add a tag..."
              size={size}
              rows={MIN_ROWS_TO_NUMBER[minRows]}
              pill={pill}
            />
          </div>
        </div>
      )}
    </>
  );
}

const SUGGESTIONS = [
  'React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Node.js',
  'GraphQL', 'PostgreSQL', 'Redis', 'Docker', 'AWS',
];

export function TagInputSuggestionsDemo() {
  const [tags, setTags] = useState<Tag[]>([
    { value: 'React', valid: true },
    { value: 'TypeScript', valid: true },
  ]);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(false);

  const selectedValues = new Set(tags.map((t) => t.value));
  const available = SUGGESTIONS.filter((s) => !selectedValues.has(s));

  const addSuggestion = (value: string) => {
    if (selectedValues.has(value)) return;
    setTags((prev) => [...prev, { value, valid: true }]);
  };
  const phone = usePhoneRows();

  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup>
          <Field row orientation="vertical" label="Skills">
            <TagInput variant="ghost" value={tags} onChange={setTags} placeholder="Add a skill..." />
          </Field>
        </FieldGroup>
        {/* Suggestions are rows, each with its Add button at the end, as iOS lists offer items to add */}
        {available.length > 0 && (
          <FieldGroup title="Suggestions">
            {available.map((suggestion) => (
              <Field row key={suggestion} label={suggestion}>
                <Button color="primary" variant="ghost" aria-label={`Add ${suggestion}`} onClick={() => addSuggestion(suggestion)}>
                  Add
                </Button>
              </Field>
            ))}
          </FieldGroup>
        )}
      </PhoneRowsStage>
    );
  }
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
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <TagInput
            value={tags}
            onChange={setTags}
            placeholder="Add a skill..."
            size={size}
            pill={pill}
          />
          {available.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {available.map((suggestion) => (
                <Button key={suggestion} size="xs" color="secondary" variant="soft" pill={pill} onClick={() => addSuggestion(suggestion)}>
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const FIELD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'name', label: 'Name' },
  { value: 'role', label: 'Role' },
  { value: 'team', label: 'Team' },
  { value: 'country', label: 'Country' },
] as const;

export function TagInputInlineFilterRowDemo() {
  const [field, setField] = useState<string>('email');
  const [tags, setTags] = useState<Tag[]>([
    { value: 'ada@plexui.com', valid: true },
    { value: 'grace@plexui.com', valid: true },
  ]);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(false);
  const fieldLabel = FIELD_OPTIONS.find((o) => o.value === field)?.label ?? '';
  const phone = usePhoneRows();
  const fieldMenu = (
    <Menu.Content
      minWidth={160}
      align={phone ? 'end' : undefined}
      onCloseAutoFocus={(e) => e.preventDefault()}
    >
      {FIELD_OPTIONS.map((o) => (
        <Menu.CheckboxItem
          key={o.value}
          checked={field === o.value}
          onCheckedChange={() => setField(o.value)}
          indicatorPosition={phone ? 'start' : undefined}
          indicatorVariant="ghost"
        >
          {o.label}
        </Menu.CheckboxItem>
      ))}
    </Menu.Content>
  );

  if (phone) {
    // A filter on a phone is a group: the field is a pop-up row, its values the tags under the next row's label
    return (
      <PhoneRowsStage>
        <FieldGroup>
          <Field row label="Where">
            {(control) => (
              <Menu>
                <Menu.Trigger>
                  <SelectControl {...control} selected={!!field}>{fieldLabel}</SelectControl>
                </Menu.Trigger>
                {fieldMenu}
              </Menu>
            )}
          </Field>
          <Field row orientation="vertical" label="Is in">
            <TagInput variant="ghost" value={tags} onChange={setTags} placeholder="Add a value" />
          </Field>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
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
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="flex w-full max-w-2xl items-start gap-2">
          <Field label="Where" className="w-[160px] shrink-0">
            <Menu>
              <Menu.Trigger>
                <SelectControl size={size} pill={pill} selected={!!field} className="w-full">
                  {fieldLabel}
                </SelectControl>
              </Menu.Trigger>
              {fieldMenu}
            </Menu>
          </Field>
          <Field label="Is in" className="flex-1">
            <TagInput
              size={size}
              pill={pill}
              value={tags}
              onChange={setTags}
              placeholder="Add value, press Enter…"
            />
          </Field>
        </div>
      </div>
    </>
  );
}
