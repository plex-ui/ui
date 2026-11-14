'use client';

import { Button } from '@plexui/ui/components/Button';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { Switch } from '@plexui/ui/components/Switch';
import { TextLink } from '@plexui/ui/components/TextLink';
import { receivingOptions, type SharingSettings } from './settingsSharingData';

/** One choice checked in its own group with a link in the footer, switches under headers with footers, and a row in
 * the accent that opens a page, as AirDrop (IMG_5955). The choice is a RadioGroup around its group: on a phone the
 * chosen row carries the check, on a desktop the radios. The row in the accent is a ghost block Button in a row. */
export function SharingFields({ value, onChange, onManage }: { value: SharingSettings; onChange: (value: SharingSettings) => void; onManage?: () => void }) {
  return <>
    <RadioGroup direction="col" className="w-full" value={value.receiving} aria-label="Receiving"
      onChange={(receiving) => onChange({ ...value, receiving })}>
      <FieldGroup footer={<p>Nearby Sharing lets you share instantly with people nearby. You can be discoverable to receive from everyone or only people in your contacts. <TextLink primary href="#sharing-settings">About Nearby Sharing &amp; Privacy…</TextLink></p>}>
        {receivingOptions.map((option) => (
          <Field key={option.value} row label={option.label}><RadioGroup.Item value={option.value} /></Field>
        ))}
      </FieldGroup>
    </RadioGroup>
    <FieldGroup title="Start Sharing By" footer="Swap contact details, share photos, and more by holding the top of your phone close to another phone.">
      <Field row label="Bringing Devices Together">
        <Switch color="accent" checked={value.together} onCheckedChange={(together) => onChange({ ...value, together })} />
      </Field>
    </FieldGroup>
    <FieldGroup title="Out of Range" footer="Continue to send and receive content when Wi-Fi is not available during Nearby Sharing.">
      <Field row label="Use Cellular Data">
        <Switch color="accent" checked={value.cellular} onCheckedChange={(cellular) => onChange({ ...value, cellular })} />
      </Field>
    </FieldGroup>
    <FieldGroup footer="You will automatically appear for 30 days to people you have shared a one-time code with.">
      <div data-row><Button block color="info" variant="ghost" onClick={onManage}>Manage Known Contacts</Button></div>
    </FieldGroup>
  </>;
}
