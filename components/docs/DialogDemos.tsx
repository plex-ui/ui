'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { Input } from '@plexui/ui/components/Input';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';

export function DialogOverviewDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline">Open dialog</Button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Unsaved changes</Dialog.Title>
          </Dialog.Header>
          <p className="text-sm text-secondary">You have unsaved changes that will be lost if you close this page. Do you want to save before leaving?</p>
          <Dialog.Footer>
            <Dialog.Close>
              <Button color="primary" variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button color="primary" onClick={() => setOpen(false)}>Save changes</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}

export function DialogDeleteConfirmDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Trigger>
          <Button color="danger" variant="outline">Delete</Button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Delete assistant?</Dialog.Title>
          </Dialog.Header>
          <p className="text-sm text-secondary">
            This change will affect all API integrations using{' '}
            <span className="font-medium text-[var(--color-text)]">asst_NAM5K9a7loKZay9W8gtQVQ3H</span>.
            It cannot be undone.
          </p>
          <Dialog.Footer>
            <Dialog.Close>
              <Button color="secondary" variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button color="danger" onClick={() => setOpen(false)}>Delete</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}

const TERMS = [
  'Accounts. You are responsible for the activity on your account and for keeping its password safe.',
  'Content. You keep the rights to what you upload; you give us the rights we need to run the service.',
  'Acceptable use. Do not use the service to break the law, to harm others or to probe its security.',
  'Payments. Paid plans renew until cancelled; you can cancel at any time from the billing page.',
  'Changes. We tell you about material changes to these terms at least 30 days before they apply.',
  'Termination. You can stop using the service at any time; we can suspend accounts that break these terms.',
  'Liability. The service is provided as is, to the extent the law allows.',
  'Contact. Questions about these terms go to the support address in your account settings.',
];

export function DialogBodyDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline">Review terms</Button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Terms of service</Dialog.Title>
            <Dialog.Description>Please read them before you continue.</Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <div className="flex flex-col gap-4 text-sm text-secondary">
              {[...TERMS, ...TERMS].map((term, index) => (
                <p key={index}>{term}</p>
              ))}
            </div>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close>
              <Button color="secondary" variant="soft">Decline</Button>
            </Dialog.Close>
            <Button color="primary" onClick={() => setOpen(false)}>Accept</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}

const PLACEMENTS = ['center', 'top', 'bottom', 'start', 'end', 'fullscreen'] as const;

export function DialogPlacementDemo() {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<(typeof PLACEMENTS)[number]>('end');

  return (
    <div data-demo-stage className="py-10 flex flex-col items-center gap-4">
      <SegmentedControl<(typeof PLACEMENTS)[number]> value={placement} onChange={setPlacement} aria-label="Placement" size="sm">
        {PLACEMENTS.map((value) => (
          <SegmentedControl.Option key={value} value={value}>
            {value}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline">Open filters</Button>
        </Dialog.Trigger>
        <Dialog.Content placement={placement} width={placement === 'start' || placement === 'end' ? 360 : 480}>
          <Dialog.Header>
            <Dialog.Title>Filters</Dialog.Title>
            <Dialog.Description>Narrow the list down.</Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <div className="flex flex-col gap-4">
              <Field label="Status">
                <Input placeholder="Any status" />
              </Field>
              <Field label="Owner">
                <Input placeholder="Anyone" />
              </Field>
              <Field label="Created after">
                <Input placeholder="YYYY-MM-DD" />
              </Field>
            </div>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close>
              <Button color="secondary" variant="soft">Clear filters</Button>
            </Dialog.Close>
            <Button color="primary" onClick={() => setOpen(false)}>Done</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
