'use client';

import { useId, useState } from 'react';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { TextLink } from '@plexui/ui/components/TextLink';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { FieldError } from '@plexui/ui/components/FieldError';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { FormScreen } from './FormRowsDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';

export function RadioGroupHeroContent() {
  return (
    <RadioGroup defaultValue="chocolate" onChange={() => { }} aria-label="Flavor">
      <RadioGroup.Item value="chocolate">Chocolate</RadioGroup.Item>
      <RadioGroup.Item value="vanilla">Vanilla</RadioGroup.Item>
      <RadioGroup.Item value="strawberry">Strawberry</RadioGroup.Item>
    </RadioGroup>
  );
}

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: 'A summary every morning.' },
  { value: 'weekly', label: 'Weekly', description: 'A digest every Monday.' },
  { value: 'monthly', label: 'Monthly', description: 'A recap on the first of the month.' },
  { value: 'never', label: 'Never', description: 'Only security alerts.' },
];

function Segments<T extends string>({ name, options, value, onChange, desktopOnly = false }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void; desktopOnly?: boolean }) {
  return (
    <DemoControlRow name={name} desktopOnly={desktopOnly}>
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

const DIRECTION_OPTIONS = ['col', 'row'] as const;
const ORIENTATION_OPTIONS = ['left', 'right'] as const;

/** The Overview, with every setting of the radio group: what the page's examples once showed one by one (Direction,
 * Orientation, Group disabled, Item disabled, With description) are its settings (owner 11.11: «в первом примере
 * можно сразу показать все со всеми настройками»). `direction` and `orientation` are desktop layouts: a phone list is
 * a column of rows, each ending with its checkmark. With the indicator after the label a column of items fills a
 * 224px group, so the indicators line up. `itemDisabled` disables Monthly; a disabled group disables every option, so it
 * is offered only while the group is enabled, and keeps its choice. */
export function RadioGroupOverviewDemo() {
  const phone = usePhoneRows();
  const [frequency, setFrequency] = useState('daily');
  const [direction, setDirection] = useState<(typeof DIRECTION_OPTIONS)[number]>('col');
  const [orientation, setOrientation] = useState<(typeof ORIENTATION_OPTIONS)[number]>('left');
  const [description, setDescription] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [itemDisabled, setItemDisabled] = useState(false);
  const block = direction === 'col' && orientation === 'right';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="direction" options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} desktopOnly />
        <Segments name="orientation" options={ORIENTATION_OPTIONS} value={orientation} onChange={setOrientation} desktopOnly />
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        {!disabled && <DemoControlBoolean name="itemDisabled" value={itemDisabled} onChange={setItemDisabled} />}
      </div>
      {phone ? (
        <PhoneRowsStage>
          <RadioGroup direction="col" className="w-full" value={frequency} onChange={setFrequency} disabled={disabled} aria-label="Notification frequency">
            <FieldGroup title="Notification frequency">
              {FREQUENCIES.map((option) => (
                <Field key={option.value} row label={option.label} description={description ? option.description : undefined}>
                  <RadioGroup.Item value={option.value} disabled={itemDisabled && option.value === 'monthly'} />
                </Field>
              ))}
            </FieldGroup>
          </RadioGroup>
        </PhoneRowsStage>
      ) : (
        <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
          <div>
            <h3 className="font-semibold text-sm mb-3">Notification frequency</h3>
            <RadioGroup
              direction={direction}
              className={block ? 'w-56' : undefined}
              value={frequency}
              onChange={setFrequency}
              disabled={disabled}
              aria-label="Notification frequency"
            >
              {FREQUENCIES.map((option) => (
                <RadioGroup.Item
                  key={option.value}
                  value={option.value}
                  orientation={orientation}
                  block={block}
                  description={description ? option.description : undefined}
                  disabled={itemDisabled && option.value === 'monthly'}
                >
                  {option.label}
                </RadioGroup.Item>
              ))}
            </RadioGroup>
          </div>
        </div>
      )}
    </>
  );
}

export function RadioGroupWithFieldDemo() {
  const phone = usePhoneRows();
  const [value, setValue] = useState('email');
  if (phone) return (
    <PhoneRowsStage>
      <RadioGroup direction="col" className="w-full" value={value} onChange={setValue} aria-label="Notification method">
        <FieldGroup title="Notification method" description="Choose how you want to receive notifications.">
          <Field row label="Email"><RadioGroup.Item value="email" /></Field>
          <Field row label="SMS"><RadioGroup.Item value="sms" /></Field>
          <Field row label="Push notification"><RadioGroup.Item value="push" /></Field>
        </FieldGroup>
      </RadioGroup>
    </PhoneRowsStage>
  );
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="max-w-sm">
        <Field label="Notification method" description="Choose how you want to receive notifications.">
          {(fieldProps) => (
            <RadioGroup
              direction="col"
              value={value}
              onChange={setValue}
              aria-label="Notification method"
              {...fieldProps}
            >
              <RadioGroup.Item value="email">Email</RadioGroup.Item>
              <RadioGroup.Item value="sms">SMS</RadioGroup.Item>
              <RadioGroup.Item value="push">Push notification</RadioGroup.Item>
            </RadioGroup>
          )}
        </Field>
      </div>
    </div>
  );
}

