'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Disclosure } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { Select } from '@plexui/ui/components/Select';
import { Slider } from '@plexui/ui/components/Slider';
import { Stepper } from '@plexui/ui/components/Stepper';
import { Switch } from '@plexui/ui/components/Switch';
import { TextLink } from '@plexui/ui/components/TextLink';
import {
  actionOptions, balanceText, faceActions, offOnOptions, trackingModes,
  type AudioSettings, type HeadTrackingSettings,
} from './settingsAudioData';
import s from './SettingsVoiceDemo.module.css';

const learnMore = <TextLink primary href="#audio-and-visual">Learn more…</TextLink>;

/** Rows each in a group of their own with a footer that ends with a link, a row that opens a page, a switch, and the
 * balance between the channels, as Audio & Visual (IMG_5966, IMG_5962). The balance names its ends and its value over
 * the track. */
export function AudioFields({ value, onChange, onLiveListen }: { value: AudioSettings; onChange: (value: AudioSettings) => void; onLiveListen?: () => void }) {
  return <>
    <FieldGroup title="Audio" footer={<p>You can customize the audio for supported headphones. {learnMore}</p>}>
      <Field row label="Headphone Accommodations">
        <Select value={value.accommodations} options={offOnOptions} block={false} align="end" onChange={(option) => onChange({ ...value, accommodations: option.value })} />
      </Field>
    </FieldGroup>
    <FieldGroup footer={<p>Plays background sounds to mask unwanted environmental noise. These sounds can minimize distractions and help you focus. {learnMore}</p>}>
      <Field row label="Background Sounds">
        <Select value={value.background} options={offOnOptions} block={false} align="end" onChange={(option) => onChange({ ...value, background: option.value })} />
      </Field>
    </FieldGroup>
    <FieldGroup aria-label="Live Listen">
      <div data-row>
        <Button block color="primary" variant="ghost" onClick={onLiveListen}>
          <span className={s.ValueRowContent}>Live Listen<span className={s.ValueRowValue} /><Disclosure data-no-autosize="" /></span>
        </Button>
      </div>
    </FieldGroup>
    <FieldGroup footer="Make the left and right speakers play the same content.">
      <Field row label="Mono Audio">
        <Switch color="accent" checked={value.mono} onCheckedChange={(mono) => onChange({ ...value, mono })} />
      </Field>
    </FieldGroup>
    <FieldGroup title="Balance" footer="Adjust the audio volume balance between left and right channels.">
      <div className={s.BalanceRow} data-row>
        <div className={s.BalanceLabels} aria-hidden="true"><span>L</span><span>{balanceText(value.balance)}</span><span>R</span></div>
        <Slider aria-label="Balance" min={-1} max={1} step={0.05} value={value.balance}
          onChange={(balance) => onChange({ ...value, balance })} />
      </div>
    </FieldGroup>
  </>;
}

/** A switch with a footer, actions chosen in menus, and a number typed in a field or stepped, as Head Tracking
 * (IMG_5965): the field at the start of the row, the stepper at its end. */
export function HeadTrackingFields({ value, onChange }: { value: HeadTrackingSettings; onChange: (value: HeadTrackingSettings) => void }) {
  const speed = (next: number) => onChange({ ...value, speed: Math.min(100, Math.max(0, Math.round(next))) });
  // What is typed stays as typed until it is committed (blur or Return); a field left empty or not a number goes back
  const [draft, setDraft] = useState<string | null>(null);
  // A step goes on from what is typed, not yet committed: the stepper stands at the typed number (Codex #55, #56)
  const typedOr = (fallback: number) => (draft !== null && draft.trim() !== '' && Number.isFinite(Number(draft)) ? Number(draft) : fallback);
  const commit = () => {
    if (draft !== null && draft.trim() !== '' && Number.isFinite(Number(draft))) speed(Number(draft));
    setDraft(null);
  };
  return <>
    <FieldGroup footer="Head tracking uses the camera to track the movement of your head to control a pointer on screen, and tracks facial movements to perform actions.">
      <Field row label="Head Tracking">
        <Switch color="accent" checked={value.on} onCheckedChange={(on) => onChange({ ...value, on })} />
      </Field>
    </FieldGroup>
    <FieldGroup title="Actions">
      {faceActions.map((name) => (
        <Field key={name} row label={name}>
          <Select value={value.actions[name]} options={actionOptions} block={false} align="end"
            onChange={(option) => onChange({ ...value, actions: { ...value.actions, [name]: option.value } })} />
        </Field>
      ))}
    </FieldGroup>
    <FieldGroup title="Pointer">
      <Field row label="Tracking Mode">
        <Select value={value.mode} options={trackingModes} block={false} align="end" onChange={(option) => onChange({ ...value, mode: option.value })} />
      </Field>
    </FieldGroup>
    <FieldGroup title="Pointer Speed">
      <div className={s.NumberRow} data-row>
        <Input size="sm" variant="ghost" inputMode="numeric" className={s.NumberField} aria-label="Pointer Speed" value={draft ?? String(value.speed)}
          onChange={(event) => setDraft(event.target.value)} onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} />
        <Stepper aria-label="Adjust Pointer Speed" value={Math.min(100, Math.max(0, typedOr(value.speed)))} min={0} max={100} step={10}
          onChange={(next) => { speed(next); setDraft(null); }} decrementLabel="Slower" incrementLabel="Faster" />
      </div>
    </FieldGroup>
  </>;
}
