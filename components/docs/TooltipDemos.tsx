'use client';

import { useState } from 'react';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import { Button } from '@plexui/ui/components/Button';
import { Copy } from '@plexui/ui/components/Icon';
import { DemoControlBoolean, Segments, controlsTableStyle } from './ButtonDemos';

const TRIGGERS = ['text', 'button', 'icon'] as const;
const SIDES = ['top', 'right', 'bottom', 'left'] as const;

/** The Overview, with every setting of a tooltip: what the page's examples once showed one by one (Different triggers,
 * Conditionally enabled, Compact tooltips) are its settings (owner 11.11: «в первом примере можно сразу показать все со
 * всеми настройками»). `trigger` is what the tooltip explains: text in `Tooltip.TriggerDecorator`, a button or an icon
 * button; `disabled` disables a button and tells why in the tooltip, so it is offered only with a button. */
export function TooltipOverviewDemo() {
  const [trigger, setTrigger] = useState<(typeof TRIGGERS)[number]>('text');
  const [compact, setCompact] = useState(false);
  const [side, setSide] = useState<(typeof SIDES)[number]>('top');
  const [shownDisabled, setDisabled] = useState(false);
  // A setting that is not offered gives its default, as the Vue demo's hidden controls do, and comes back with its control
  const disabled = trigger !== 'text' && shownDisabled;
  const reason = 'This action is disabled for reasons';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="trigger" options={TRIGGERS} value={trigger} onChange={setTrigger} />
        <DemoControlBoolean name="compact" value={compact} onChange={setCompact} />
        <Segments name="side" options={SIDES} value={side} onChange={setSide} />
        {trigger !== 'text' && <DemoControlBoolean name="disabled" value={shownDisabled} onChange={setDisabled} />}
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        {trigger === 'text' && (
          <Tooltip content="This is additional context that appears when the trigger is hovered or focused" compact={compact} side={side}>
            <Tooltip.TriggerDecorator>Simple text with tooltip</Tooltip.TriggerDecorator>
          </Tooltip>
        )}
        {trigger === 'button' && (
          <Tooltip content={disabled ? reason : 'Tooltip on button'} compact={compact} side={side}>
            <Button color="primary" size="lg" disabled={disabled}>
              Sample button
            </Button>
          </Tooltip>
        )}
        {trigger === 'icon' && (
          <Tooltip content={disabled ? reason : 'Copy to clipboard'} compact={compact} side={side}>
            <Button color="secondary" variant="ghost" size="md" aria-label="Copy to clipboard" disabled={disabled}>
              <Copy />
            </Button>
          </Tooltip>
        )}
      </div>
    </>
  );
}
