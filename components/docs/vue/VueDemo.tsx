'use client';

import { useMemo, useState } from 'react';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from '../ButtonDemos';
import { VuePreview } from '../VuePreview';

export type VueDemoControl =
  | { name: string; type: 'boolean'; default: boolean }
  | { name: string; type: 'select'; options: readonly string[]; default: string };

/**
 * A Vue preview with optional demo controls. Each control's `name` is the
 * variable the template reads (`:size="size"`), so the code shown is the
 * template that runs. Mirrors the React `*DemoWithControls` layout.
 */
export function VueDemo({
  template,
  controls = [],
  stageClassName = 'flex-1 flex flex-col items-center justify-center py-12 w-full',
}: {
  template: string;
  controls?: VueDemoControl[];
  stageClassName?: string;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(controls.map((control) => [control.name, control.default])),
  );
  const props = useMemo(() => values, [values]);
  const set = (name: string) => (value: unknown) => setValues((current) => ({ ...current, [name]: value }));

  if (controls.length === 0) return <VuePreview template={template} />;

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
      <div className={stageClassName} data-demo-stage>
        <VuePreview template={template} props={props} />
      </div>
    </>
  );
}
