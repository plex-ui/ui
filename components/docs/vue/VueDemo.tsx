'use client';

import { useEffect, useMemo, useState } from 'react';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from '../ButtonDemos';
import { SliderValueControl } from '../SliderValueControl';
import { VuePreview } from '../VuePreview';
import { usePreviewEmbed } from '../PreviewEmbed';
import { usePhoneRows } from '../PhoneRows';
import { createInitialDemoState } from './initialDemoState';

/** A select option: the value itself, or a value shown under another label (`Per-digit`). */
export type VueDemoOption = string | { value: string | boolean; label: string };

/** `name` is the template variable; `label`, when set, is what the control row shows. */
export type VueDemoControl = {
  name: string;
  label?: string;
  phoneOnly?: boolean;
  /** Hidden on a phone (narrow page or Phone preview), where the template gets its `default` */
  desktopOnly?: boolean;
} & (
  | { type: 'boolean'; default: boolean }
  /** `phoneOptions`: the options shown on a phone; a value outside them shows as `default` there */
  | { type: 'select'; options: readonly VueDemoOption[]; phoneOptions?: readonly VueDemoOption[]; default: string | boolean }
  | { type: 'range'; min: number; max: number; step: number; default: number }
);

const optionsOf = (options: readonly VueDemoOption[]) =>
  options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));

/**
 * Restarts a demo on a timer, like the React demos that loop a simulation:
 * every `every` ms the boolean `name` turns true for `holdFor` ms, then the
 * preview remounts with it false.
 */
export type VueDemoLoop = { name: string; every: number; holdFor: number };

const DEFAULT_STAGE = 'flex-1 flex flex-col items-center justify-center py-12 w-full';

/**
 * A Vue preview with optional demo controls. Each control's `name` is the
 * variable the template reads (`:size="size"`), so the code shown is the
 * template that runs. Mirrors the React `*DemoWithControls` layout.
 */
export function VueDemo(props: VueDemoProps) {
  // A page's own phone layout passes `phone`; desktop-only controls need to know it themselves
  return props.phone === undefined && props.controls?.some((control) => control.desktopOnly)
    ? <VueDemoOnPhone {...props} />
    : <VueDemoView {...props} />;
}

function VueDemoOnPhone(props: VueDemoProps) {
  return <VueDemoView {...props} phone={usePhoneRows()} />;
}

type VueDemoProps = {
  template: string;
  controls?: VueDemoControl[];
  /** Names of controls that keep their value but are not shown, such as the desktop controls of a phone layout */
  hiddenControls?: readonly string[];
  /** A phone layout (`VuePhoneRowsDemo` sets it): select controls offer their `phoneOptions`, desktop-only controls give their `default` */
  phone?: boolean;
  /** Apply changing defaults until a control is explicitly changed; preserve the mounted form. */
  reactiveControlDefaults?: boolean;
  /** Initial values the template reads and may change (`v-model:value="value"`) */
  state?: Record<string, unknown>;
  /** Live host-owned context, separate from mutable initial form values and demo controls. */
  context?: Record<string, unknown>;
  /** Initial state overrides for the embedded phone preview, such as an open dialog. */
  phoneState?: Record<string, unknown>;
  /** Phone-only composition, for example a permanently open presentation of a dialog. */
  phoneTemplate?: string;
  loop?: VueDemoLoop;
  /** Classes of the demo stage; without controls the stage renders only when set */
  stageClassName?: string;
};

