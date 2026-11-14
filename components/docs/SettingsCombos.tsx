'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import { ColorWell } from '@plexui/ui/components/ColorPicker';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Bell, CameraPhoto, Disclosure, Globe, Heart, InfoCircle, Mic, SoundOffSpeaker, SoundOnSpeaker, Star } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { Select } from '@plexui/ui/components/Select';
import { Slider } from '@plexui/ui/components/Slider';
import { Sortable } from '@plexui/ui/components/Sortable';
import { Stepper } from '@plexui/ui/components/Stepper';
import { Switch } from '@plexui/ui/components/Switch';
import { TextLink } from '@plexui/ui/components/TextLink';
import {
  balanceText, choiceOptions, defaultSliders, describedPictures, initialRows, offOnOptions, orderedPool, plainPictures, switchPictures,
  type ChoiceValue, type OrderValue, type PictureRow, type RowsValue, type SlidersValue,
} from './settingsCombosData';
import s from './SettingsVoiceDemo.module.css';
import sliderStyles from './SettingsSliderDemo.module.css';
import pictureStyles from './SettingsAppsFields.module.css';

// The combination screens of Forms: Settings: every kind of row iOS 27.2 Settings uses, one after another, in plain
// words (Row, Header, Footer). Values belong to the screen owner, so switching Page, Dialog or surface keeps them.

const learnMore = <TextLink primary href="#headers-and-footers">Learn more…</TextLink>;

/** Rows with a control at their end: a switch, a menu, a state in words before a switch, a description under the
 * label, a row that opens a page, colors with a row that resets them, an action in the accent, a destructive action
 * that asks first, and a centred action. */
export function RowsCombos({ value, onChange, onPage }: { value: RowsValue; onChange: (value: RowsValue) => void; onPage?: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return <>
    <FieldGroup footer="Footer one line.">
      <Field row label="Switch">
        <Switch color="accent" checked={value.switch} onCheckedChange={(on) => onChange({ ...value, switch: on })} />
      </Field>
      <Field row label="Menu">
        <Select value={value.menu} options={offOnOptions} block={false} align="end" onChange={(option) => onChange({ ...value, menu: option.value })} />
      </Field>
      <Field row label="Status">
        {(control) => (
          <span className={s.StatusControl}>
            <span className={s.ValueRowValue}>{value.status ? 'On' : 'Off'}</span>
            <Switch {...control} color="accent" checked={value.status} onCheckedChange={(status) => onChange({ ...value, status })} />
          </span>
        )}
      </Field>
      <Field row label="Row with description" description="Description">
        <Switch color="accent" checked={value.described} onCheckedChange={(described) => onChange({ ...value, described })} />
      </Field>
    </FieldGroup>
    <FieldGroup title="Header">
      <div data-row>
        <Button block color="primary" variant="ghost" onClick={onPage}>
          <span className={s.ValueRowContent}>Page<span className={s.ValueRowValue}>Value</span><Disclosure data-no-autosize="" /></span>
        </Button>
      </div>
      <Field row label="Color"><ColorWell value={value.color} onChange={(color) => onChange({ ...value, color })} /></Field>
      <Field row label="Second color"><ColorWell value={value.second} onChange={(second) => onChange({ ...value, second })} /></Field>
      <div data-row>
        <Button block color="info" variant="ghost" onClick={() => onChange({ ...value, color: null, second: null })}>Reset Colors</Button>
      </div>
    </FieldGroup>
    <FieldGroup aria-label="Action">
      <div data-row><Button block color="info" variant="ghost" onClick={onPage}>Action</Button></div>
    </FieldGroup>
    {/* A red row with its description stands alone in its group, as Reset Voice Settings (IMG_5944) */}
    <FieldGroup aria-label="Destructive action">
      <div data-row>
        {/* The row is the dialog's trigger, so closing the alert returns focus to it */}
        <Dialog open={confirm} onOpenChange={setConfirm}>
          <Dialog.Trigger>
            <Button block color="danger" variant="ghost" className={s.Action} data-described="">
              <span className={s.ActionText}>
                Destructive action
                <span className={s.ActionDescription}>Asks first.</span>
              </span>
            </Button>
          </Dialog.Trigger>
          <Dialog.Content mobileVariant="alert" surface="plain">
            <Dialog.Header>
              <Dialog.Title>Reset every row?</Dialog.Title>
              <Dialog.Description>The rows of this screen go back to their defaults.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Close><Button color="secondary" variant="soft">Cancel</Button></Dialog.Close>
              <Button color="danger" onClick={() => { onChange(initialRows); setConfirm(false); }}>Reset</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      </div>
    </FieldGroup>
    <FieldGroup aria-label="Centred action">
      <div data-row data-align="center"><Button block color="primary" variant="ghost">Centred action</Button></div>
    </FieldGroup>
  </>;
}

/** Sliders and steppers: a slider with its value at its end that a switch turns off, a slider between symbols with a row that brings back its
 * default, a balance with its ends and value over the track, a stepper with its
 * number under the label, and a number typed in a field or stepped. */
export function SliderCombos({ value, onChange }: { value: SlidersValue; onChange: (value: SlidersValue) => void }) {
  const set = (patch: Partial<SlidersValue>) => onChange({ ...value, ...patch });
  const number = (next: number) => set({ number: Math.min(100, Math.max(0, Math.round(next))) });
  // What is typed stays as typed until it is committed (blur or Return); a field left empty or not a number goes back
  const [draft, setDraft] = useState<string | null>(null);
  // A step goes on from what is typed, not yet committed: the stepper stands at the typed number
  const typedOr = (fallback: number) => (draft !== null && draft.trim() !== '' && Number.isFinite(Number(draft)) ? Number(draft) : fallback);
  const commit = () => {
    if (draft !== null && draft.trim() !== '' && Number.isFinite(Number(draft))) number(Number(draft));
    setDraft(null);
  };
  return <>
    <FieldGroup aria-label="Enabled">
      <Field row label="Switch">
        <Switch color="accent" checked={value.enabled} onCheckedChange={(enabled) => set({ enabled })} />
      </Field>
    </FieldGroup>
    <FieldGroup title="Slider" footer="Turning the switch off keeps the value.">
      <div className={sliderStyles.Row} data-row data-slider-setting data-disabled={!value.enabled || undefined}>
        <Slider aria-label="Slider" min={0} max={100} step={1} value={value.slider} disabled={!value.enabled} className={sliderStyles.Slider}
          onChange={(slider) => set({ slider })} />
        <output className={sliderStyles.Value} aria-hidden="true">{value.slider}%</output>
      </div>
    </FieldGroup>
    <FieldGroup title="Symbols at the ends">
      <div className={s.Row} data-row>
        <Slider aria-label="Symbols at the ends" min={0} max={100} step={1} value={value.ends} className={s.Slider}
          onChange={(ends) => set({ ends })} startAdornment={<SoundOffSpeaker />} endAdornment={<SoundOnSpeaker />} />
      </div>
      <div data-row>
        <Button block color="info" variant="ghost" className={s.Action} onClick={() => set({ ends: defaultSliders.ends })}>
          <span className={s.ActionText}>Use Default</span>
        </Button>
      </div>
    </FieldGroup>
    <FieldGroup title="Balance">
      <div className={s.BalanceRow} data-row>
        <div className={s.BalanceLabels} aria-hidden="true"><span>L</span><span>{balanceText(value.balance)}</span><span>R</span></div>
        <Slider aria-label="Balance" min={-1} max={1} step={0.05} value={value.balance} onChange={(balance) => set({ balance })} />
      </div>
    </FieldGroup>
    <FieldGroup aria-label="Steppers">
      <Field row label="Stepper" description={String(value.stepper)}>
        <Stepper value={value.stepper} min={0} max={10} decrementLabel="Decrease" incrementLabel="Increase"
          onChange={(stepper) => set({ stepper })} />
      </Field>
    </FieldGroup>
    <FieldGroup title="Number">
      <div className={s.NumberRow} data-row>
        <Input size="sm" variant="ghost" inputMode="numeric" className={s.NumberField} aria-label="Number" value={draft ?? String(value.number)}
          onChange={(event) => setDraft(event.target.value)} onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} />
        <Stepper aria-label="Adjust Number" value={Math.min(100, Math.max(0, typedOr(value.number)))} min={0} max={100} step={10}
          onChange={(next) => { number(next); setDraft(null); }} decrementLabel="Less" incrementLabel="More" />
      </div>
    </FieldGroup>
  </>;
}

