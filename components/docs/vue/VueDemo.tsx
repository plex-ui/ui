'use client';

import { useEffect, useMemo, useState } from 'react';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from '../ButtonDemos';
import { SliderValueControl } from '../SliderValueControl';
import { VuePreview } from '../VuePreview';

export type VueDemoControl =
  | { name: string; type: 'boolean'; default: boolean }
  | { name: string; type: 'select'; options: readonly string[]; default: string }
  | { name: string; type: 'range'; min: number; max: number; step: number; default: number };

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
export function VueDemo({
  template,
  controls = [],
  state,
  loop,
  stageClassName,
}: {
  template: string;
  controls?: VueDemoControl[];
  /** Initial values the template reads and may change (`v-model:value="value"`) */
  state?: Record<string, unknown>;
  loop?: VueDemoLoop;
  /** Classes of the demo stage; without controls the stage renders only when set */
  stageClassName?: string;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    ...state,
    ...Object.fromEntries(controls.map((control) => [control.name, control.default])),
    ...(loop ? { [loop.name]: false } : {}),
  }));
  const [run, setRun] = useState(0);
  const props = useMemo(() => values, [values]);
  const set = (name: string) => (value: unknown) => setValues((current) => ({ ...current, [name]: value }));

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

  const preview = <VuePreview key={run} template={template} props={props} />;
  if (controls.length === 0) {
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
        {controls.map((control) =>
          control.type === 'boolean' ? (
            <DemoControlBoolean
              key={control.name}
              name={control.name}
              value={values[control.name] as boolean}
              onChange={set(control.name)}
            />
          ) : control.type === 'range' ? (
            <DemoControlRow key={control.name} name={control.name}>
              <SliderValueControl
                ariaLabel={control.name}
                min={control.min}
                max={control.max}
                step={control.step}
                value={values[control.name] as number}
                onChange={set(control.name)}
                width="min(42vw, 340px)"
              />
            </DemoControlRow>
          ) : (
            <DemoControlRow key={control.name} name={control.name}>
              <SegmentedControl<string>
                value={values[control.name] as string}
                onChange={set(control.name)}
                aria-label={control.name}
                size="xs"
              >
                {control.options.map((option) => (
                  <SegmentedControl.Option key={option} value={option}>
                    {option}
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
