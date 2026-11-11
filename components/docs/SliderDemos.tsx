'use client';

import { useState } from 'react';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Slider } from '@plexui/ui/components/Slider';
import { Tooltip } from '@plexui/ui/components/Tooltip';

import { controlsTableStyle, DemoControlBoolean, DemoControlRow, Segments } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';
import { sliderCellClassName, sliderCellStackedClassName, sliderCellValueBelowClassName, sliderCellValueClassName, sliderCellValueDisabledClassName } from './phoneRowsTemplate';
import { SliderValueControl } from './SliderValueControl';

const THUMBS = ['one', 'two', 'three'] as const;
type Thumbs = (typeof THUMBS)[number];
// What the value reads: a number, a number and its unit after it, or a currency before it
const UNITS = ['none', 'unit', 'prefixUnit'] as const;
const ORIENTATIONS = ['horizontal', 'vertical'] as const;
const scaleMarks = [0, 25, 50, 75, 100].map((value) => ({ value, label: String(value) }));
// The colours the kit's own marks example gave the track and its fill
const colorProps = { trackColor: '#61C454', rangeColor: '#EF4146' };

/**
 * The Overview, with every setting of a slider on one scale from 0 to 100: what the page's examples once showed one
 * by one (Disabled, Marks, Range, Multiple thumbs, Adding a tooltip, Vertical) are its settings (owner 11.11: «в
 * первом примере можно сразу показать все со всеми настройками»). Each number of thumbs keeps its own value.
 *
 * On a phone the slider stands in a cell of an inset grouped list, as iOS Settings draws a named slider: the group's
 * title names it; one value ends the cell, a range goes under the track, and marks show the scale in its place
 * (phoneRowsTemplate). A list of iOS settings has no reset button, tooltip or vertical slider, so those stay on
 * desktop, and so does the unit while marks take the value's place.
 */
export function SliderOverviewDemo() {
  const phone = usePhoneRows();
  const [thumbs, setThumbs] = useState<Thumbs>('one');
  const [values, setValues] = useState({ one: 50, two: [25, 75], three: [10, 40, 70] });
  const [minStepsBetweenThumbs, setMinStepsBetweenThumbs] = useState(5);
  const [resetValue, setResetValue] = useState(true);
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('unit');
  const [marks, setMarks] = useState(false);
  const [colors, setColors] = useState(false);
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
    step: 1,
    marks: shownMarks ? scaleMarks : undefined,
    ...(colors ? colorProps : {}),
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
        {!phone && thumbs === 'one' && !disabled && <DemoControlBoolean name="resetValue" value={resetValue} onChange={setResetValue} />}
        {!(phone && marks) && <Segments name="unit" options={UNITS} value={unit} onChange={setUnit} />}
        {!vertical && <DemoControlBoolean name="marks" value={marks} onChange={setMarks} />}
        <DemoControlBoolean name="colors" value={colors} onChange={setColors} />
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
                <span className={`min-w-[4ch] ${sliderCellValueClassName} ${disabled ? sliderCellValueDisabledClassName : 'text-secondary'}`}>{text(values.one)}</span>
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
