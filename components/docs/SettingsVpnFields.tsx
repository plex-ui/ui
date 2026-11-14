'use client';

import { Button } from '@plexui/ui/components/Button';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { InfoCircle } from '@plexui/ui/components/Icon';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { Switch } from '@plexui/ui/components/Switch';
import { TextLink } from '@plexui/ui/components/TextLink';
import { tvProviders, vpnConfigurations, type VpnSettings } from './settingsVpnData';
import s from './SettingsVoiceDemo.module.css';

/** The status with its switch, then the configurations of the device, as Settings › VPN (IMG_5959). A row whose
 * choice has an action at its end leads with its check: each configuration is a Field with a RadioGroup.Item and
 * the info button as its `action`. A tap on the row chooses; the info button opens the configuration. */
export function VpnFields({ value, onChange, onInfo }: { value: VpnSettings; onChange: (value: VpnSettings) => void; onInfo?: (id: string) => void }) {
  const chosen = vpnConfigurations.find((item) => item.id === value.chosen);
  return <>
    <FieldGroup footer={`To connect without this switch, use the “${chosen?.type ?? 'VPN'}” app.`}>
      <Field row label="VPN Status">
        {(control) => (
          <span className={s.StatusControl}>
            <span className={s.ValueRowValue}>{value.connected ? 'Connected' : 'Not Connected'}</span>
            <Switch {...control} color="accent" checked={value.connected} onCheckedChange={(connected) => onChange({ ...value, connected })} />
          </span>
        )}
      </Field>
    </FieldGroup>
    <RadioGroup direction="col" className="w-full" value={value.chosen} aria-label="Device VPN"
      onChange={(chosen) => onChange({ ...value, chosen })}>
      <FieldGroup title="Device VPN">
        {vpnConfigurations.map((item) => (
          <Field key={item.id} row label={item.name} description={item.type}
            action={<Button color="info" variant="ghost" uniform pill opticallyAlign="end" aria-label={`${item.name} details`} onClick={() => onInfo?.(item.id)}><InfoCircle /></Button>}>
            <RadioGroup.Item value={item.id} />
          </Field>
        ))}
      </FieldGroup>
    </RadioGroup>
  </>;
}

/** A paragraph over the providers, each a row that opens its sign-in, then a centred row with a footer of two
 * paragraphs, the second a link, as Settings › TV Provider (IMG_5958). The paragraph is the group's title. */
export function TvProviderFields({ onProvider, onRegions }: { onProvider?: (name: string) => void; onRegions?: () => void }) {
  return <>
    <FieldGroup title="Watch TV shows and movies from apps included in your TV subscription. Select your TV provider to get started.">
      {tvProviders.map((name) => (
        <div key={name} data-row><Button block color="primary" variant="ghost" onClick={() => onProvider?.(name)}>{name}</Button></div>
      ))}
    </FieldGroup>
    <FieldGroup footer={<>
      <p>If you don’t see your TV provider, sign in directly from the app you want to use.</p>
      <p><TextLink primary href="#tv-provider">About TV Provider &amp; Privacy…</TextLink></p>
    </>}>
      <div data-row data-align="center"><Button block color="primary" variant="ghost" onClick={onRegions}>Other TV Provider Regions…</Button></div>
    </FieldGroup>
  </>;
}
