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

export function RadioGroupBaseDemo() {
  const phone = usePhoneRows();
  const [frequency, setFrequency] = useState('daily');
  if (phone) return (
    <PhoneRowsStage>
      <RadioGroup direction="col" className="w-full" value={frequency} onChange={setFrequency} aria-label="Notification frequency">
        <FieldGroup title="Notification frequency">
          <Field row label="Daily"><RadioGroup.Item value="daily" /></Field>
          <Field row label="Weekly"><RadioGroup.Item value="weekly" /></Field>
          <Field row label="Monthly"><RadioGroup.Item value="monthly" /></Field>
          <Field row label="Never"><RadioGroup.Item value="never" /></Field>
        </FieldGroup>
      </RadioGroup>
    </PhoneRowsStage>
  );
  return (
    <div>
      <h3 className="font-semibold text-sm mb-3">Notification frequency</h3>
      <RadioGroup
        direction="col"
        value={frequency}
        onChange={setFrequency}
        aria-label="Notification frequency"
      >
        <RadioGroup.Item value="daily">Daily</RadioGroup.Item>
        <RadioGroup.Item value="weekly">Weekly</RadioGroup.Item>
        <RadioGroup.Item value="monthly">Monthly</RadioGroup.Item>
        <RadioGroup.Item value="never">Never</RadioGroup.Item>
      </RadioGroup>
    </div>
  );
}

export function RadioGroupDirectionDemo() {
  const [direction, setDirection] = useState<'col' | 'row'>('col');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="direction">
          <SegmentedControl<'col' | 'row'>
            value={direction}
            onChange={setDirection}
            aria-label="direction"
            size="xs"
          >
            <SegmentedControl.Option value="col">col</SegmentedControl.Option>
            <SegmentedControl.Option value="row">row</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <RadioGroup direction={direction} defaultValue="light" aria-label="Theme">
          <RadioGroup.Item value="light">Light</RadioGroup.Item>
          <RadioGroup.Item value="dark">Dark</RadioGroup.Item>
          <RadioGroup.Item value="system">System</RadioGroup.Item>
        </RadioGroup>
      </div>
    </>
  );
}

export function RadioGroupOrientationDemo() {
  const [orientation, setOrientation] = useState<'left' | 'right'>('left');
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
        <RadioGroup className="w-56" direction="col" defaultValue="medium" aria-label="Text size">
          <RadioGroup.Item value="small" orientation={orientation} block>Small</RadioGroup.Item>
          <RadioGroup.Item value="medium" orientation={orientation} block>Medium</RadioGroup.Item>
          <RadioGroup.Item value="large" orientation={orientation} block>Large</RadioGroup.Item>
        </RadioGroup>
      </div>
    </>
  );
}

export function RadioGroupDisabledDemo() {
  const phone = usePhoneRows();
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneRowsStage>
          <RadioGroup direction="col" className="w-full" disabled={disabled} defaultValue="automatic" aria-label="Video quality">
            <FieldGroup title="Video quality">
              <Field row label="Automatic"><RadioGroup.Item value="automatic" /></Field>
              <Field row label="High"><RadioGroup.Item value="high" /></Field>
              <Field row label="Data saver"><RadioGroup.Item value="data-saver" /></Field>
            </FieldGroup>
          </RadioGroup>
        </PhoneRowsStage>
      ) : (
        <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
          <RadioGroup disabled={disabled} defaultValue="automatic" aria-label="Video quality">
            <RadioGroup.Item value="automatic">Automatic</RadioGroup.Item>
            <RadioGroup.Item value="high">High</RadioGroup.Item>
            <RadioGroup.Item value="data-saver">Data saver</RadioGroup.Item>
          </RadioGroup>
        </div>
      )}
    </>
  );
}

export function RadioGroupItemDisabledDemo() {
  const phone = usePhoneRows();
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneRowsStage>
          <RadioGroup direction="col" className="w-full" aria-label="Delivery method">
            <FieldGroup title="Delivery method">
              <Field row label="Standard shipping (3-5 days)"><RadioGroup.Item value="standard" /></Field>
              <Field row label="Express shipping (1-2 days)"><RadioGroup.Item value="express" disabled={disabled} /></Field>
              <Field row label="Same-day delivery, available in select metro areas with a minimum order of $50">
                <RadioGroup.Item value="same-day" />
              </Field>
            </FieldGroup>
          </RadioGroup>
        </PhoneRowsStage>
      ) : (
        <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
          <RadioGroup aria-label="Delivery method" className="max-w-[320px] m-auto" direction="col">
            <RadioGroup.Item value="standard">Standard shipping (3-5 days)</RadioGroup.Item>
            <RadioGroup.Item value="express" disabled={disabled}>
              Express shipping (1-2 days)
            </RadioGroup.Item>
            <RadioGroup.Item value="same-day">
              Same-day delivery, available in select metro areas with a minimum order of $50
            </RadioGroup.Item>
          </RadioGroup>
        </div>
      )}
    </>
  );
}

export function RadioGroupWithDescriptionDemo() {
  const phone = usePhoneRows();
  const [value, setValue] = useState('default');
  if (phone) return (
    <PhoneRowsStage>
      <RadioGroup direction="col" className="w-full" value={value} onChange={setValue} aria-label="Spacing">
        <FieldGroup title="Spacing">
          <Field row label="Default" description="Standard spacing for most use cases."><RadioGroup.Item value="default" /></Field>
          <Field row label="Comfortable" description="More space between elements."><RadioGroup.Item value="comfortable" /></Field>
          <Field row label="Compact" description="Minimal spacing for dense layouts."><RadioGroup.Item value="compact" /></Field>
        </FieldGroup>
      </RadioGroup>
    </PhoneRowsStage>
  );
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <RadioGroup direction="col" value={value} onChange={setValue} aria-label="Spacing">
        <RadioGroup.Item value="default" description="Standard spacing for most use cases.">
          Default
        </RadioGroup.Item>
        <RadioGroup.Item value="comfortable" description="More space between elements.">
          Comfortable
        </RadioGroup.Item>
        <RadioGroup.Item value="compact" description="Minimal spacing for dense layouts.">
          Compact
        </RadioGroup.Item>
      </RadioGroup>
    </div>
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