/** One choice: a RadioGroup around its group, the chosen row checked (a radio on a desktop); and choices with a
 * description and an action at their end, which lead with their check. */
export function ChoiceCombos({ value, onChange, onInfo }: { value: ChoiceValue; onChange: (value: ChoiceValue) => void; onInfo?: (option: string) => void }) {
  return <>
    <RadioGroup direction="col" className="w-full" value={value.plain} aria-label="Choice" onChange={(plain) => onChange({ ...value, plain })}>
      <FieldGroup footer={<p>Footer with a link. {learnMore}</p>}>
        {choiceOptions.map((option) => (
          <Field key={option.value} row label={option.label}><RadioGroup.Item value={option.value} /></Field>
        ))}
      </FieldGroup>
    </RadioGroup>
    <RadioGroup direction="col" className="w-full" value={value.detailed} aria-label="Choice with details" onChange={(detailed) => onChange({ ...value, detailed })}>
      <FieldGroup title="Header">
        {choiceOptions.map((option) => (
          <Field key={option.value} row label={option.label} description="Description"
            action={<Button color="info" variant="ghost" uniform pill opticallyAlign="end" aria-label={`${option.label} details`} onClick={() => onInfo?.(option.value)}><InfoCircle /></Button>}>
            <RadioGroup.Item value={option.value} />
          </Field>
        ))}
      </FieldGroup>
    </RadioGroup>
  </>;
}

/** Pick and order: the check leads the row and the grip ends it; then rows of two lines in order, with a row in the
 * accent that adds the next one. */
