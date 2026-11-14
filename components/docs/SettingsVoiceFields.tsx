'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { SoundOffSpeaker, SoundOnSpeaker } from '@plexui/ui/components/Icon';
import { Select } from '@plexui/ui/components/Select';
import { Slider } from '@plexui/ui/components/Slider';
import { Stepper } from '@plexui/ui/components/Stepper';
import { rowButtonClassName } from './phoneRowsTemplate';
import { defaultVoicePreferences, pauseText, voiceOptions, voiceSliders, type VoicePreferences } from './settingsVoiceData';
import s from './SettingsVoiceDemo.module.css';

/** Spoken voice settings in the shape of iOS Settings › Accessibility › Spoken Content › Voice (IMG_5944) with the
 * Use Default rows of VoiceOver's activities (IMG_5949). Values belong to the screen owner. */
export function SettingsVoiceFields({ value, onChange }: {
  value: VoicePreferences;
  onChange: (value: VoicePreferences) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return <>
    <FieldGroup aria-label="Voice">
      <Field row label="Voice">
        <Select value={value.voice} options={voiceOptions} block={false} align="end"
          onChange={(option) => onChange({ ...value, voice: option.value })} />
      </Field>
    </FieldGroup>
    {voiceSliders.map((slider) => (
      <FieldGroup key={slider.key} title={slider.title}>
        <div className={s.Row} data-row>
          <Slider aria-label={slider.title} min={0} max={100} step={1} value={value[slider.key]} className={s.Slider}
            onChange={(next) => onChange({ ...value, [slider.key]: next })}
            startAdornment={'start' in slider ? slider.start : <SoundOffSpeaker />}
            endAdornment={'end' in slider ? slider.end : <SoundOnSpeaker />} />
        </div>
        <div data-row>
          <Button block color="info" variant="ghost" className={`${rowButtonClassName} ${s.Action}`}
            onClick={() => onChange({ ...value, [slider.key]: defaultVoicePreferences[slider.key] })}>
            <span className={s.ActionText}>{slider.reset}</span>
          </Button>
        </div>
      </FieldGroup>
    ))}
    {/* The number under the label, the stepper at the end of the row (Timbre, Sentence Pause) */}
    <FieldGroup aria-label="Timing">
      <Field row label="Timbre" description={String(value.timbre)}>
        <Stepper value={value.timbre} min={50} max={150} step={10} decrementLabel="Lower timbre" incrementLabel="Raise timbre"
          onChange={(timbre) => onChange({ ...value, timbre })} />
      </Field>
      <Field row label="Sentence Pause" description={pauseText(value.pause)}>
        <Stepper value={value.pause} min={0} max={5} decrementLabel="Shorter pause" incrementLabel="Longer pause"
          onChange={(pause) => onChange({ ...value, pause })} />
      </Field>
    </FieldGroup>
    <FieldGroup aria-label="Reset">
      <div data-row>
        {/* The row is the dialog's trigger, so closing the alert returns focus to it */}
        <Dialog open={confirm} onOpenChange={setConfirm}>
          <Dialog.Trigger>
            <Button block color="danger" variant="ghost" className={`${rowButtonClassName} ${s.Action}`} data-described="">
              <span className={s.ActionText}>
                Reset Voice Settings
                <span className={s.ActionDescription}>Reverts all voice changes to defaults.</span>
              </span>
            </Button>
          </Dialog.Trigger>
          <Dialog.Content mobileVariant="alert" surface="plain">
            <Dialog.Header>
              <Dialog.Title>Reset voice settings?</Dialog.Title>
              <Dialog.Description>The voice, rate, pitch, volume, timbre and pause go back to their defaults.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Close><Button color="secondary" variant="soft">Cancel</Button></Dialog.Close>
              <Button color="danger" onClick={() => { onChange(defaultVoicePreferences); setConfirm(false); }}>Reset</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      </div>
    </FieldGroup>
  </>;
}
