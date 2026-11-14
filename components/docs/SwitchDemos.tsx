'use client';

import { useState, type ReactNode } from 'react';
import { Switch } from '@plexui/ui/components/Switch';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { FormScreen } from './FormRowsDemos';
import { phoneRowsClassName, usePhoneRows } from './PhoneRows';

import { DemoControlBoolean, Segments, controlsTableStyle } from './ButtonDemos';

function PhoneSwitchGroup({ children, title, footer }: { children: ReactNode; title?: string; footer?: string }) {
  return (
    <div data-phone-rows className={phoneRowsClassName}>
      <FieldGroup title={title} footer={footer}>{children}</FieldGroup>
    </div>
  );
}

const COLORS = ['primary', 'accent'] as const;
const LABEL_POSITIONS = ['start', 'end'] as const;
// Two settings, one on and one off, so every setting shows on both states
const OVERVIEW_SWITCHES = [
  { name: 'notifications', label: 'Notifications', description: 'Messages and mentions.', defaultChecked: true },
  { name: 'summary', label: 'Weekly summary', description: 'Sent on Mondays.', defaultChecked: false },
] as const;

/** The Overview, with every setting of a switch on two of them, one on and one off: what the page's examples Overview
 * (off and on, enabled and disabled) and Label and description showed are its settings (owner 11.11: «в первом примере
 * можно сразу показать все со всеми настройками»). On a phone each switch is the trailing control of a row, which
 * holds its label and description; the label stays at the start there, so labelPosition is a desktop setting. */
export function SwitchOverviewDemo() {
  const phone = usePhoneRows();
  const [color, setColor] = useState<(typeof COLORS)[number]>('accent');
  const [description, setDescription] = useState(false);
  const [labelPosition, setLabelPosition] = useState<(typeof LABEL_POSITIONS)[number]>('start');
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="color" options={COLORS} value={color} onChange={setColor} />
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <Segments name="labelPosition" options={LABEL_POSITIONS} value={labelPosition} onChange={setLabelPosition} desktopOnly />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className={phone ? 'w-full' : 'flex w-full flex-1 items-center justify-center py-8'}>
        {phone ? (
          <PhoneSwitchGroup>
            {OVERVIEW_SWITCHES.map((item) => (
              <Field key={item.name} row label={item.label} description={description ? item.description : undefined}>
                <Switch color={color} name={item.name} defaultChecked={item.defaultChecked} disabled={disabled} />
              </Field>
            ))}
          </PhoneSwitchGroup>
        ) : (
          <div className="flex w-full max-w-sm flex-col gap-6 [--field-group-gap:13px]">
            {OVERVIEW_SWITCHES.map((item) => (
              <Switch
                key={item.name}
                color={color}
                name={item.name}
                label={item.label}
                description={description ? item.description : undefined}
                labelPosition={labelPosition}
                defaultChecked={item.defaultChecked}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function SwitchControlledDemo() {
  const phone = usePhoneRows();
  const [checked, setChecked] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="checked" value={checked} onChange={setChecked} />
      </div>
      <div data-demo-stage className={phone ? 'w-full' : 'flex w-full flex-1 items-center justify-center py-8'}>
        {phone ? (
          <PhoneSwitchGroup>
            <Field row label="Airplane mode"><Switch color="accent" checked={checked} onCheckedChange={setChecked} /></Field>
          </PhoneSwitchGroup>
        ) : <Switch color="accent" label="Airplane mode" checked={checked} onCheckedChange={setChecked} />}
      </div>
    </>
  );
}

export function SwitchSettingsDemo() {
  const phone = usePhoneRows();
  const groups = (
    <>
      <FieldGroup title="Notifications">
        <Field row label="Push notifications"><Switch color="accent" defaultChecked /></Field>
        <Field row label="Product updates" description="A few emails a month."><Switch color="accent" /></Field>
      </FieldGroup>
      <FieldGroup title="Privacy" footer="You can change your data sharing preference at any time.">
        <Field row label="Share usage data"><Switch color="accent" /></Field>
        <Field row label="Security alerts" description="Required for your account."><Switch color="accent" defaultChecked disabled /></Field>
      </FieldGroup>
    </>
  );
  return phone ? <FormScreen title="Preferences">{groups}</FormScreen> : (
    <div className="flex w-full max-w-lg flex-col gap-6 [--field-group-gap:13px]">{groups}</div>
  );
}
