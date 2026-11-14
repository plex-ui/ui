'use client';

import { Button } from '@plexui/ui/components/Button';
import { ColorWell } from '@plexui/ui/components/ColorPicker';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Disclosure } from '@plexui/ui/components/Icon';
import { Select } from '@plexui/ui/components/Select';
import { Slider } from '@plexui/ui/components/Slider';
import { Switch } from '@plexui/ui/components/Switch';
import {
  boldOptions, captionsGestures, captionsNote, fontOptions, keepOptions, languageOptions, sizeOptions,
  type CaptionsAppearance, type CaptionsSettings,
} from './settingsCaptionsData';
import s from './SettingsVoiceDemo.module.css';

/** A switch and a row that opens a page over a footer with a list, then choices in menus, as Live Captions
 * (IMG_5960). The footer's list is a `ul`: each item a line that starts with a bullet. */
export function CaptionsFields({ value, onChange, onAppearance }: { value: CaptionsSettings; onChange: (value: CaptionsSettings) => void; onAppearance?: () => void }) {
  return <>
    <FieldGroup footer={<>
      <p>{captionsNote}</p>
      <ul>{captionsGestures.map((line) => <li key={line}>{line}</li>)}</ul>
    </>}>
      <Field row label="Live Captions">
        <Switch color="accent" checked={value.on} onCheckedChange={(on) => onChange({ ...value, on })} />
      </Field>
      <div data-row>
        <Button block color="primary" variant="ghost" onClick={onAppearance}>
          <span className={s.ValueRowContent}>Appearance<span className={s.ValueRowValue} /><Disclosure data-no-autosize="" /></span>
        </Button>
      </div>
    </FieldGroup>
    <FieldGroup aria-label="Call captions">
      <Field row label="Keep Call Captions">
        <Select value={value.keep} options={keepOptions} block={false} align="end" onChange={(option) => onChange({ ...value, keep: option.value })} />
      </Field>
    </FieldGroup>
    <FieldGroup title="Supported Languages">
      <Field row label="Current Language">
        <Select value={value.language} options={languageOptions} block={false} align="end" onChange={(option) => onChange({ ...value, language: option.value })} />
      </Field>
    </FieldGroup>
  </>;
}

/** Choices in menus, two colors with a row that resets them, and a slider with its value at its end, as Live
 * Captions › Appearance (IMG_5961). A well with no color shows the empty well; Reset Colors brings both back. */
export function CaptionsAppearanceFields({ value, onChange }: { value: CaptionsAppearance; onChange: (value: CaptionsAppearance) => void }) {
  const choice = (label: string, key: 'bold' | 'size' | 'font', options: { value: string; label: string }[]) => (
    <Field row label={label}>
      <Select value={value[key]} options={options} block={false} align="end" onChange={(option) => onChange({ ...value, [key]: option.value })} />
    </Field>
  );
  return <>
    <FieldGroup aria-label="Text">
      {choice('Bold Text', 'bold', boldOptions)}
      {choice('Text Size', 'size', sizeOptions)}
      {choice('Font', 'font', fontOptions)}
    </FieldGroup>
    <FieldGroup title="Color Options">
      <Field row label="Text Color"><ColorWell value={value.text} onChange={(text) => onChange({ ...value, text })} /></Field>
      <Field row label="Background Color"><ColorWell value={value.background} onChange={(background) => onChange({ ...value, background })} /></Field>
      <div data-row>
        <Button block color="info" variant="ghost"
          onClick={() => onChange({ ...value, text: null, background: null })}>Reset Colors</Button>
      </div>
    </FieldGroup>
    <FieldGroup title="Idle Opacity" footer="Reduces the visibility of the Live Captions button when not in use.">
      <div className={s.Row} data-row>
        <Slider aria-label="Idle Opacity" min={0} max={100} step={5} value={value.opacity} className={s.Slider}
          onChange={(opacity) => onChange({ ...value, opacity })} endAdornment={`${value.opacity}%`} />
      </div>
    </FieldGroup>
  </>;
}