export function RadioGroupWithFieldErrorDemo() {
  const phone = usePhoneRows();
  const errorId = useId();
  const [value, setValue] = useState<string | undefined>(undefined);
  const [showError, setShowError] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="showError" value={showError} onChange={setShowError} />
      </div>
      {phone ? (
        <PhoneRowsStage>
          <RadioGroup
            direction="col"
            className="w-full"
            value={value}
            onChange={setValue}
            aria-label="Subscription plan"
            aria-invalid={showError || undefined}
            aria-describedby={showError ? errorId : undefined}
          >
            <FieldGroup
              title="Subscription plan"
              description="Select a plan to continue."
              footer={showError ? <FieldError id={errorId}>Please select a subscription plan.</FieldError> : undefined}
            >
              <Field row label="Monthly ($9.99/month)"><RadioGroup.Item value="monthly" /></Field>
              <Field row label="Yearly ($99.99/year)"><RadioGroup.Item value="yearly" /></Field>
              <Field row label="Lifetime ($299.99)"><RadioGroup.Item value="lifetime" /></Field>
            </FieldGroup>
          </RadioGroup>
        </PhoneRowsStage>
      ) : (
        <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
          <div className="max-w-sm">
            <Field
              label="Subscription plan"
              description="Select a plan to continue."
              errorMessage={showError ? 'Please select a subscription plan.' : undefined}
            >
              {(fieldProps) => (
                <RadioGroup
                  direction="col"
                  value={value}
                  onChange={setValue}
                  aria-label="Subscription plan"
                  {...fieldProps}
                >
                  <RadioGroup.Item value="monthly">Monthly ($9.99/month)</RadioGroup.Item>
                  <RadioGroup.Item value="yearly">Yearly ($99.99/year)</RadioGroup.Item>
                  <RadioGroup.Item value="lifetime">Lifetime ($299.99)</RadioGroup.Item>
                </RadioGroup>
              )}
            </Field>
          </div>
        </div>
      )}
    </>
  );
}