function VueDemoView({
  template,
  controls = [],
  hiddenControls = [],
  phone = false,
  reactiveControlDefaults = false,
  state,
  context,
  phoneState,
  phoneTemplate,
  loop,
  stageClassName,
}: VueDemoProps) {
  const phonePreview = usePreviewEmbed() !== null;
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    ...createInitialDemoState(state),
    ...Object.fromEntries(controls.map((control) => [control.name, control.default])),
    ...(loop ? { [loop.name]: false } : {}),
    ...createInitialDemoState(phonePreview ? phoneState : undefined),
  }));
  const [run, setRun] = useState(0);
  const [modifiedControls, setModifiedControls] = useState<ReadonlySet<string>>(() => new Set(
    phonePreview ? Object.keys(phoneState ?? {}) : [],
  ));
  const props = useMemo(() => ({
    ...values,
    ...(reactiveControlDefaults ? Object.fromEntries(controls
      .filter((control) => !modifiedControls.has(control.name) && control.name !== loop?.name)
      .map((control) => [control.name, control.default])) : {}),
    // A value chosen on a desktop that a phone does not offer (a color) shows as the default there
    ...(phone ? Object.fromEntries(controls
      .filter((control) => control.type === 'select' && control.phoneOptions
        && !optionsOf(control.phoneOptions).some((option) => option.value === values[control.name]))
      .map((control) => [control.name, control.default])) : {}),
    ...context,
  }), [context, controls, loop?.name, modifiedControls, phone, reactiveControlDefaults, values]);
  // A hidden desktop-only control keeps the chosen value; the template shows its default
  const templateProps = useMemo(() => (phone ? {
    ...props,
    ...Object.fromEntries(controls.filter((control) => control.desktopOnly).map((control) => [control.name, control.default])),
  } : props), [controls, phone, props]);
  const set = (name: string) => (value: unknown) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (reactiveControlDefaults) {
      setModifiedControls((current) => current.has(name) ? current : new Set([...current, name]));
    }
  };

  const { name: loopName, every, holdFor } = loop ?? {};
  useEffect(() => {
    if (!loopName || !every) return;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setValues((current) => ({ ...current, [loopName]: true }));
      hold = setTimeout(() => {
        setValues((current) => ({ ...current, [loopName]: false }));
        setRun((n) => n + 1);
      }, holdFor);
    }, every);
    return () => {
      clearInterval(id);
      clearTimeout(hold);
    };
  }, [loopName, every, holdFor]);

  // A control follows the demo when the template changes its value
  const preview = (
    <VuePreview
      key={run}
      template={phonePreview ? phoneTemplate ?? template : template}
      props={templateProps}
      onPropChange={(name, value) => {
        if (controls.some((control) => control.name === name)) set(name)(value);
      }}
    />
  );
  const shownControls = controls.filter((control) => !hiddenControls.includes(control.name));
  const optionsFor = (control: Extract<VueDemoControl, { type: 'select' }>) => optionsOf(phone && control.phoneOptions ? control.phoneOptions : control.options);
  if (shownControls.length === 0) {
    return stageClassName ? (
      <div className={stageClassName} data-demo-stage>
        {preview}
      </div>
    ) : (
      preview
    );
  }

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {shownControls.map((control) =>
          control.type === 'boolean' ? (
            <DemoControlBoolean
              key={control.name}
              name={control.label ?? control.name}
              value={props[control.name] as boolean}
              onChange={set(control.name)}
              phoneOnly={control.phoneOnly}
              desktopOnly={control.desktopOnly}
            />
          ) : control.type === 'range' ? (
            <DemoControlRow key={control.name} name={control.label ?? control.name} phoneOnly={control.phoneOnly} desktopOnly={control.desktopOnly}>
              <SliderValueControl
                ariaLabel={control.label ?? control.name}
                min={control.min}
                max={control.max}
                step={control.step}
                value={props[control.name] as number}
                onChange={set(control.name)}
                width="min(42vw, 340px)"
              />
            </DemoControlRow>
          ) : (
            <DemoControlRow key={control.name} name={control.label ?? control.name} phoneOnly={control.phoneOnly} desktopOnly={control.desktopOnly}>
              <SegmentedControl<string>
                value={optionsFor(control).find((option) => option.value === props[control.name])?.label ?? ''}
                onChange={(label) => set(control.name)(optionsFor(control).find((option) => option.label === label)?.value)}
                aria-label={control.label ?? control.name}
                size="xs"
              >
                {optionsFor(control).map((option) => (
                  <SegmentedControl.Option key={option.label} value={option.label}>
                    {option.label}
                  </SegmentedControl.Option>
                ))}
              </SegmentedControl>
            </DemoControlRow>
          ),
        )}
      </div>
      <div className={stageClassName ?? DEFAULT_STAGE} data-demo-stage>
        {preview}
      </div>
    </>
  );
}
