'use client';

import React, { useState } from 'react';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { Switch } from '@plexui/ui/components/Switch';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { TextLink } from '@plexui/ui/components/TextLink';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import { Field } from '@plexui/ui/components/Field';

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
  const [frequency, setFrequency] = useState('daily');
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
        <RadioGroup className="w-56" direction="col" defaultValue="email" aria-label="Default notification channel">
          <RadioGroup.Item value="email" orientation={orientation} block>Email</RadioGroup.Item>
          <RadioGroup.Item value="sms" orientation={orientation} block>SMS</RadioGroup.Item>
          <RadioGroup.Item value="push" orientation={orientation} block>Push notification</RadioGroup.Item>
        </RadioGroup>
      </div>
    </>
  );
}

export function RadioGroupDisabledDemo() {
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <RadioGroup disabled={disabled} defaultValue="standard" aria-label="Shipping method">
          <RadioGroup.Item value="standard">Standard</RadioGroup.Item>
          <RadioGroup.Item value="express">Express</RadioGroup.Item>
          <RadioGroup.Item value="overnight">Overnight</RadioGroup.Item>
        </RadioGroup>
      </div>
    </>
  );
}

export function RadioGroupItemDisabledDemo() {
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <RadioGroup aria-label="Delivery method" className="max-w-[320px] m-auto" direction="col">
          <RadioGroup.Item value="standard">Standard shipping (3–5 days)</RadioGroup.Item>
          <RadioGroup.Item value="express" disabled={disabled}>
            Express shipping (1–2 days)
          </RadioGroup.Item>
          <RadioGroup.Item value="same-day">
            Same-day delivery — available in select metro areas with a minimum order of $50
          </RadioGroup.Item>
        </RadioGroup>
      </div>
    </>
  );
}

export function RadioGroupWithDescriptionDemo() {
  const [value, setValue] = useState('default');
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
  const [value, setValue] = useState('email');
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="max-w-sm">
        <Field label="Notification method" description="Choose how you want to receive notifications.">
          {() => (
            <RadioGroup direction="col" value={value} onChange={setValue} aria-label="Notification method">
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
  const [value, setValue] = useState<string | undefined>(undefined);
  const [showError, setShowError] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="showError" value={showError} onChange={setShowError} />
      </div>
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
    <RadioGroup className="flex-col w-[390px] gap-4" onChange={() => { }} aria-label="Sample options">
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
  const [frequency, setFrequency] = useState('weekly');

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
          <Field label="Notification frequency">
            {() => (
              <RadioGroup direction="col" value={frequency} onChange={setFrequency} aria-label="Notification frequency">
                <RadioGroup.Item value="daily">Daily</RadioGroup.Item>
                <RadioGroup.Item value="weekly">Weekly</RadioGroup.Item>
                <RadioGroup.Item value="monthly">Monthly</RadioGroup.Item>
                <RadioGroup.Item value="never">Never</RadioGroup.Item>
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
  const [frequency, setFrequency] = useState('weekly');

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
        <Field label="Digest frequency" description="How often you receive summary emails.">
          {() => (
            <RadioGroup direction="col" value={frequency} onChange={setFrequency} aria-label="Digest frequency">
              <RadioGroup.Item value="daily">Daily</RadioGroup.Item>
              <RadioGroup.Item value="weekly">Weekly</RadioGroup.Item>
              <RadioGroup.Item value="monthly">Monthly</RadioGroup.Item>
              <RadioGroup.Item value="never">Never</RadioGroup.Item>
            </RadioGroup>
          )}
        </Field>
      </div>
    </div>
  );
}
