'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow, DemoControlSelect, controlsTableStyle } from '../ButtonDemos';
import { SliderValueControl } from '../SliderValueControl';
import { VuePreview } from '../VuePreview';
import { DemoControlValuesContext, DemoControlsBottom, usePreviewEmbed } from '../PreviewEmbed';
import { usePhoneRows } from '../PhoneRows';
import { createInitialDemoState } from './initialDemoState';
import { renderDemoCode } from '../demoCode.mjs';

/**
 * A select option: the value itself, or a value shown under another label (`Per-digit`). `when`: offered only while
 * the other controls have these values (icon only on a horizontal control); a value on an option not offered shows
 * as the control's `default`.
 */
export type VueDemoOption = string | { value: string | boolean; label: string; when?: VueDemoWhen };

/**
 * A condition on the other controls: each one it names has the value, or one of the values a list names. A list of
 * conditions holds when any of them does (a persistent toast, with an action or a close button).
 */
export type VueDemoWhen = Record<string, unknown> | Record<string, unknown>[];

/** `name` is the template variable; `label`, when set, is what the control row shows. */
export type VueDemoControl = {
  name: string;
  label?: string;
  /**
   * Shown only on a phone; a `when` instead of `true` makes it so only while the other controls have those values,
   * and while it does a desktop template gets its `default` (a header's divider, which a filled page never draws)
   */
  phoneOnly?: boolean | Record<string, unknown>;
  /** `bottom`: the control is for what sits at the bottom of the screen, and stands under the preview */
  placement?: 'bottom';
  /**
   * Hidden on a phone (narrow page or Phone preview), where the template gets its `phoneDefault`, else `default`; a
   * `when` instead of `true` makes it so only while the other controls have those values (a spinner's stroke, which
   * the phone spinner takes from its size, but not a ring's)
   */
  desktopOnly?: boolean | Record<string, unknown>;
  /**
   * Shown only while the other controls have these values (`collapsible` for a `single` accordion), a list naming
   * the values any of which will do, or while any of a list of such conditions holds; where it is not shown, the
   * template gets its `default`.
   */
  when?: VueDemoWhen;
  /**
   * State the template keeps that this control sets back when it changes (an open search goes back to waiting when
   * the search moves elsewhere), as React's demo sets it in the control's `onChange`
   */
  resets?: Record<string, unknown>;
} & (
  | { type: 'boolean'; default: boolean; phoneDefault?: boolean }
  /**
   * `phoneOptions`: the options shown on a phone; a value outside them shows as `default` there.
   * `limit`: numeric options stay at most `total` less the boolean controls named in `taken` that are on;
   * the others are disabled, and a value over the limit shows as the largest option that fits.
   */
  | { type: 'select'; options: readonly VueDemoOption[]; phoneOptions?: readonly VueDemoOption[]; default: string | boolean; phoneDefault?: string | boolean; limit?: { total: number; taken: readonly string[] };
      /** A menu rather than a row of segments: more options than the row shows whole (eight colors), as React's DemoControlSelect */
      menu?: boolean }
  /** `phoneDefault: null`: on a phone the template gets no value, and the component takes its own */
  | { type: 'range'; min: number; max: number; step: number; default: number; phoneDefault?: number | null }
);

const optionsOf = (options: readonly VueDemoOption[]) =>
  options.map((option): Exclude<VueDemoOption, string> => (typeof option === 'string' ? { value: option, label: option } : option));

/** Whether the values meet a `when` (see VueDemoWhen) */
const holds = (when: VueDemoWhen | undefined, values: Record<string, unknown>): boolean =>
  Array.isArray(when)
    ? when.some((condition) => holds(condition, values))
    : Object.entries(when ?? {}).every(([name, value]) => (Array.isArray(value) ? value.includes(values[name]) : values[name] === value));

/** Whether the control is a phone one under these values */
const phoneOnlyIn = (control: VueDemoControl, values: Record<string, unknown>) =>
  control.phoneOnly === true || (typeof control.phoneOnly === 'object' && holds(control.phoneOnly, values));

