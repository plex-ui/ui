'use client';

import { useState } from 'react';
import { Badge } from '@plexui/ui/components/Badge';
import { Button } from '@plexui/ui/components/Button';
import { Flask } from '@plexui/ui/components/Icon';
import { LoadingIndicator } from '@plexui/ui/components/Indicator';
import { DemoControlBoolean, DemoControlSelect, controlsTableStyle, Segments } from './ButtonDemos';

const COLORS = ['secondary', 'success', 'warning', 'danger', 'info', 'discovery', 'caution'] as const;
const VARIANTS = ['soft', 'solid', 'outline'] as const;
const SIZES = ['sm', 'md', 'lg', 'xl'] as const;
// What leads the text: nothing, an icon, or a loading indicator (a badge of a task in progress)
const LEADING_OPTIONS = ['none', 'icon', 'loading'] as const;
const LABELS = { none: 'New', icon: 'Beta', loading: 'In progress' } as const;

/** The Overview, with every setting of a badge: what the page's examples once showed one by one (Colors &
 * variants, Size & roundness, Icon, Remove, Loading) are its settings (owner 11.11: «в первом примере можно сразу
 * показать все со всеми настройками»). `onRemove` adds the cross; pressing it removes the badge, and Show again
 * brings it back. */
export function BadgeOverviewDemo() {
  const [color, setColor] = useState<(typeof COLORS)[number]>('info');
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('soft');
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [pill, setPill] = useState(false);
  const [leading, setLeading] = useState<(typeof LEADING_OPTIONS)[number]>('none');
  const [onRemove, setOnRemove] = useState(false);
  const [shown, setShown] = useState(true);
  const label = LABELS[leading];
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="color" options={COLORS} value={color} onChange={setColor} />
        <Segments name="variant" options={VARIANTS} value={variant} onChange={setVariant} />
        <Segments name="size" options={SIZES} value={size} onChange={setSize} />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
        <Segments name="leading" options={LEADING_OPTIONS} value={leading} onChange={setLeading} />
        <DemoControlBoolean name="onRemove" value={onRemove} onChange={setOnRemove} />
      </div>
      <div data-demo-stage className="flex justify-center py-10">
        {shown ? (
          <Badge
            color={color}
            variant={variant}
            size={size}
            pill={pill}
            // A loading indicator takes a wider gap than an icon
            className={leading === 'loading' ? 'gap-1.5' : undefined}
            removeLabel={`Remove ${label}`}
            onRemove={onRemove ? () => setShown(false) : undefined}
          >
            {leading === 'icon' && <Flask />}
            {leading === 'loading' && <LoadingIndicator />}
            {label}
          </Badge>
        ) : (
          <Button color="secondary" variant="outline" size="sm" onClick={() => setShown(true)}>
            Show again
          </Button>
        )}
      </div>
    </>
  );
}
