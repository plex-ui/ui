'use client';

import { useState } from 'react';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import { Button } from '@plexui/ui/components/Button';
import { Copy } from '@plexui/ui/components/Icon';
import { DemoControlBoolean, controlsTableStyle } from './ButtonDemos';

export function TooltipConditionalDemo() {
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <Tooltip content={disabled ? 'This action is disabled for reasons' : null}>
          <Button color="primary" size="lg" disabled={disabled}>
            Sample button
          </Button>
        </Tooltip>
      </div>
    </>
  );
}

export function TooltipOverviewDemo() {
  return (
    <Tooltip content="This is additional context that appears when the trigger is hovered or focused">
      <Tooltip.TriggerDecorator>Simple text with tooltip</Tooltip.TriggerDecorator>
    </Tooltip>
  );
}

export function TooltipTriggersDemo() {
  return (
    <div className="flex items-center gap-4">
      <Tooltip content="Tooltip on button">
        <Button color="primary" size="lg">Sample button</Button>
      </Tooltip>
      <Tooltip content="Tooltip on span">
        <span>Inaccessible trigger</span>
      </Tooltip>
    </div>
  );
}

export function TooltipCompactDemo() {
  return (
    <Tooltip content="Copy to clipboard" compact>
      <Button color="secondary" variant="ghost" size="md" aria-label="Copy to clipboard"><Copy /></Button>
    </Tooltip>
  );
}
