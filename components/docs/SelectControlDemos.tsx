'use client';

import React, { type ComponentType, type SVGProps } from 'react';
import { useState } from 'react';
import { CalendarAlt } from '@plexui/ui/components/Icon';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Menu } from '@plexui/ui/components/Menu';
import { SelectControl } from '@plexui/ui/components/SelectControl';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

const PERIODS = ['Today', 'Last week', 'Last month', 'Last 3 months'];
const StartIcon = CalendarAlt as ComponentType<SVGProps<SVGSVGElement>>;
const VARIANT_OPTIONS = ['outline', 'soft', 'ghost'] as const;
const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const DROPDOWN_ICON_OPTIONS = ['dropdown', 'chevronDown', 'none'] as const;
// `none`: no opticallyAlign, the control keeps its gutter. `end` only with block: a narrower control does not reach
// the field's end, so the setting would move nothing
const ALIGN_OPTIONS = ['none', 'start', 'end'] as const;
const ERROR = 'No data for this period.';

function Segments<T extends string>({ name, options, value, onChange, desktopOnly = false }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void; desktopOnly?: boolean }) {
  return (
    <DemoControlRow name={name} desktopOnly={desktopOnly}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => (
          <SegmentedControl.Option key={option} value={option}>
            {option}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );
}

/** The Overview, with every setting of the select control: what the page's examples once showed one by one (Variants,
 * Sizing & roundness, Selected, Start icon, Dropdown icon, Clearable, Loading, Invalid, Disabled, Block, Optical
 * alignment) are its settings (owner 11.11: «в первом примере можно сразу показать все со всеми настройками»). The
 * control is the trigger of a Period menu under the label of a 290px field: `block` fills the field, and
 * `opticallyAlign` offsets a ghost control by its gutter, `start` its icon or text onto the label's edge and `end`,
 * with block, its indicator onto the field's end, so it is offered only for `ghost`, where there is no frame to keep.
 * The trigger is named by the label and its value, as Select's is. `selected` follows the value: pick a period, or clear it. On a phone the control is the value of a
 * row, which sets its height, insets, type and colors, so variant, size, pill, the start icon, the dropdown icon,
 * block and optical alignment are desktop settings; a clearable control unsets its value with the menu's None row, as
 * an iOS pop-up button does, and the error is the row's line under it. */
export function SelectControlOverviewDemo() {
  const phone = usePhoneRows();
  const [value, setValue] = useState('');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('outline');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(false);
  const [startIcon, setStartIcon] = useState(true);
  const [dropdownIconType, setDropdownIconType] = useState<(typeof DROPDOWN_ICON_OPTIONS)[number]>('dropdown');
  const [clearable, setClearable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [block, setBlock] = useState(false);
  const [opticallyAlign, setOpticallyAlign] = useState<(typeof ALIGN_OPTIONS)[number]>('none');
  const ghost = variant === 'ghost';
  // A narrower control does not reach the field's end: without block `end` moves nothing, so it is not offered and
  // shows as `none`; the choice comes back with block, as in the Vue demo
  const alignOptions = block ? ALIGN_OPTIONS : ALIGN_OPTIONS.filter((option) => option !== 'end');
  const shownAlign = !block && opticallyAlign === 'end' ? 'none' : opticallyAlign;
  const errorMessage = invalid ? ERROR : undefined;
  const state = { selected: !!value, loading, invalid, disabled };
  const menu = (trigger: React.ReactNode) => (
    <Menu>
      <Menu.Trigger>{trigger}</Menu.Trigger>
      <Menu.Content minWidth={200} width={phone ? undefined : block ? 290 : 200} align={phone ? 'end' : undefined}>
        <Menu.RadioGroup value={value} onChange={setValue}>
          {phone && clearable && <Menu.RadioItem value="">None</Menu.RadioItem>}
          {PERIODS.map((period) => (
            <Menu.RadioItem key={period} value={period}>{period}</Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu>
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} desktopOnly />
        <Segments name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} desktopOnly />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />
        <DemoControlBoolean name="startIcon" value={startIcon} onChange={setStartIcon} desktopOnly />
        <Segments name="dropdownIconType" options={DROPDOWN_ICON_OPTIONS} value={dropdownIconType} onChange={setDropdownIconType} desktopOnly />
        <DemoControlBoolean name="clearable" value={clearable} onChange={setClearable} />
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="block" value={block} onChange={setBlock} desktopOnly />
        {ghost && <Segments name="opticallyAlign" options={alignOptions} value={shownAlign} onChange={setOpticallyAlign} desktopOnly />}
      </div>
      {phone ? (
        <PhoneRowsStage>
          <FieldGroup>
            <Field row label="Period" errorMessage={errorMessage}>
              {(control) => menu(
                <SelectControl {...control} aria-labelledby={`${control['aria-labelledby']} ${control.id}-value`} {...state}>
                  <span id={`${control.id}-value`}>{value || 'None'}</span>
                </SelectControl>,
              )}
            </Field>
          </FieldGroup>
        </PhoneRowsStage>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <div className="w-[290px]">
            <Field label="Period" errorMessage={errorMessage}>
              {(control) => menu(
                <SelectControl
                  {...control}
                  // Named by the label and the value, as Select's trigger is
                  aria-labelledby={`${control['aria-labelledby']} ${control.id}-value`}
                  // block fills the field; a set width would hold it
                  className={block ? undefined : 'w-[200px]'}
                  variant={variant}
                  size={size}
                  pill={pill}
                  block={block}
                  opticallyAlign={ghost && shownAlign !== 'none' ? shownAlign : undefined}
                  StartIcon={startIcon ? StartIcon : undefined}
                  dropdownIconType={dropdownIconType}
                  onClearClick={clearable ? () => setValue('') : undefined}
                  {...state}
                >
                  <span id={`${control.id}-value`}>{value || 'Select date...'}</span>
                </SelectControl>,
              )}
            </Field>
          </div>
        </div>
      )}
    </>
  );
}
