'use client';

import { useState, type ReactNode } from 'react';
import { Switch } from '@plexui/ui/components/Switch';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { FormScreen } from './FormRowsDemos';
import { phoneRowsClassName, usePhoneRows } from './PhoneRows';

import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';

function PhoneSwitchGroup({ children, title, footer }: { children: ReactNode; title?: string; footer?: string }) {
  return (
    <div data-switch-phone-rows className={phoneRowsClassName}>
      <FieldGroup title={title} footer={footer}>{children}</FieldGroup>
    </div>
  );
}

export function SwitchStatesDemo() {
  const phone = usePhoneRows();
  const [color, setColor] = useState<'primary' | 'accent'>('accent');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="color">
          <SegmentedControl<'primary' | 'accent'> value={color} onChange={setColor} aria-label="color" size="xs">
            <SegmentedControl.Option value="primary">primary</SegmentedControl.Option>
            <SegmentedControl.Option value="accent">accent</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className={phone ? 'w-full' : 'flex w-full flex-1 items-center justify-center py-8'}>
        {phone ? (
          <div data-switch-phone-rows className={phoneRowsClassName}>
            {[false, true].map((disabled) => (
              <FieldGroup key={String(disabled)} title={disabled ? 'Disabled' : 'Enabled'}>
                {[false, true].map((checked) => (
                  <Field key={String(checked)} row label={checked ? 'Initially on' : 'Initially off'}>
                    <Switch color={color} disabled={disabled} defaultChecked={checked} />
                  </Field>
                ))}
              </FieldGroup>
            ))}
          </div>
        ) : (
          <table className="w-full max-w-sm border-separate border-spacing-x-4 border-spacing-y-4 text-sm">
            <caption className="sr-only">Initial switch states. Enabled switches are interactive.</caption>
            <thead>
              <tr>
                <th scope="col" className="text-left font-normal text-secondary">State</th>
                <th scope="col" className="text-center font-normal text-secondary">Off</th>
                <th scope="col" className="text-center font-normal text-secondary">On</th>
              </tr>
            </thead>
            <tbody>
              {[false, true].map((disabled) => (
                <tr key={String(disabled)}>
                  <th scope="row" className="text-left font-normal">{disabled ? 'Disabled' : 'Enabled'}</th>
                  {[false, true].map((checked) => (
                    <td key={String(checked)}>
                      <div className="flex justify-center">
                        <Switch color={color} disabled={disabled} defaultChecked={checked} aria-label={(disabled ? 'Disabled' : 'Enabled') + ', initially ' + (checked ? 'on' : 'off')} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}


export function SwitchLabelsDemo() {
  const phone = usePhoneRows();
  const [labelPosition, setLabelPosition] = useState<'start' | 'end'>('start');
  return (
    <>
      {!phone && (
        <div data-demo-controls style={controlsTableStyle}>
          <DemoControlRow name="labelPosition">
            <SegmentedControl<'start' | 'end'> value={labelPosition} onChange={setLabelPosition} aria-label="labelPosition" size="xs">
              <SegmentedControl.Option value="start">start</SegmentedControl.Option>
              <SegmentedControl.Option value="end">end</SegmentedControl.Option>
            </SegmentedControl>
          </DemoControlRow>
        </div>
      )}
      <div data-demo-stage className={phone ? 'w-full' : 'flex w-full flex-1 items-center justify-center py-8'}>
        {phone ? (
          <PhoneSwitchGroup>
            <Field row label="Notifications"><Switch color="accent" name="notifications" defaultChecked /></Field>
            <Field row label="Weekly summary" description="Sent on Mondays."><Switch color="accent" name="summary" /></Field>
          </PhoneSwitchGroup>
        ) : (
          <div className="flex w-full max-w-sm flex-col gap-6">
            <Switch color="accent" name="notifications" label="Notifications" labelPosition={labelPosition} defaultChecked />
            <Switch color="accent" name="summary" label="Weekly summary" description="Sent on Mondays." labelPosition={labelPosition} />
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
    <div className="flex w-full max-w-lg flex-col gap-6">{groups}</div>
  );
}
