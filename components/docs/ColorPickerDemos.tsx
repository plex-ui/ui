'use client';

import { useState } from 'react';
import { ColorPicker, ColorWell } from '@plexui/ui/components/ColorPicker';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { FormScreen } from './FormRowsDemos';
import { usePhoneRows } from './PhoneRows';
import { DemoControlBoolean, Segments, controlsTableStyle } from './ButtonDemos';

const SIZES = ['xs', 'sm', 'lg'] as const;

/** The saved colors of the kit's Swatches (515:52724). */
const KIT_SWATCHES = ['#000000', '#007aff', '#34c759', '#ffcc00', '#ff3b30', '#7ac6f5', '#af52de', '#5856d6', '#ff2d55'];

/**
 * The Overview, two wells with every setting: what the page once showed one by one (Sizes and states) are its
 * settings (owner 11.11). Tint has a color, Highlight none yet (the full rainbow).
 */
export function ColorWellOverviewDemo() {
  const [size, setSize] = useState<(typeof SIZES)[number]>('sm');
  const [disabled, setDisabled] = useState(false);
  const [tint, setTint] = useState('#af52de');
  const [highlight, setHighlight] = useState<string | null>(null);
  // Both wells share the saved colors, as the system picker shares them across an app.
  const [swatches, setSwatches] = useState(KIT_SWATCHES);
  const phone = usePhoneRows();
  const group = (
    <FieldGroup className="w-full max-w-[400px]">
      <Field row label="Tint">
        <ColorWell aria-label="Tint" size={size} disabled={disabled} value={tint} onChange={setTint} swatches={swatches} onSwatchesChange={setSwatches} />
      </Field>
      <Field row label="Highlight">
        <ColorWell aria-label="Highlight" size={size} disabled={disabled} value={highlight} onChange={setHighlight} swatches={swatches} onSwatchesChange={setSwatches} />
      </Field>
    </FieldGroup>
  );
  // The phone preview is a whole screen (the picker opens in a sheet over it), so the rows sit in a settings
  // screen under its toolbar, not under the status bar
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="size" options={SIZES} value={size} onChange={setSize} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? <FormScreen title="Appearance">{group}</FormScreen> : <div data-demo-stage className="flex-1 flex items-center justify-center py-10 w-full">{group}</div>}
    </>
  );
}

/** The picker on its own; Without opacity is its `supportsAlpha` setting (owner 11.11) */
export function ColorPickerInlineDemo() {
  const [supportsAlpha, setSupportsAlpha] = useState(true);
  const [color, setColor] = useState('#be38f3');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="supportsAlpha" value={supportsAlpha} onChange={setSupportsAlpha} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-10 w-full">
        <div className="flex flex-col items-center gap-3">
          <ColorPicker value={color} onChange={setColor} supportsAlpha={supportsAlpha} defaultSwatches={KIT_SWATCHES} />
          <span className="text-sm text-secondary tabular-nums" aria-live="polite">{color}</span>
        </div>
      </div>
    </>
  );
}
