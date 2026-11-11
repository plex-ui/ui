'use client';

import { useState } from 'react';
import { Alert } from '@plexui/ui/components/Alert';
import { Button } from '@plexui/ui/components/Button';
import { Lightbulb } from '@plexui/ui/components/Icon';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow, DemoControlSelect, controlsTableStyle } from './ButtonDemos';

const COLOR_OPTIONS = [
  'primary',
  'success',
  'danger',
  'warning',
  'caution',
  'info',
  'discovery',
] as const;

const VARIANT_OPTIONS = ['solid', 'soft', 'outline'] as const;
const INDICATOR_OPTIONS = ['default', 'custom', 'none'] as const;
const PLACEMENT_OPTIONS = ['auto', 'end', 'bottom'] as const;
const MOBILE_ACTIONS_OPTIONS = ['capsules', 'own'] as const;

function Segments<T extends string>({ name, options, value, onChange, desktopOnly, phoneOnly }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void; desktopOnly?: boolean; phoneOnly?: boolean }) {
  return (
    <DemoControlRow name={name} desktopOnly={desktopOnly} phoneOnly={phoneOnly}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => (
          <SegmentedControl.Option key={option} value={option}>
            {option}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );
}

/** The Overview, with every setting of the alert: what the page's examples once showed one by one (Colors & variants,
 * Title, Description, Actions, Indicator, Dismissible, Banner, Action placement) are its settings (owner 11.11: «в
 * первом примере можно сразу показать все со всеми настройками»). An alert needs a title or a description, so
 * `description` is offered only with a title. `actionsPlacement` and `mobileActions` act only on actions, so they are
 * offered only with them; on a phone the actions always stand under the message, so `actionsPlacement` is a desktop
 * setting, and `mobileActions` (their size there) a phone one. A solid alert is for a message alone: buttons, its own
 * Dismiss among them, do not read on its color, so `actions` and `onDismiss` are offered only on soft and outline ones.
 * A setting that is not offered keeps its choice and shows its default, as in the Vue demo. `color` has more options
 * than a row of segments shows whole, so it is a menu. */
export function AlertOverviewDemo() {
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('primary');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('outline');
  const [title, setTitle] = useState(true);
  const [description, setDescription] = useState(true);
  const [indicator, setIndicator] = useState<(typeof INDICATOR_OPTIONS)[number]>('default');
  const [actions, setActions] = useState(false);
  const [actionsPlacement, setActionsPlacement] = useState<(typeof PLACEMENT_OPTIONS)[number]>('auto');
  const [mobileActions, setMobileActions] = useState<(typeof MOBILE_ACTIONS_OPTIONS)[number]>('capsules');
  const [onDismiss, setOnDismiss] = useState(false);
  const [banner, setBanner] = useState(false);
  const shownDescription = !title || description;
  const buttons = variant !== 'solid';
  const shownActions = buttons && actions;
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="color" options={COLOR_OPTIONS} value={color} onChange={setColor} />
        <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />
        <DemoControlBoolean name="title" value={title} onChange={setTitle} />
        {title && <DemoControlBoolean name="description" value={description} onChange={setDescription} />}
        <Segments name="indicator" options={INDICATOR_OPTIONS} value={indicator} onChange={setIndicator} />
        {buttons && <DemoControlBoolean name="actions" value={actions} onChange={setActions} />}
        {shownActions && <Segments name="actionsPlacement" options={PLACEMENT_OPTIONS} value={actionsPlacement} onChange={setActionsPlacement} desktopOnly />}
        {shownActions && <Segments name="mobileActions" options={MOBILE_ACTIONS_OPTIONS} value={mobileActions} onChange={setMobileActions} phoneOnly />}
        {buttons && <DemoControlBoolean name="onDismiss" value={onDismiss} onChange={setOnDismiss} />}
        <DemoControlBoolean name="banner" value={banner} onChange={setBanner} />
      </div>
      <div data-demo-stage className="flex-1 w-full py-12 flex items-center justify-center">
        <Alert
          color={color}
          variant={variant}
          title={title ? 'Scheduled maintenance' : undefined}
          description={shownDescription ? "We'll be offline 2 - 4 AM UTC on July 14 while we upgrade our database." : undefined}
          indicator={indicator === 'custom' ? <Lightbulb /> : indicator === 'none' ? false : undefined}
          actions={shownActions ? (
            <>
              <Button color="primary" variant="soft" pill>Set reminder</Button>
              <Button color="primary" variant="solid" pill>View status</Button>
            </>
          ) : undefined}
          actionsPlacement={shownActions && actionsPlacement !== 'auto' ? actionsPlacement : undefined}
          mobileActions={shownActions ? mobileActions : undefined}
          onDismiss={buttons && onDismiss ? () => {} : undefined}
          banner={banner}
        />
      </div>
    </>
  );
}