/** Whether the control is a desktop one under these values */
const desktopOnlyIn = (control: VueDemoControl, values: Record<string, unknown>) =>
  control.desktopOnly === true || (typeof control.desktopOnly === 'object' && holds(control.desktopOnly, values));

/** What the desktop-only controls give a phone template: their `phoneDefault`, else `default` */
const phoneValues = (controls: readonly VueDemoControl[], values: Record<string, unknown>) =>
  Object.fromEntries(controls.filter((control) => desktopOnlyIn(control, values))
    .map((control) => [control.name, control.phoneDefault === null ? undefined : control.phoneDefault ?? control.default]));

/**
 * A control a `when` hides gives the template its default, and so does a value on an option a `when` does not
 * offer: what the preview and its code show is what the shown controls say. A `when` may name a control set back
 * before it (badgePill after badge), so the passes go on until nothing changes.
 */
const withinConditions = (controls: readonly VueDemoControl[], values: Record<string, unknown>) => {
  const next = { ...values };
  for (let pass = 0; pass <= controls.length; pass += 1) {
    let changed = false;
    for (const control of controls) {
      const ruledOut = control.type === 'select' && optionsOf(control.options)
        .some((option) => option.value === next[control.name] && option.when !== undefined && !holds(option.when, next));
      if ((ruledOut || !holds(control.when, next)) && next[control.name] !== control.default) {
        next[control.name] = control.default;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return next;
};

const overLimit = (control: VueDemoControl, value: unknown, values: Record<string, unknown>) =>
  control.type === 'select' && control.limit !== undefined
  && Number(value) > control.limit.total - control.limit.taken.filter((name) => values[name] === true).length;

/** A value a control's `limit` rules out shows as the largest option that fits */
const withinLimits = (controls: readonly VueDemoControl[], values: Record<string, unknown>) => {
  const next = { ...values };
  for (const control of controls) {
    if (control.type !== 'select' || !overLimit(control, next[control.name], next)) continue;
    const fits = optionsOf(control.options).filter((option) => !overLimit(control, option.value, next));
    if (fits.length > 0) next[control.name] = fits[fits.length - 1].value;
  }
  return next;
};

/**
 * Restarts a demo on a timer, like the React demos that loop a simulation:
 * every `every` ms the boolean `name` turns true for `holdFor` ms, then the
 * preview remounts with it false. `when`: only while the controls hold these values (the ring of the Indicators
 * Overview restarts; its spinner and dots do not)
 */
export type VueDemoLoop = { name: string; every: number; holdFor: number; when?: VueDemoWhen };

const DEFAULT_STAGE = 'flex-1 flex flex-col items-center justify-center py-12 w-full';

/**
 * A Vue preview with optional demo controls. Each control's `name` is the
 * variable the template reads (`:size="size"`), so the code shown is the
 * template that runs. Mirrors the React `*DemoWithControls` layout.
 */
export function VueDemo(props: VueDemoProps) {
  // A page's own phone layout passes `phone`; desktop-only controls need to know it themselves
  return props.phone === undefined && props.controls?.some((control) => control.desktopOnly || typeof control.phoneOnly === 'object')
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
  /** A phone layout (`VuePhoneRowsDemo` sets it): select controls offer their `phoneOptions`, desktop-only controls give their `phoneDefault`, else `default` */
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
  /** Classes of the demo stage in the Phone preview, for a phone template that is a whole screen (a docs frame) */
  phoneStageClassName?: string;
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
  stageClassName: desktopStageClassName,
  phoneStageClassName,
}: VueDemoProps) {
  const phonePreview = usePreviewEmbed() !== null;
  const stageClassName = phonePreview && phoneStageClassName ? phoneStageClassName : desktopStageClassName;
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
  const props = useMemo(() => {
    const asked = {
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
    };
    if (!phone) return withinLimits(controls, withinConditions(controls, asked));
    // A phone has no desktop-only control, so the others' conditions see the value its template gets (marks are
    // offered on a phone slider, which is horizontal whatever orientation the desktop chose); its own hidden row
    // keeps the value chosen for it (a stroke the phone spinner leaves out, a fill that makes a divider phone-only)
    const hidden = phoneValues(controls, asked);
    const seen = withinConditions(controls, { ...asked, ...hidden });
    return withinLimits(controls, {
      ...seen,
      ...Object.fromEntries(controls.filter((control) => control.name in hidden)
        .map((control) => [control.name, holds(control.when, seen) ? asked[control.name] : control.default])),
    });
  }, [context, controls, loop?.name, modifiedControls, phone, reactiveControlDefaults, values]);
  // A hidden desktop-only control keeps the chosen value; the template shows its phone default or default. So does
  // a control that a condition makes phone-only, on a desktop
  const templateProps = useMemo(() => (phone ? {
    ...props,
    ...phoneValues(controls, props),
  } : {
    ...props,
    ...Object.fromEntries(controls.filter((control) => typeof control.phoneOnly === 'object' && phoneOnlyIn(control, props))
      .map((control) => [control.name, control.default])),
  }), [controls, phone, props]);
  const set = (name: string) => (value: unknown) => {
    const resets = controls.find((control) => control.name === name)?.resets;
    setValues((current) => (current[name] === value ? current : { ...current, ...resets, [name]: value }));
    if (reactiveControlDefaults) {
      setModifiedControls((current) => current.has(name) ? current : new Set([...current, name]));
    }
  };

  const { name: loopName, every, holdFor } = loop ?? {};
  const looping = loop !== undefined && holds(loop.when, props);
  // A loop its controls start again starts from the beginning, as React's demo mounts its ring again (a ring that
  // stood fixed for longer than its simulation would otherwise show full until the loop comes round)
  const [wasLooping, setWasLooping] = useState(looping);
  if (looping !== wasLooping) {
    setWasLooping(looping);
    if (looping) setRun((n) => n + 1);
  }
  useEffect(() => {
    if (!loopName || !every || !looping) return;
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
      // A loop that stops while it holds lets go of its value
      setValues((current) => (current[loopName] ? { ...current, [loopName]: false } : current));
    };
  }, [loopName, every, holdFor, looping]);

  // The preview's code follows the values the template gets (a phone's default for a desktop-only control, an
  // option's value rather than its label), so the demo writes them itself and its controls do not
  const codeValues = useContext(DemoControlValuesContext);
  const owner = useMemo(() => ({}), []);
  const controlValues = useMemo(() => Object.fromEntries(controls.map((control) => [control.name, templateProps[control.name]])), [controls, templateProps]);
  useEffect(() => {
    if (!codeValues) return;
    for (const [name, value] of Object.entries(controlValues)) codeValues.set(name, value, owner);
  }, [codeValues, controlValues, owner]);
  useEffect(() => {
    if (!codeValues) return;
    const names = controls.map((control) => control.name);
    return () => names.forEach((name) => codeValues.remove(name, owner));
  }, [codeValues, controls, owner]);
  // A template with `[[ ]]` tags (demoCode.mjs) is the preview's code: the controls set it, and the Vue app mounts
  // again when they do. Other values reach the template as reactive props.
  const source = phonePreview ? phoneTemplate ?? template : template;
  const filledTemplate = useMemo(() => {
    if (!source.includes('[[')) return source;
    try {
      return renderDemoCode(source, templateProps);
    } catch (error) {
      console.error(error);
      return source;
    }
  }, [source, templateProps]);
  // A control follows the demo when the template changes its value
  const preview = (
    <VuePreview
      key={run}
      template={filledTemplate}
      props={templateProps}
      onPropChange={(name, value) => {
        // A control follows the template, and so does state a control resets: the reset reaches the template only as a
        // change of the value the demo holds
        if (controls.some((control) => control.name === name || (control.resets && name in control.resets))) set(name)(value);
      }}
    />
  );
  // On a phone a control's conditions see what the template gets, as the values above do
  const conditionValues = phone ? templateProps : props;
  const shownControls = controls.filter((control) => !hiddenControls.includes(control.name) && holds(control.when, conditionValues));
  const optionsFor = (control: Extract<VueDemoControl, { type: 'select' }>) => optionsOf(phone && control.phoneOptions ? control.phoneOptions : control.options)
    .filter((option) => holds(option.when, conditionValues));
  if (shownControls.length === 0) {
    return stageClassName ? (
      <div className={stageClassName} data-demo-stage>
        {preview}
      </div>
    ) : (
      preview
    );
  }

  // The page and its Phone view trade the value asked for, which a row may show as another: an option its `when`
  // rules out (icon only on vertical tabs) or a value the phone does not offer. Rows trade a select's labels.
  const asked = (name: string) => (context && name in context) || (reactiveControlDefaults && !modifiedControls.has(name)) ? props[name] : values[name];
  const everyOption = (control: Extract<VueDemoControl, { type: 'select' }>) => optionsOf([...control.options, ...(control.phoneOptions ?? [])]);
  const labelOf = (control: Extract<VueDemoControl, { type: 'select' }>, value: unknown) => everyOption(control).find((option) => option.value === value)?.label;
  const valueOf = (control: Extract<VueDemoControl, { type: 'select' }>, label: string) => everyOption(control).find((option) => option.label === label)?.value;
  const renderControl = (control: VueDemoControl) =>
    control.type === 'boolean' ? (
      <DemoControlBoolean
        key={control.name}
        name={control.label ?? control.name}
        value={props[control.name] as boolean}
        onChange={set(control.name)}
        syncValue={asked(control.name) as boolean}
        phoneOnly={phoneOnlyIn(control, props)}
        desktopOnly={desktopOnlyIn(control, props)}
      />
    ) : control.type === 'range' ? (
      <DemoControlRow key={control.name} name={control.name} label={control.label} phoneOnly={phoneOnlyIn(control, props)} desktopOnly={desktopOnlyIn(control, props)}>
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
    ) : control.menu ? (
      <DemoControlSelect
        key={control.name}
        name={control.name}
        label={control.label}
        phoneOnly={phoneOnlyIn(control, props)}
        desktopOnly={desktopOnlyIn(control, props)}
        options={optionsFor(control).map((option) => option.label)}
        value={optionsFor(control).find((option) => option.value === props[control.name])?.label ?? ''}
        syncValue={labelOf(control, asked(control.name))}
        onChange={(label) => set(control.name)(valueOf(control, label))}
      />
    ) : (
      <DemoControlRow key={control.name} name={control.name} label={control.label} phoneOnly={phoneOnlyIn(control, props)} desktopOnly={desktopOnlyIn(control, props)} syncValue={labelOf(control, asked(control.name))}>
        <SegmentedControl<string>
          value={optionsFor(control).find((option) => option.value === props[control.name])?.label ?? ''}
          onChange={(label) => {
            const value = valueOf(control, label);
            // A limited control's shown value coming back (the phone view's sync) keeps the value asked for
            if (control.limit && value === props[control.name]) return;
            set(control.name)(value);
          }}
          aria-label={control.label ?? control.name}
          size="xs"
        >
          {optionsFor(control).map((option) => (
            <SegmentedControl.Option key={option.label} value={option.label} disabled={overLimit(control, option.value, props)}>
              {option.label}
            </SegmentedControl.Option>
          ))}
        </SegmentedControl>
      </DemoControlRow>
    );
  const topControls = shownControls.filter((control) => control.placement !== 'bottom');
  const bottomControls = shownControls.filter((control) => control.placement === 'bottom');

  return (
    <>
      <DemoControlValuesContext.Provider value={null}>
        {topControls.length > 0 && <div data-demo-controls style={controlsTableStyle}>{topControls.map(renderControl)}</div>}
      </DemoControlValuesContext.Provider>
      <div className={stageClassName ?? DEFAULT_STAGE} data-demo-stage>
        {preview}
      </div>
      <DemoControlValuesContext.Provider value={null}>
        {bottomControls.length > 0 && <DemoControlsBottom style={controlsTableStyle}>{bottomControls.map(renderControl)}</DemoControlsBottom>}
      </DemoControlValuesContext.Provider>
    </>
  );
}
