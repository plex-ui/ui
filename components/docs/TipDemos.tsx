'use client';

import { useState, type ReactElement } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Bell, Bookmark, Filter } from '@plexui/ui/components/Icon';
import { Tip } from '@plexui/ui/components/Tip';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

// On a phone an inline tip is the opaque card of a grouped list, so it sits on the grouped surface (as in Wallet)
function OnPhoneRows({ children }: { children: ReactElement }) {
  const phone = usePhoneRows();
  return phone ? <PhoneRowsStage>{children}</PhoneRowsStage> : children;
}

export function TipOverviewDemo() {
  const [shown, setShown] = useState(true);
  return (
    <OnPhoneRows>
      <div className="flex w-full max-w-[360px] flex-col items-center gap-3">
        {shown ? (
          <Tip
            icon={<Bookmark />}
            title="Save it for later"
            description="Bookmarked articles wait in your reading list, ready offline on every device."
            onClose={() => setShown(false)}
            className="w-full"
          />
        ) : (
          <Button color="secondary" variant="soft" onClick={() => setShown(true)}>Show the tip again</Button>
        )}
      </div>
    </OnPhoneRows>
  );
}

export function TipActionsDemo() {
  return (
    <OnPhoneRows>
      <div className="w-full max-w-[360px]">
        <Tip
          icon={<Bell />}
          title="Turn on notifications"
          description="Get a message when someone replies to your post or mentions you."
          actions={
            <>
              <Button color="primary" variant="soft" size="sm" pill>Not now</Button>
              <Button color="primary" size="sm" pill>Turn on</Button>
            </>
          }
        />
      </div>
    </OnPhoneRows>
  );
}

export function TipPermissionDemo() {
  return (
    <OnPhoneRows>
      <div className="w-full max-w-[360px]">
        <Tip
          icon={<Bell />}
          title="Get alerts"
          description="Hear about severe weather where you are, even when the app is closed."
          mobileActions="buttons"
          actions={<Button color="primary" variant="soft" size="sm" pill>Turn on</Button>}
        />
      </div>
    </OnPhoneRows>
  );
}

export function TipArrowDemo() {
  return (
    <OnPhoneRows>
      <div className="flex w-full max-w-[360px] flex-col items-center gap-1">
        <Button color="secondary" variant="soft" uniform pill aria-label="Filter">
          <Filter />
        </Button>
        <Tip
          arrowEdge="top"
          title="Filter the list"
          description="Show only the items from the last week, month or year."
          className="w-full"
        />
      </div>
    </OnPhoneRows>
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
