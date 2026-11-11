'use client';

import { useState, type ReactElement } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Bell, Filter } from '@plexui/ui/components/Icon';
import { Tip } from '@plexui/ui/components/Tip';
import { controlsTableStyle, DemoControlBoolean, Segments } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

// On a phone an inline tip is the opaque card of a grouped list, so it sits on the grouped surface (as in Wallet)
function Stage({ children }: { children: ReactElement }) {
  const phone = usePhoneRows();
  return phone ? (
    <PhoneRowsStage>{children}</PhoneRowsStage>
  ) : (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">{children}</div>
  );
}

const ACTIONS = ['none', 'one', 'two'] as const;
// How a phone draws the actions: rows of text under a separator, or the buttons as capsules
const MOBILE_ACTIONS = ['rows', 'buttons'] as const;
const ARROW_EDGES = ['none', 'top', 'bottom', 'left', 'right'] as const;
// A phone offers no sideways arrow: no iOS screen sets a control beside a card of a grouped list, while a tip over or
// under its control is TipKit's own
const PHONE_ARROW_EDGES = ['none', 'top', 'bottom'] as const;

/**
 * The Overview, with every setting of an inline tip: what the page's examples once showed one by one (Actions,
 * Buttons on a phone, Arrow) are its settings (owner 11.11: «в первом примере можно сразу показать все со всеми
 * настройками»). One tip, the kit's notifications tip, carries them all. With an arrow, the button it points at
 * stands on that side. `mobileActions` acts only on a phone, so only the Phone preview offers it.
 */
export function TipOverviewDemo() {
  const [icon, setIcon] = useState(true);
  const [onClose, setOnClose] = useState(true);
  const [actions, setActions] = useState<(typeof ACTIONS)[number]>('none');
  const [mobileActions, setMobileActions] = useState<(typeof MOBILE_ACTIONS)[number]>('rows');
  const [arrowEdge, setArrowEdge] = useState<(typeof ARROW_EDGES)[number]>('none');
  const [shown, setShown] = useState(true);
  const phone = usePhoneRows();
  // A sideways arrow chosen on desktop shows as none on a phone
  const edge = phone && (arrowEdge === 'left' || arrowEdge === 'right') ? 'none' : arrowEdge;
  const sideways = edge === 'left' || edge === 'right';
  const before = edge === 'top' || edge === 'left';
  const control = edge !== 'none' && (
    <Button color="secondary" variant="soft" uniform pill aria-label="Notifications" className="shrink-0">
      <Bell />
    </Button>
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="icon" value={icon} onChange={setIcon} />
        <DemoControlBoolean name="onClose" value={onClose} onChange={setOnClose} />
        <Segments name="actions" options={ACTIONS} value={actions} onChange={setActions} />
        {actions !== 'none' && <Segments name="mobileActions" options={MOBILE_ACTIONS} value={mobileActions} onChange={setMobileActions} phoneOnly />}
        <Segments name="arrowEdge" options={phone ? PHONE_ARROW_EDGES : ARROW_EDGES} value={edge} onChange={setArrowEdge} />
      </div>
      <Stage>
        <div className={`flex w-full md:max-w-[360px] items-center gap-1 ${sideways ? 'flex-row' : 'flex-col'}`}>
          {before && control}
          {shown ? (
            <Tip
              icon={icon ? <Bell /> : undefined}
              title="Turn on notifications"
              description="Get a message when someone replies to your post or mentions you."
              onClose={onClose ? () => setShown(false) : undefined}
              actions={actions === 'none' ? undefined : (
                <>
                  {actions === 'two' && <Button color="primary" variant="soft" size="sm" pill>Not now</Button>}
                  <Button color="primary" variant={actions === 'two' ? 'solid' : 'soft'} size="sm" pill>Turn on</Button>
                </>
              )}
              mobileActions={actions === 'none' ? undefined : mobileActions}
              arrowEdge={edge === 'none' ? undefined : edge}
              className={sideways ? 'min-w-0 flex-1' : 'w-full'}
            />
          ) : (
            <Button color="secondary" variant="soft" onClick={() => setShown(true)}>Show the tip again</Button>
          )}
          {!before && control}
        </div>
      </Stage>
    </>
  );
}

export function TipPopoverDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Tip.Popover
      open={open}
      onOpenChange={setOpen}
      title="Filter the list"
      description="Show only the items from the last week, month or year."
    >
      <Button color="secondary" variant="soft" onClick={() => setOpen(!open)}>
        <Filter />
        Filter
      </Button>
    </Tip.Popover>
  );
}
