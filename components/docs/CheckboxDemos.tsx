'use client';

import { useId, useState } from 'react';
import { Checkbox } from '@plexui/ui/components/Checkbox';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { FieldError } from '@plexui/ui/components/FieldError';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { FormScreen } from './FormRowsDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';

const VARIANT_OPTIONS = ['solid', 'ghost'] as const;
const ORIENTATION_OPTIONS = ['left', 'right'] as const;

/** The three states of the Overview: a checked option, an unchecked one, and a parent whose items are partly on */
const OVERVIEW_OPTIONS = [
  { label: 'Share usage data', description: 'Help improve the product with anonymous usage reports.', defaultChecked: true },
  { label: 'Enable notifications', description: 'You can enable or disable notifications at any time from settings.', defaultChecked: false },
  { label: 'Sync all folders', description: 'Some of its folders are synced.', defaultChecked: 'indeterminate' as const },
];

function Segments<T extends string>({ name, options, value, onChange }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <DemoControlRow name={name}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => (
          <SegmentedControl.Option key={option} value={option}>
            {option}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );
}

/** The Overview, with every setting of the checkbox: what the page's examples once showed one by one (Variants, Pill,
 * Ghost, With description, Indeterminate, Label orientation, Without label) are its settings (owner 11.11: «в первом
 * примере можно сразу показать все со всеми настройками»). Three options show the three states. `pill` rounds the
 * box: the solid fill, and on a ghost box its hover tint and focus ring; on a phone every box is the round iOS
 * selection circle, so it is a desktop setting. `description` and `orientation` act only next to a label,
 * so they are offered only with one; without a label each box is named by `aria-label`. A setting that is not offered
 * keeps its choice and shows its default, as in the Vue demo. */
export function CheckboxOverviewDemo() {
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('solid');
  const [pill, setPill] = useState(false);
  const [label, setLabel] = useState(true);
  const [description, setDescription] = useState(false);
  const [orientation, setOrientation] = useState<(typeof ORIENTATION_OPTIONS)[number]>('left');
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />
        <DemoControlBoolean name="label" value={label} onChange={setLabel} />
        {label && <DemoControlBoolean name="description" value={description} onChange={setDescription} />}
        {label && <Segments name="orientation" options={ORIENTATION_OPTIONS} value={orientation} onChange={setOrientation} />}
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <div className={label ? (description ? 'flex flex-col gap-4 max-w-sm' : 'flex flex-col gap-3') : 'flex gap-4'}>
          {OVERVIEW_OPTIONS.map((option) => (
            <Checkbox
              key={option.label}
              variant={variant}
              pill={pill}
              disabled={disabled}
              defaultChecked={option.defaultChecked}
              {...(label
                ? { label: option.label, description: description ? option.description : undefined, orientation }
                : { 'aria-label': option.label })}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function CheckboxGroupDemo() {
  const [items, setItems] = useState([
    { id: 'read', label: 'Read', checked: true },
    { id: 'write', label: 'Write', checked: false },
    { id: 'execute', label: 'Execute', checked: false },
  ]);

  const allChecked = items.every((i) => i.checked);
  const noneChecked = items.every((i) => !i.checked);
  const parentChecked = allChecked ? true : noneChecked ? false : ('indeterminate' as const);

  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="flex flex-col gap-3">
        <Checkbox
          label="Permissions"
          checked={parentChecked}
          onCheckedChange={() => {
            const next = !allChecked;
            setItems((prev) => prev.map((i) => ({ ...i, checked: next })));
          }}
        />
        <div className="flex flex-col gap-3 pl-6">
          {items.map((item) => (
            <Checkbox
              key={item.id}
              label={item.label}
              checked={item.checked}
              onCheckedChange={(next) => {
                setItems((prev) =>
                  prev.map((i) => (i.id === item.id ? { ...i, checked: Boolean(next) } : i))
                );
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CheckboxGroupWithDescriptionDemo() {
  const phone = usePhoneRows();
  const [items, setItems] = useState([
    { id: 'photos', label: 'Photos', checked: true },
    { id: 'videos', label: 'Videos', checked: false },
    { id: 'music', label: 'Music', checked: false },
    { id: 'podcasts', label: 'Podcasts', checked: false },
  ]);
  const setChecked = (id: string, checked: boolean) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));

  if (phone) return (
    <PhoneRowsStage>
      <FieldGroup title="Download over cellular" description="Choose what can use mobile data.">
        {items.map((item) => (
          <Field key={item.id} row label={item.label}>
            <Checkbox checked={item.checked} onCheckedChange={(next) => setChecked(item.id, Boolean(next))} />
          </Field>
        ))}
      </FieldGroup>
    </PhoneRowsStage>
  );

  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="max-w-sm w-full">
        <Field label="Download over cellular" description="Choose what can use mobile data.">
          {() => (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <Checkbox
                  key={item.id}
                  label={item.label}
                  checked={item.checked}
                  onCheckedChange={(next) => setChecked(item.id, Boolean(next))}
                />
              ))}
            </div>
          )}
        </Field>
      </div>
    </div>
  );
}

export function CheckboxWithFieldDemo() {
  const phone = usePhoneRows();
  const errorId = useId();
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="showError" value={showError} onChange={setShowError} />
      </div>
      {phone ? (
        <PhoneRowsStage>
          <FieldGroup
            title="Terms"
            description="Please review and accept the terms before continuing."
            footer={showError ? <FieldError id={errorId}>You must accept the terms to continue.</FieldError> : undefined}
          >
            <Field row label="I agree to the Terms of Service">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(Boolean(v))}
                aria-invalid={showError || undefined}
                aria-describedby={showError ? errorId : undefined}
              />
            </Field>
            <Field row label="I agree to the Privacy Policy"><Checkbox /></Field>
          </FieldGroup>
        </PhoneRowsStage>
      ) : (
        <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
          <div className="flex flex-col gap-4 max-w-sm w-full">
            <Field
              label="Terms"
              description="Please review and accept the terms before continuing."
              errorMessage={showError ? 'You must accept the terms to continue.' : undefined}
            >
              {() => (
                <div className="flex flex-col gap-3 mt-1">
                  <Checkbox
                    label="I agree to the Terms of Service"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(Boolean(v))}
                  />
                  <Checkbox label="I agree to the Privacy Policy" />
                </div>
              )}
            </Field>
          </div>
        </div>
      )}
    </>
  );
}

export function CheckboxDescriptionsDemo() {
  const [settings, setSettings] = useState({
    projects: true,
    members: true,
    csv: true,
    json: false,
    pdf: false,
  });

  const toggle = (key: keyof typeof settings) => () =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="flex flex-col max-w-sm w-full divide-y divide-alpha/15">
        <div className="pb-5">
          <Field label="Export contents" description="Choose what the archive includes.">
            {() => (
              <div className="flex flex-col gap-2.5">
                <Checkbox
                  label={
                    <div className="flex flex-col">
                      <span className="font-medium">Projects</span>
                      <span className="text-xs text-secondary mt-0.5">Files, comments, and version history.</span>
                    </div>
                  }
                  checked={settings.projects}
                  onCheckedChange={toggle('projects')}
                />
                <Checkbox
                  label={
                    <div className="flex flex-col">
                      <span className="font-medium">Members</span>
                      <span className="text-xs text-secondary mt-0.5">Names, roles, and email addresses.</span>
                    </div>
                  }
                  checked={settings.members}
                  onCheckedChange={toggle('members')}
                />
              </div>
            )}
          </Field>
        </div>
        <div className="pt-5">
          <Field label="File formats">
            {() => (
              <div className="flex flex-col gap-3">
                <Checkbox label="CSV" checked={settings.csv} onCheckedChange={toggle('csv')} />
                <Checkbox label="JSON" checked={settings.json} onCheckedChange={toggle('json')} />
                <Checkbox label="PDF" checked={settings.pdf} onCheckedChange={toggle('pdf')} />
              </div>
            )}
          </Field>
        </div>
      </div>
    </div>
  );
}

