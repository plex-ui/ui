'use client';

import { useState } from 'react';
import { Checkbox } from '@plexui/ui/components/Checkbox';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { FormScreen } from './FormRowsDemos';
import { usePhoneRows } from './PhoneRows';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';

const VARIANT_OPTIONS = ['solid', 'ghost'] as const;
const ORIENTATION_OPTIONS = ['left', 'right'] as const;

export function CheckboxOverviewDemo() {
  const [variant, setVariant] = useState<'solid' | 'ghost'>('solid');
  const [pill, setPill] = useState(false);
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl<'solid' | 'ghost'>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <div className="flex flex-col gap-3">
          <Checkbox label="Same as billing address" variant={variant} pill={pill} disabled={disabled} />
          <Checkbox label="Subscribe to newsletter" variant={variant} pill={pill} disabled={disabled} defaultChecked />
        </div>
      </div>
    </>
  );
}

export function CheckboxVariantsDemo() {
  const [disabled, setDisabled] = useState(false);
  // On a phone every solid indicator is the round iOS selection circle, so solid pill would repeat solid
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <div className="flex flex-wrap gap-x-12 gap-y-6">
          <div className="flex flex-col gap-3 items-start">
            <span className="text-xs text-secondary font-mono mb-1">solid</span>
            <Checkbox label="Unchecked" disabled={disabled} />
            <Checkbox label="Checked" defaultChecked disabled={disabled} />
            <Checkbox label="Indeterminate" checked="indeterminate" disabled={disabled} />
          </div>
          {phone ? null : (
            <div className="flex flex-col gap-3 items-start">
              <span className="text-xs text-secondary font-mono mb-1">solid pill</span>
              <Checkbox label="Unchecked" pill disabled={disabled} />
              <Checkbox label="Checked" pill defaultChecked disabled={disabled} />
              <Checkbox label="Indeterminate" pill checked="indeterminate" disabled={disabled} />
            </div>
          )}
          <div className="flex flex-col gap-3 items-start">
            <span className="text-xs text-secondary font-mono mb-1">ghost</span>
            <Checkbox label="Unchecked" variant="ghost" disabled={disabled} />
            <Checkbox label="Checked" variant="ghost" defaultChecked disabled={disabled} />
            <Checkbox label="Indeterminate" variant="ghost" checked="indeterminate" disabled={disabled} />
          </div>
        </div>
      </div>
    </>
  );
}

export function CheckboxPillDemo() {
  const [pill, setPill] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <div className="flex flex-col gap-3">
          <Checkbox label="Unchecked" pill={pill} />
          <Checkbox label="Checked" pill={pill} defaultChecked />
          <Checkbox label="Indeterminate" pill={pill} checked="indeterminate" />
        </div>
      </div>
    </>
  );
}

export function CheckboxGhostDemo() {
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <div className="flex flex-col gap-3">
          <Checkbox label="Unchecked" variant="ghost" disabled={disabled} />
          <Checkbox label="Checked" variant="ghost" disabled={disabled} defaultChecked />
          <Checkbox label="Indeterminate" variant="ghost" disabled={disabled} checked="indeterminate" />
        </div>
      </div>
    </>
  );
}

export function CheckboxIndeterminateDemo() {
  const [checked, setChecked] = useState<boolean | 'indeterminate'>('indeterminate');
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <Checkbox
        checked={checked}
        onCheckedChange={() =>
          setChecked((c) => (c === 'indeterminate' ? true : c ? false : 'indeterminate'))
        }
        label="Select all"
      />
    </div>
  );
}

