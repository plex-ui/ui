'use client';

import { useState } from 'react';
import { ColorPicker, ColorWell } from '@plexui/ui/components/ColorPicker';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

/** The saved colors of the kit's Swatches (515:52724). */
const KIT_SWATCHES = ['#000000', '#007aff', '#34c759', '#ffcc00', '#ff3b30', '#7ac6f5', '#af52de', '#5856d6', '#ff2d55'];

export function ColorWellOverviewDemo() {
  const [tint, setTint] = useState('#af52de');
  const [highlight, setHighlight] = useState<string | null>(null);
  // Both wells share the saved colors, as the system picker shares them across an app.
  const [swatches, setSwatches] = useState(KIT_SWATCHES);
  const phone = usePhoneRows();
  const group = (
    <FieldGroup className="w-full max-w-[400px]">
      <Field row label="Tint">
        <ColorWell aria-label="Tint" value={tint} onChange={setTint} swatches={swatches} onSwatchesChange={setSwatches} />
      </Field>
      <Field row label="Highlight">
        <ColorWell aria-label="Highlight" value={highlight} onChange={setHighlight} swatches={swatches} onSwatchesChange={setSwatches} />
      </Field>
    </FieldGroup>
  );
  // On a phone the rows sit on the grouped surface of an iOS settings screen, as on the Input page
  return phone ? <PhoneRowsStage>{group}</PhoneRowsStage> : group;
}

export function ColorWellSizesDemo() {
  return (
    <div className="flex items-center gap-4">
      <ColorWell aria-label="Small, no color" />
      <ColorWell aria-label="Small" defaultValue="#af52de" />
      <ColorWell aria-label="Large, no color" size="lg" />
      <ColorWell aria-label="Large" size="lg" defaultValue="#af52de" />
      <ColorWell aria-label="Disabled" defaultValue="#007aff" disabled />
    </div>
  );
}

export function ColorPickerInlineDemo() {
  const [color, setColor] = useState('#be38f3');
  return (
    <div className="flex flex-col items-center gap-3">
      <ColorPicker value={color} onChange={setColor} defaultSwatches={KIT_SWATCHES} />
      <span className="text-sm text-secondary tabular-nums" aria-live="polite">{color}</span>
    </div>
  );
}

export function ColorPickerOpaqueDemo() {
  return <ColorPicker defaultValue="#007aff" defaultMode="sliders" supportsAlpha={false} />;
}
