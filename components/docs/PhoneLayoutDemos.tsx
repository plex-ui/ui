'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { Input } from '@plexui/ui/components/Input';
import { PhoneLayout } from '@plexui/ui/components/PhoneLayout';

// The frame is the demo's own box: the screen of the phone that PhoneLayout lays out.
export const phoneFrameStyle = {
  width: 375,
  height: 600,
  borderRadius: 40,
  border: '1px solid var(--color-border)',
  background: 'var(--color-background)',
} as const;

export function PhoneLayoutOverviewDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <PhoneLayout style={phoneFrameStyle}>
        <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <Dialog open={open} onOpenChange={setOpen}>
            <Dialog.Trigger>
              <Button color="primary">New list</Button>
            </Dialog.Trigger>
            <Dialog.Content mobileVariant="sheet">
              <Dialog.Header>
                <Dialog.Title>New list</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Field label="Name">
                  <Input placeholder="Groceries" />
                </Field>
              </Dialog.Body>
              <Dialog.Footer>
                <Button color="primary" onClick={() => setOpen(false)}>Create</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog>
        </div>
      </PhoneLayout>
    </div>
  );
}
