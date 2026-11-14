'use client';

import { useRef, useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Slider } from '@plexui/ui/components/Slider';
import { Tooltip } from '@plexui/ui/components/Tooltip';

import { controlsTableStyle, DemoControlBoolean, DemoControlRow, Segments } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';
import { sliderCellClassName, sliderCellStackedClassName, sliderCellValueBelowClassName, sliderCellValueClassName, sliderCellValueDisabledClassName, sliderCellValueFieldClassName, sliderCellValueInputClassName, rowButtonClassName } from './phoneRowsTemplate';
import { SliderValueControl } from './SliderValueControl';

const THUMBS = ['one', 'two', 'three'] as const;
type Thumbs = (typeof THUMBS)[number];
// What the value reads: a number, a number and its unit after it, or a currency before it
const UNITS = ['none', 'unit', 'prefixUnit'] as const;
const ORIENTATIONS = ['horizontal', 'vertical'] as const;
// How far one value moves at a time: every point of the scale, or the marks' quarters. A range keeps a step of 1, as
// its thumbs stand minStepsBetweenThumbs steps apart and a coarse step would leave them no room to move
const STEPS = ['1', '5', '10', '25'] as const;
const scaleMarks = [0, 25, 50, 75, 100].map((value) => ({ value, label: String(value) }));
// The colours the kit's own marks example gave the track and its fill
const colorProps = { trackColor: '#61C454', rangeColor: '#EF4146' };
// A small and a large letter at the ends of the track, as Settings draws a text size slider (iOS 26 Settings ›
// Accessibility › Hover Text › Size, IMG_5940: 16 and 22pt); text, not a symbol font
const adornmentProps = {
  startAdornment: <span className="text-[15px]">A</span>,
  endAdornment: <span className="text-[22px]">A</span>,
};

/**
 * The Overview, with every setting of a slider on one scale from 0 to 100: what the page's examples once showed one
 * by one (Disabled, Marks, Range, Multiple thumbs, Adding a tooltip, Vertical) are its settings (owner 11.11: «в
 * первом примере можно сразу показать все со всеми настройками»). Each number of thumbs keeps its own value.
 *
 * On a phone the slider stands in a cell of an inset grouped list, as iOS Settings draws a named slider: the group's
 * title names it; one value ends the cell, a range goes under the track, and marks show the scale in its place
 * (phoneRowsTemplate). The value at the end of the cell is a field, a number typed in place, as Keynote for iPhone
 * takes one. The reset is a row of its own under the slider's group, as Settings puts "Reset Font Size to Default"
 * under Hover Text's size slider (owner 14.11, IMG_5940). A list of iOS settings has no tooltip or vertical slider,
 * so those stay on desktop, and so does the unit while marks take the value's place.
 */