export function CheckboxOrientationDemo() {
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
            {ORIENTATION_OPTIONS.map((o) => (
              <SegmentedControl.Option key={o} value={o}>
                {o}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <Checkbox label="Accept terms and conditions" orientation={orientation} />
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

export function CheckboxWithoutLabelDemo() {
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="flex gap-4">
        <Checkbox aria-label="Accept terms" />
        <Checkbox aria-label="Subscribe" defaultChecked />
        <Checkbox aria-label="Select all" checked="indeterminate" />
      </div>
    </div>
  );
}

export function CheckboxWithDescriptionDemo() {
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="flex flex-col gap-4 max-w-sm">
        <Checkbox
          label="Accept terms and conditions"
          description="By checking this box, you agree to our Terms of Service and Privacy Policy."
          defaultChecked
        />
        <Checkbox
          label="Enable notifications"
          description="You can enable or disable notifications at any time from settings."
        />
      </div>
    </div>
  );
}

export function CheckboxGroupWithDescriptionDemo() {
  const [items, setItems] = useState([
    { id: 'hard-disks', label: 'Hard disks', checked: true },
    { id: 'external-disks', label: 'External disks', checked: false },
    { id: 'cds-dvds', label: 'CDs, DVDs, and iPods', checked: false },
    { id: 'connected-servers', label: 'Connected servers', checked: false },
  ]);

  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="max-w-sm w-full">
        <Field label="Show on desktop" description="Select the items you want to display on the desktop.">
          {() => (
            <div className="flex flex-col gap-3">
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
          )}
        </Field>
      </div>
    </div>
  );
}

export function CheckboxWithFieldDemo() {
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="showError" value={showError} onChange={setShowError} />
      </div>
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
                <Checkbox label="Subscribe to product updates" />
              </div>
            )}
          </Field>
        </div>
      </div>
    </>
  );
}

export function CheckboxDescriptionsDemo() {
  const [settings, setSettings] = useState({
    marketing: true,
    security: true,
    everything: false,
    mentions: true,
    nothing: false,
  });

  const toggle = (key: keyof typeof settings) => () =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="flex flex-col max-w-sm w-full divide-y divide-alpha/15">
        <div className="pb-5">
          <Field label="Email notifications" description="Configure which emails you receive.">
            {() => (
              <div className="flex flex-col gap-2.5">
                <Checkbox
                  label={
                    <div className="flex flex-col">
                      <span className="font-medium">Marketing</span>
                      <span className="text-xs text-secondary mt-0.5">Receive emails about new products and features.</span>
                    </div>
                  }
                  checked={settings.marketing}
                  onCheckedChange={toggle('marketing')}
                />
                <Checkbox
                  label={
                    <div className="flex flex-col">
                      <span className="font-medium">Security</span>
                      <span className="text-xs text-secondary mt-0.5">Receive emails about account activity and security.</span>
                    </div>
                  }
                  checked={settings.security}
                  onCheckedChange={toggle('security')}
                />
              </div>
            )}
          </Field>
        </div>
        <div className="pt-5">
          <Field label="Push notifications">
            {() => (
              <div className="flex flex-col gap-3">
                <Checkbox label="Everything" checked={settings.everything} onCheckedChange={toggle('everything')} />
                <Checkbox label="Direct messages and mentions" checked={settings.mentions} onCheckedChange={toggle('mentions')} />
                <Checkbox label="Nothing" checked={settings.nothing} onCheckedChange={toggle('nothing')} />
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
    pushEverything: false,
    pushMentions: true,
    pushNothing: false,
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
        <Field row label="Everything"><Checkbox checked={settings.pushEverything} onCheckedChange={toggle('pushEverything')} /></Field>
        <Field row label="Direct messages and mentions"><Checkbox checked={settings.pushMentions} onCheckedChange={toggle('pushMentions')} /></Field>
        <Field row label="Nothing"><Checkbox checked={settings.pushNothing} onCheckedChange={toggle('pushNothing')} /></Field>
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
                  label="Everything"
                  checked={settings.pushEverything}
                  onCheckedChange={toggle('pushEverything')}
                />
                <Checkbox
                  label="Direct messages and mentions"
                  checked={settings.pushMentions}
                  onCheckedChange={toggle('pushMentions')}
                />
                <Checkbox
                  label="Nothing"
                  checked={settings.pushNothing}
                  onCheckedChange={toggle('pushNothing')}
                />
              </div>
            )}
          </Field>
        </div>
      </div>
    </div>
  );
}
