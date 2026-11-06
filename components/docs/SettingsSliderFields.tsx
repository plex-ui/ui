'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Slider } from '@plexui/ui/components/Slider';
import { Switch } from '@plexui/ui/components/Switch';
import { TextLink } from '@plexui/ui/components/TextLink';
import type { PlaybackPreferences } from './settingsSliderData';
import s from './SettingsSliderDemo.module.css';


/** Values belong to the screen owner so changing its presentation preserves them. */
export function SettingsSliderFields({ value, onChange }: {
  value: PlaybackPreferences;
  onChange: (value: PlaybackPreferences) => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  return <>
    <FieldGroup aria-label="Playback options">
      <Field row label="Sound">
        <Switch color="accent" checked={value.sound} onCheckedChange={(sound) => onChange({ ...value, sound })} />
      </Field>
    </FieldGroup>
    <FieldGroup title="Volume" footer={<>
      <p>Choose the volume used for playback. Turning sound off keeps your last setting.</p>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <Dialog.Trigger>
          <TextLink primary className={s.Help}>Learn more</TextLink>
        </Dialog.Trigger>
        <Dialog.Content mobileVariant="sheet" width={400}>
          <Dialog.Header>
            <Dialog.Title>Playback volume</Dialog.Title>
            <Dialog.Description>Volume applies while sound is enabled. Turn on consistent volume to keep quiet and loud recordings closer together.</Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer><Dialog.Close><Button color="primary" pill>Done</Button></Dialog.Close></Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </>}>
      <div className={s.Row} data-row data-slider-setting data-disabled={!value.sound || undefined}>
        <Slider aria-label="Volume" min={0} max={100} step={1} value={value.volume}
          disabled={!value.sound} className={s.Slider}
          onChange={(volume) => onChange({ ...value, volume })} />
        <output className={s.Value} aria-hidden="true">{value.volume}%</output>
      </div>
    </FieldGroup>
    <FieldGroup footer="Reduce differences between quiet and loud recordings.">
      <Field row label="Consistent volume">
        <Switch color="accent" checked={value.normalize} onCheckedChange={(normalize) => onChange({ ...value, normalize })} />
      </Field>
    </FieldGroup>
  </>;
}