export function SliderOverviewDemo() {
  const phone = usePhoneRows();
  const [thumbs, setThumbs] = useState<Thumbs>('one');
  const [values, setValues] = useState({ one: 50, two: [25, 75], three: [10, 40, 70] });
  const [minStepsBetweenThumbs, setMinStepsBetweenThumbs] = useState(5);
  const [step, setStep] = useState<(typeof STEPS)[number]>('1');
  const [resetValue, setResetValue] = useState(true);
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('unit');
  const [marks, setMarks] = useState(false);
  const [colors, setColors] = useState(false);
  const [adornments, setAdornments] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const [orientation, setOrientation] = useState<(typeof ORIENTATIONS)[number]>('horizontal');
  const [disabled, setDisabled] = useState(false);

  const vertical = !phone && orientation === 'vertical';
  const shownMarks = marks && !vertical;
  const prefix = unit === 'prefixUnit' ? '$' : '';
  const suffix = unit === 'unit' ? '%' : '';
  const text = (value: number) => `${prefix}${value}${suffix}`;
  const setValue = (value: number | number[]) => setValues((current) => ({ ...current, [thumbs]: value }));
  const shared = {
    min: 0,
    max: 100,
    step: thumbs === 'one' ? Number(step) : 1,
    marks: shownMarks ? scaleMarks : undefined,
    ...(colors ? colorProps : {}),
    ...(adornments && !vertical ? adornmentProps : {}),
    disabled,
  };
  const desktop = {
    ...shared,
    label: tooltip ? (
      <Tooltip content="More details about this field">
        <Tooltip.TriggerDecorator>Example field</Tooltip.TriggerDecorator>
      </Tooltip>
    ) : (
      'Example field'
    ),
    unit: suffix || undefined,
    prefixUnit: prefix || undefined,
    orientation,
  };

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="thumbs" options={THUMBS} value={thumbs} onChange={setThumbs} />
        {thumbs !== 'one' && (
          <DemoControlRow name="minStepsBetweenThumbs">
            <SliderValueControl ariaLabel="minStepsBetweenThumbs" min={0} max={20} step={1} value={minStepsBetweenThumbs} onChange={setMinStepsBetweenThumbs} width="min(42vw, 340px)" />
          </DemoControlRow>
        )}
        {thumbs === 'one' && <Segments name="step" options={STEPS} value={step} onChange={setStep} />}
        {/* A disabled desktop slider leaves its reset out; a phone keeps the reset row, dimmed */}
        {thumbs === 'one' && <DemoControlBoolean name="resetValue" value={resetValue} onChange={setResetValue} phoneOnly={disabled} />}
        {!(phone && marks) && <Segments name="unit" options={UNITS} value={unit} onChange={setUnit} />}
        {!vertical && <DemoControlBoolean name="marks" value={marks} onChange={setMarks} />}
        <DemoControlBoolean name="colors" value={colors} onChange={setColors} />
        {!vertical && <DemoControlBoolean name="adornments" value={adornments} onChange={setAdornments} />}
        {!phone && (
          <>
            <DemoControlBoolean name="tooltip" value={tooltip} onChange={setTooltip} />
            <Segments name="orientation" options={ORIENTATIONS} value={orientation} onChange={setOrientation} />
          </>
        )}
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneRowsStage>
          <FieldGroup title="Example field">
            {thumbs === 'one' && !shownMarks ? (
              <div data-row className={sliderCellClassName}>
                <Slider aria-label="Example field" {...shared} value={values.one} onChange={setValue} className="min-w-0 flex-1" />
                {/* The letters stand where the value would: Settings shows none beside them */}
                {!adornments && <SliderCellValue label="Example field" value={values.one} onChange={setValue} min={0} max={100} prefix={prefix} suffix={suffix} disabled={disabled} />}
              </div>
            ) : (
              <div data-row className={sliderCellStackedClassName}>
                {thumbs === 'one' ? (
                  <Slider aria-label="Example field" {...shared} value={values.one} onChange={setValue} />
                ) : (
                  <Slider range aria-label="Example field" {...shared} value={values[thumbs]} onChange={setValue} minStepsBetweenThumbs={minStepsBetweenThumbs} />
                )}
                {!shownMarks && (
                  <span className={`${sliderCellValueBelowClassName}${disabled ? ` ${sliderCellValueDisabledClassName}` : ''}`}>{values[thumbs as 'two' | 'three'].map(text).join(' – ')}</span>
                )}
              </div>
            )}
          </FieldGroup>
          {thumbs === 'one' && resetValue && (
            <FieldGroup>
              <div data-row>
                <Button block color="info" variant="ghost" className={rowButtonClassName} disabled={disabled} onClick={() => setValue(50)}>Reset to Default</Button>
              </div>
            </FieldGroup>
          )}
        </PhoneRowsStage>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <div style={vertical ? undefined : { width: 300 }}>
            {thumbs === 'one' ? (
              <Slider {...desktop} value={values.one} onChange={setValue} resetValue={resetValue ? 50 : undefined} />
            ) : (
              <Slider {...desktop} range value={values[thumbs]} onChange={setValue} minStepsBetweenThumbs={minStepsBetweenThumbs} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

const DEFAULT_ZOOM = 100;
const ZOOM_FOOTER = 'Makes text and images on the page larger or smaller.';

/**
 * A slider that is one setting of a screen (owner 14.11: an example of the phone slider an app built from the cell
 * above, «пример такого слайдера»; asked there «может просто обычной высоты ячейка? с заголовком над ним?», «сброс
 * можно тоже подумать как компактно показать», «процент можно и справа показать»). On a phone: the group's title
 * names it, one cell of the row's height holds the track and its value, typed in place as in the Overview, and the
 * footer says what it does. The reset is the heading's text action (FieldGroup `action`, the kit's _Header Trailing
 * Accessories, Type=Action), shown once the value differs from its default; it brings the default back and goes,
 * and the heading keeps its height either way. A desktop keeps the slider's label, value and round reset.
 */
export function SliderSettingDemo() {
  const phone = usePhoneRows();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  if (!phone) {
    return (
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div style={{ width: 300 }}>
          <Slider label="Zoom" min={50} max={200} step={10} unit="%" value={zoom} onChange={setZoom} resetValue={DEFAULT_ZOOM} />
          <p className="mt-2 text-sm text-secondary">{ZOOM_FOOTER}</p>
        </div>
      </div>
    );
  }
  return (
    <PhoneRowsStage>
      <FieldGroup
        title="Zoom"
        footer={ZOOM_FOOTER}
        action={
          <Button color="primary" variant="ghost" size="sm" className={zoom === DEFAULT_ZOOM ? 'invisible' : undefined} onClick={() => setZoom(DEFAULT_ZOOM)}>
            Reset
          </Button>
        }
      >
        <div data-row className={sliderCellClassName}>
          <Slider aria-label="Zoom" min={50} max={200} step={10} value={zoom} onChange={setZoom} className="min-w-0 flex-1" />
          <SliderCellValue label="Zoom" value={zoom} onChange={setZoom} min={50} max={200} prefix="" suffix="%" disabled={false} />
        </div>
      </FieldGroup>
    </PhoneRowsStage>
  );
}

/** The value ending a slider's cell, a field the number is typed in, in place (phoneRowsTemplate): the number pad, the
 * number selected on focus; Return or leaving the field sets the typed number as the slider's own field takes it, whole
 * and within the scale, off the step if need be; Escape, or text that is not a number, keeps the value. The unit stays
 * text around it. */
function SliderCellValue({ label, value, onChange, min, max, prefix, suffix, disabled }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  prefix: string;
  suffix: string;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const shown = draft ?? String(value);
  const commit = () => {
    const typed = draft;
    setDraft(null);
    if (cancelled.current || typed === null || typed.trim() === '') return;
    const number = Number(typed);
    if (Number.isFinite(number)) onChange(Math.min(max, Math.max(min, Math.floor(number))));
  };
  return (
    <label className={`min-w-[4ch] ${sliderCellValueClassName} ${sliderCellValueFieldClassName} ${disabled ? sliderCellValueDisabledClassName : 'text-secondary'}`}>
      {prefix}
      <input
        aria-label={`${label} value`}
        inputMode="numeric"
        enterKeyHint="done"
        className={sliderCellValueInputClassName}
        style={{ width: `${Math.max(1, shown.length)}ch` }}
        value={shown}
        disabled={disabled}
        onFocus={(event) => {
          cancelled.current = false;
          setDraft(String(value));
          event.currentTarget.select();
        }}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            cancelled.current = true;
            event.currentTarget.blur();
          }
        }}
        onBlur={commit}
      />
      {suffix}
    </label>
  );
}