export function CheckboxNotificationSettingsDemo() {
  const [settings, setSettings] = useState({
    emailMarketing: true,
    emailSecurity: true,
    pushMessages: true,
    pushMentions: true,
    pushComments: false,
  });

  const toggle = (key: keyof typeof settings) => () =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const wide = useBreakpoint('md');
  if (!wide) return (
    <FormScreen title="Notifications">
      <FieldGroup title="Email notifications" description="Configure which emails you receive.">
        <Field row label="Marketing" description="Receive emails about new products and features."><Checkbox checked={settings.emailMarketing} onCheckedChange={toggle('emailMarketing')} /></Field>
        <Field row label="Security" description="Receive emails about account activity and security."><Checkbox checked={settings.emailSecurity} onCheckedChange={toggle('emailSecurity')} /></Field>
      </FieldGroup>
      <FieldGroup title="Push notifications" description="Configure which push notifications you receive.">
        <Field row label="Direct messages"><Checkbox checked={settings.pushMessages} onCheckedChange={toggle('pushMessages')} /></Field>
        <Field row label="Mentions"><Checkbox checked={settings.pushMentions} onCheckedChange={toggle('pushMentions')} /></Field>
        <Field row label="Comments"><Checkbox checked={settings.pushComments} onCheckedChange={toggle('pushComments')} /></Field>
      </FieldGroup>
    </FormScreen>
  );

  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="flex flex-col max-w-sm w-full divide-y divide-alpha/15">
        <div className="pb-5">
          <Field label="Email notifications" description="Configure which emails you receive.">
            {() => (
              <div className="flex flex-col gap-4">
                <Checkbox
                  label={
                    <div className="flex flex-col">
                      <span className="font-medium">Marketing</span>
                      <span className="text-xs text-secondary mt-0.5">Receive emails about new products and features.</span>
                    </div>
                  }
                  checked={settings.emailMarketing}
                  onCheckedChange={toggle('emailMarketing')}
                />
                <Checkbox
                  label={
                    <div className="flex flex-col">
                      <span className="font-medium">Security</span>
                      <span className="text-xs text-secondary mt-0.5">Receive emails about account activity and security.</span>
                    </div>
                  }
                  checked={settings.emailSecurity}
                  onCheckedChange={toggle('emailSecurity')}
                />
              </div>
            )}
          </Field>
        </div>
        <div className="pt-5">
          <Field label="Push notifications" description="Configure which push notifications you receive.">
            {() => (
              <div className="flex flex-col gap-3">
                <Checkbox
                  label="Direct messages"
                  checked={settings.pushMessages}
                  onCheckedChange={toggle('pushMessages')}
                />
                <Checkbox
                  label="Mentions"
                  checked={settings.pushMentions}
                  onCheckedChange={toggle('pushMentions')}
                />
                <Checkbox
                  label="Comments"
                  checked={settings.pushComments}
                  onCheckedChange={toggle('pushComments')}
                />
              </div>
            )}
          </Field>
        </div>
      </div>
    </div>
  );
}
