'use client';

import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Book, Compass, Fingerprint, Globe, Key, Music, Search, ShieldCheck } from '@plexui/ui/components/Icon';
import { Switch } from '@plexui/ui/components/Switch';
import { TextLink } from '@plexui/ui/components/TextLink';
import { autofillApps, hapticApps, type AutofillSettings } from './settingsAppsData';
import s from './SettingsAppsFields.module.css';

const symbols = { key: Key, shield: ShieldCheck, fingerprint: Fingerprint, globe: Globe, compass: Compass, search: Search, book: Book, music: Music };

export type IconStyle = 'tile' | 'outline' | 'plain';

/** An app's picture, which Field's `icon` sets in the row's image column: its color with the symbol in white, a light
 * tile with a hairline edge, or the symbol alone */
function AppPicture({ symbol, tile, style }: { symbol: keyof typeof symbols; tile?: string; style: IconStyle }) {
  const Symbol = symbols[symbol];
  return <span className={s.Picture} data-style={style} style={tile ? { '--app-tile': tile } as React.CSSProperties : undefined}><Symbol /></span>;
}

/** Apps with a switch each, as AutoFill & Passwords (IMG_5952): a switch for the whole feature with a footer, the
 * apps under a header with their picture, name and what they fill; an app that may not fill reads quieter. */
export function AutofillFields({ value, onChange, iconStyle = 'tile' }: { value: AutofillSettings; onChange: (value: AutofillSettings) => void; iconStyle?: IconStyle }) {
  const setApp = (id: string, on: boolean) => onChange({ ...value, apps: { ...value.apps, [id]: on } });
  return <>
    <FieldGroup footer="Automatically suggest passwords, passkeys, and verification codes when signing in to apps and websites.">
      <Field row label="AutoFill Passwords and Passkeys">
        <Switch color="accent" checked={value.autofill} onCheckedChange={(autofill) => onChange({ ...value, autofill })} />
      </Field>
    </FieldGroup>
    {value.autofill && (
      <FieldGroup title="AutoFill from:">
        {autofillApps.map((app) => (
          <Field key={app.id} row label={app.name} description={app.detail} icon={<AppPicture symbol={app.symbol} tile={app.tile} style={iconStyle} />}
            className={value.apps[app.id] ? undefined : s.Off}>
            <Switch color="accent" checked={value.apps[app.id]} onCheckedChange={(on) => setApp(app.id, on)} />
          </Field>
        ))}
      </FieldGroup>
    )}
    <FieldGroup footer="Automatically suggest unique, strong passwords when creating accounts or changing passwords.">
      <Field row label="Suggest Strong Passwords">
        <Switch color="accent" checked={value.strong} onCheckedChange={(strong) => onChange({ ...value, strong })} />
      </Field>
    </FieldGroup>
  </>;
}

/** A switch with a link in its footer, and a list of the apps it works in, as Music Haptics (IMG_5963): each app a
 * glyph and a name, nothing to set; the footer under the list says what it holds. */
export function HapticsFields({ value, onChange, iconStyle = 'outline' }: { value: boolean; onChange: (value: boolean) => void; iconStyle?: IconStyle }) {
  return <>
    <FieldGroup footer={<p>When available, Music Haptics plays the rhythm of a song as taps. <TextLink primary href="#apps-in-rows">Learn more…</TextLink></p>}>
      <Field row label="Music Haptics">
        <Switch color="accent" checked={value} onCheckedChange={onChange} />
      </Field>
    </FieldGroup>
    <FieldGroup title="Available Apps" footer="Apps which support Music Haptics.">
      {hapticApps.map((app) => (
        <Field key={app.id} row label={app.name} icon={<AppPicture symbol={app.symbol} tile={app.tile} style={iconStyle} />}>
          {/* Nothing to set: no control, so nothing takes the label's name */}
          {() => null}
        </Field>
      ))}
    </FieldGroup>
  </>;
}
