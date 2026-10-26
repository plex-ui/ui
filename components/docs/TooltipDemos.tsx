'use client';

import React, { useState } from 'react';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import { Button } from '@plexui/ui/components/Button';
import { Copy } from '@plexui/ui/components/Icon';
import { Switch } from '@plexui/ui/components/Switch';

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',

  width: '100%',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

function DemoControlBoolean({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const controlId = "demo-switch-" + name.toLowerCase().replace(/\s+/g, "-");

  return (
    <div style={controlRowStyle}>
      <label htmlFor={controlId} style={controlLabelStyle}>{name}</label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

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
      <Button color="secondary" variant="ghost" size="md"><Copy /></Button>
    </Tooltip>
  );
}