export function RadioGroupChoiceCardDemo() {
  const [value, setValue] = useState('team');
  const [orientation, setOrientation] = useState<'left' | 'right'>('left');
  const cards = [
    { id: 'personal', title: 'Personal', description: 'For hobby projects and experimentation.' },
    { id: 'team', title: 'Team', description: 'Collaborate with up to 10 members.' },
    { id: 'business', title: 'Business', description: 'SSO, audit logs, and priority support.' },
  ];

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="orientation">
          <SegmentedControl<'left' | 'right'>
            value={orientation}
            onChange={setOrientation}
            aria-label="orientation"
            size="xs"
          >
            <SegmentedControl.Option value="left">left</SegmentedControl.Option>
            <SegmentedControl.Option value="right">right</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <RadioGroup
          className="flex-col w-[320px] gap-3"
          value={value}
          onChange={setValue}
          aria-label="Workspace type"
        >
          {cards.map((card) => {
            const isSelected = value === card.id;
            return (
              <div
                key={card.id}
                style={{
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--color-background-primary-solid)' : 'var(--color-border-primary-outline)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: isSelected ? 'var(--color-background-primary-soft-alpha)' : undefined,
                  transition: 'border-color 150ms ease, background-color 150ms ease',
                }}
              >
                <RadioGroup.Item value={card.id} block orientation={orientation} className="gap-3 p-3">
                  <div className="flex flex-col flex-1">
                    <span className="font-semibold">{card.title}</span>
                    <span className="text-xs text-secondary mt-0.5">{card.description}</span>
                  </div>
                </RadioGroup.Item>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    </>
  );
}

export function RadioGroupCardSelectionDemo() {
  return (
    <RadioGroup className="flex-col w-full min-w-0 max-w-[390px] gap-4" onChange={() => { }} aria-label="Sample options">
      <RadioGroup.Item className="gap-2.5" value="basic">
        <div>
          <h4 className="font-semibold mb-1">Basic Plan</h4>
          <p className="text-secondary text-sm">5 GB storage • Email support • Free</p>
        </div>
      </RadioGroup.Item>
      <hr className="border-default" />
      <RadioGroup.Item className="gap-2.5" value="standard">
        <div>
          <h4 className="font-semibold mb-1">Standard Plan</h4>
          <p className="text-secondary text-sm">100 GB storage • Priority email support • $9.99/m</p>
        </div>
      </RadioGroup.Item>
      <hr className="border-default" />
      <Tooltip
        maxWidth={258}
        content={
          <>
            Contact our <TextLink href="#">support team</TextLink> for more information on enterprise plans.
          </>
        }
        interactive
      >
        <Tooltip.Trigger>
          <RadioGroup.Item className="gap-2.5" value="enterprise" disabled>
            <div>
              <h4 className="font-semibold mb-1">Enterprise Plan</h4>
              <p className="text-secondary text-sm">
                Unlimited storage • 24/7 phone support • Custom pricing
              </p>
            </div>
          </RadioGroup.Item>
        </Tooltip.Trigger>
      </Tooltip>
    </RadioGroup>
  );
}

export function RadioGroupDescriptionsDemo() {
  const [channel, setChannel] = useState('email');
  const [sound, setSound] = useState('default');

  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="flex flex-col max-w-sm w-full divide-y divide-alpha/15">
        <div className="pb-5">
          <Field label="Notification channel" description="Choose how you'd like to be notified.">
            {() => (
              <RadioGroup direction="col" value={channel} onChange={setChannel} aria-label="Notification channel">
                <RadioGroup.Item value="email">
                  <div className="flex flex-col">
                    <span className="font-medium">Email</span>
                    <span className="text-xs text-secondary mt-0.5">Messages delivered to your inbox.</span>
                  </div>
                </RadioGroup.Item>
                <RadioGroup.Item value="sms">
                  <div className="flex flex-col">
                    <span className="font-medium">SMS</span>
                    <span className="text-xs text-secondary mt-0.5">Text messages to your phone number.</span>
                  </div>
                </RadioGroup.Item>
                <RadioGroup.Item value="push">
                  <div className="flex flex-col">
                    <span className="font-medium">Push</span>
                    <span className="text-xs text-secondary mt-0.5">Real-time alerts on your device.</span>
                  </div>
                </RadioGroup.Item>
              </RadioGroup>
            )}
          </Field>
        </div>
        <div className="pt-5">
          <Field label="Notification sound">
            {() => (
              <RadioGroup direction="col" value={sound} onChange={setSound} aria-label="Notification sound">
                <RadioGroup.Item value="default">Default</RadioGroup.Item>
                <RadioGroup.Item value="chime">Chime</RadioGroup.Item>
                <RadioGroup.Item value="none">None</RadioGroup.Item>
              </RadioGroup>
            )}
          </Field>
        </div>
      </div>
    </div>
  );
}

export function RadioGroupNotificationSettingsDemo() {
  const [visibility, setVisibility] = useState('owners');
  const [view, setView] = useState('list');

  const wide = useBreakpoint('md');
  if (!wide) return (
    <FormScreen title="Preferences">
      <RadioGroup direction="col" className="w-full" value={visibility} onChange={setVisibility} aria-label="Visibility">
        <FieldGroup title="Visibility" description="Control who can see project resources.">
          <Field row label="Hidden"><RadioGroup.Item value="hidden" /></Field>
          <Field row label="Visible to organization owners"><RadioGroup.Item value="owners" /></Field>
          <Field row label="Visible to everyone"><RadioGroup.Item value="everyone" /></Field>
        </FieldGroup>
      </RadioGroup>
      <RadioGroup direction="col" className="w-full" value={view} onChange={setView} aria-label="Default view">
        <FieldGroup title="Default view" description="What opens first in a project.">
          <Field row label="Board"><RadioGroup.Item value="board" /></Field>
          <Field row label="List"><RadioGroup.Item value="list" /></Field>
          <Field row label="Timeline"><RadioGroup.Item value="timeline" /></Field>
        </FieldGroup>
      </RadioGroup>
    </FormScreen>
  );

  return (
    <div className="flex flex-col max-w-sm w-full divide-y divide-alpha/15">
      <div className="pb-5">
        <Field label="Visibility" description="Control who can see project resources.">
          {() => (
            <RadioGroup direction="col" value={visibility} onChange={setVisibility} aria-label="Visibility">
              <RadioGroup.Item value="hidden">Hidden</RadioGroup.Item>
              <RadioGroup.Item value="owners">Visible to organization owners</RadioGroup.Item>
              <RadioGroup.Item value="everyone">Visible to everyone</RadioGroup.Item>
            </RadioGroup>
          )}
        </Field>
      </div>
      <div className="pt-5">
        <Field label="Default view" description="What opens first in a project.">
          {() => (
            <RadioGroup direction="col" value={view} onChange={setView} aria-label="Default view">
              <RadioGroup.Item value="board">Board</RadioGroup.Item>
              <RadioGroup.Item value="list">List</RadioGroup.Item>
              <RadioGroup.Item value="timeline">Timeline</RadioGroup.Item>
            </RadioGroup>
          )}
        </Field>
      </div>
    </div>
  );
}