export function OrderCombos({ value, onChange, handles = true, handlePlacement }: {
  value: OrderValue;
  onChange: (value: OrderValue) => void;
  /** Shows the grips; hidden, a row still drags from anywhere but its check and the grip still takes the keyboard */
  handles?: boolean;
  /** The grip's side: iOS ends the row with it */
  handlePlacement?: 'start' | 'end';
}) {
  const next = orderedPool.find((label) => !value.ordered.includes(label));
  return <>
    <FieldGroup aria-label="Checked rows" footer="Checked rows show, in this order.">
      <Sortable value={value.checked} onChange={(checked) => onChange({ ...value, checked })} handles={handles} handlePlacement={handlePlacement}>
        {value.checked.map((item) => (
          <div key={item.id} data-row>
            <Sortable.Handle aria-label={`Reorder ${item.label}`} />
            <div className={s.CheckRow}>
              <Checkbox variant="ghost" label={item.label} checked={item.on}
                onCheckedChange={(on) => onChange({ ...value, checked: value.checked.map((row) => (row.id === item.id ? { ...row, on } : row)) })} />
            </div>
          </div>
        ))}
      </Sortable>
    </FieldGroup>
    <FieldGroup title="Header" footer="The first row comes first.">
      <Sortable value={value.ordered} onChange={(ordered) => onChange({ ...value, ordered })} handles={handles} handlePlacement={handlePlacement}>
        {value.ordered.map((label, index) => (
          <div key={label} data-row>
            <Sortable.Handle aria-label={`Reorder ${label}`} />
            <div className={s.TextRow}>
              {label}
              <span className={s.ActionDescription}>{index === 0 ? 'First' : 'Description'}</span>
            </div>
          </div>
        ))}
      </Sortable>
      <div data-row>
        <Button block color="info" variant="ghost" className={s.Action} disabled={!next}
          onClick={() => next && onChange({ ...value, ordered: [...value.ordered, next] })}>
          <span className={s.ActionText}>Add Row…</span>
        </Button>
      </div>
    </FieldGroup>
  </>;
}

// The kit's outlined icons, as everywhere in the kit (owner 14.11: «у нас везде outlined»), at a size Settings draws a tile's glyph
const symbols = { bell: Bell, globe: Globe, star: Star, heart: Heart, mic: Mic, camera: CameraPhoto };

export type IconStyle = 'tile' | 'outline' | 'plain';

/** A picture in a row, which Field's `icon` sets in the row's image column: its color with the symbol in white, a
 * light tile with a hairline edge, or the symbol alone */
function Picture({ row, style }: { row: PictureRow; style: IconStyle }) {
  const Symbol = symbols[row.symbol];
  return <span className={pictureStyles.Picture} data-style={style} style={{ '--app-tile': row.tile } as React.CSSProperties}><Symbol /></span>;
}

/** Rows with a picture: with a switch (a row turned off reads quieter), with a description too, and with nothing to
 * set. */
export function PictureCombos({ value, onChange, iconStyle = 'tile' }: { value: Record<string, boolean>; onChange: (value: Record<string, boolean>) => void; iconStyle?: IconStyle }) {
  const switchRow = (row: PictureRow, description?: string) => (
    <Field key={row.id} row label={row.label} description={description} icon={<Picture row={row} style={iconStyle} />}
      className={value[row.id] ? undefined : pictureStyles.Off}>
      <Switch color="accent" checked={value[row.id]} onCheckedChange={(on) => onChange({ ...value, [row.id]: on })} />
    </Field>
  );
  return <>
    <FieldGroup title="Header">{switchPictures.map((row) => switchRow(row))}</FieldGroup>
    <FieldGroup title="Header" footer="Footer one line.">{describedPictures.map((row) => switchRow(row, 'Description'))}</FieldGroup>
    <FieldGroup title="Header" footer="Nothing to set.">
      {plainPictures.map((row) => (
        <Field key={row.id} row label={row.label} icon={<Picture row={row} style={iconStyle} />}>
          {/* Nothing to set: no control, so nothing takes the label's name */}
          {() => null}
        </Field>
      ))}
    </FieldGroup>
  </>;
}

/** Headers and footers: a header, a prominent header, a header of a paragraph that wraps, a footer of one line, a
 * footer that ends with a link, a footer with a list, and a footer of two paragraphs, the second a link. */
export function FooterCombos() {
  const row = (label = 'Row') => <Field row label={label}>{() => null}</Field>;
  return <>
    <FieldGroup title="Header" footer="Footer one line.">{row()}</FieldGroup>
    <FieldGroup title="Prominent" headerProminence="increased" footer={<p>Footer with a link. {learnMore}</p>}>{row()}</FieldGroup>
    <FieldGroup title="A header of a paragraph wraps to the width of the group and stands over its rows.">{row()}</FieldGroup>
    <FieldGroup footer={<>
      <p>Footer with a list:</p>
      <ul><li>Each item a line that starts with a bullet</li><li>A longer item wraps back to the footer’s edge, under its bullet</li></ul>
    </>}>{row()}</FieldGroup>
    <FieldGroup footer={<>
      <p>Footer of two paragraphs.</p>
      <p>{learnMore}</p>
    </>}>{row()}</FieldGroup>
  </>;
}
