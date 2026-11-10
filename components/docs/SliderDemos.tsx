'use client';

import { useState, type ReactNode } from 'react';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Slider } from '@plexui/ui/components/Slider';
import { Tooltip } from '@plexui/ui/components/Tooltip';

import { controlsTableStyle, DemoControlBoolean } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';
import { sliderCellClassName, sliderCellStackedClassName, sliderCellValueBelowClassName, sliderCellValueClassName, sliderCellValueDisabledClassName } from './phoneRowsTemplate';

/** A desktop slider: 300px in the middle of the stage. */
function DesktopStage({ className = 'py-12', children }: { className?: string; children: ReactNode }) {
  return (
    <div data-demo-stage className={`flex-1 flex flex-col items-center justify-center ${className} w-full`}>
      <div style={{ width: 300 }}>{children}</div>
    </div>
  );
}

/* On a phone each slider stands in a cell of an inset grouped list, as iOS Settings draws a named slider: the group's
   title names it; a short value ends the cell, and a longer one, or marks, go under the track (phoneRowsTemplate).
   The Phone code of each example is this markup. */

export function SliderBaseDemo({ disabled = false }: { disabled?: boolean }) {
  const phone = usePhoneRows();
  const [value, setValue] = useState(1000);
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup title="Example field">
          <div data-row className={sliderCellClassName}>
            <Slider aria-label="Example field" min={0} max={2000} step={10} value={value} onChange={setValue} disabled={disabled} className="min-w-0 flex-1" />
            <span className={`min-w-[7ch] ${sliderCellValueClassName} ${disabled ? sliderCellValueDisabledClassName : 'text-secondary'}`}>{value} ms</span>
          </div>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
  return (
    <DesktopStage>
      <Slider
        label="Example field"
        min={0}
        max={2000}
        resetValue={1000}
        step={10}
        unit="ms"
        value={value}
        onChange={setValue}
        disabled={disabled}
      />
    </DesktopStage>
  );
}

export function SliderBaseDemoWithControls() {
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <SliderBaseDemo disabled={disabled} />
    </>
  );
}

export function SliderTooltipsDemo() {
  const [value, setValue] = useState(1000);
  return (
    <DesktopStage>
      <Slider
        label={
          <Tooltip content="More details about this field">
            <Tooltip.TriggerDecorator>Example field</Tooltip.TriggerDecorator>
          </Tooltip>
        }
        min={0}
        max={2000}
        resetValue={1000}
        step={10}
        unit="ms"
        value={value}
        onChange={setValue}
      />
    </DesktopStage>
  );
}

const gradeMarks = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];

export function SliderMarksDemo() {
  const phone = usePhoneRows();
  const [value, setValue] = useState(3);
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup title="Passing grade">
          <div data-row className={sliderCellStackedClassName}>
            <Slider aria-label="Passing grade" min={1} max={5} step={1} value={value} onChange={setValue} marks={gradeMarks} trackColor="#61C454" rangeColor="#EF4146" />
          </div>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
  return (
    <DesktopStage className="py-20">
      <Slider
        value={value}
        label="Passing grade"
        min={1}
        max={5}
        step={1}
        onChange={setValue}
        marks={gradeMarks}
        trackColor="#61C454"
        rangeColor="#EF4146"
      />
    </DesktopStage>
  );
}

export function SliderRangeDemo() {
  const phone = usePhoneRows();
  const [value, setValue] = useState([25, 75]);
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup title="Price range">
          <div data-row className={sliderCellStackedClassName}>
            <Slider range aria-label="Price range" min={0} max={100} step={1} value={value} onChange={setValue} />
            <span className={sliderCellValueBelowClassName}>{value.map((v) => '$' + v).join(' – ')}</span>
          </div>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
  return (
    <DesktopStage>
      <Slider
        range
        label="Price range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={setValue}
        prefixUnit="$"
      />
    </DesktopStage>
  );
}

export function SliderMultipleThumbsDemo() {
  const phone = usePhoneRows();
  const [value, setValue] = useState([10, 40, 70]);
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup title="Breakpoints">
          <div data-row className={sliderCellStackedClassName}>
            <Slider range aria-label="Breakpoints" min={0} max={100} step={1} value={value} onChange={setValue} minStepsBetweenThumbs={5} />
            <span className={sliderCellValueBelowClassName}>{value.join(' – ')}</span>
          </div>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
  return (
    <DesktopStage>
      <Slider
        range
        label="Breakpoints"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={setValue}
        minStepsBetweenThumbs={5}
      />
    </DesktopStage>
  );
}

export function SliderVerticalDemo() {
  const [value, setValue] = useState(50);
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <Slider
        label="Volume"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={setValue}
        orientation="vertical"
      />
    </div>
  );
}
