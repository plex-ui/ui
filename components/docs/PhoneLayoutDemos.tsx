'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { CheckCircle, DotsHorizontal, Sort, Trash } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { Menu } from '@plexui/ui/components/Menu';
import { Page } from '@plexui/ui/components/Page';
import { PhoneLayout } from '@plexui/ui/components/PhoneLayout';
import { Toolbar } from '@plexui/ui/components/Toolbar';

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

export function PhoneLayoutMenuDemo() {
  const [sort, setSort] = useState('Manual');
  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <PhoneLayout style={phoneFrameStyle}>
        <Page>
          <Toolbar titleStyle="large">
            <Toolbar.Title>Groceries</Toolbar.Title>
            <Toolbar.Trailing>
              <Menu>
                <Menu.Trigger>
                  <Button color="secondary" variant="soft" uniform pill aria-label="More"><DotsHorizontal /></Button>
                </Menu.Trigger>
                <Menu.Content align="end">
                  <Menu.Item onSelect={() => {}}><CheckCircle /> Select Items</Menu.Item>
                  <Menu.Sub>
                    <Menu.SubTrigger description={sort}><Sort /> Sort By</Menu.SubTrigger>
                    <Menu.SubContent>
                      <Menu.RadioGroup value={sort} onChange={setSort}>
                        <Menu.RadioItem value="Manual">Manual</Menu.RadioItem>
                        <Menu.RadioItem value="Due Date">Due Date</Menu.RadioItem>
                        <Menu.RadioItem value="Title">Title</Menu.RadioItem>
                      </Menu.RadioGroup>
                    </Menu.SubContent>
                  </Menu.Sub>
                  <Menu.Item onSelect={() => {}} danger><Trash /> Delete List</Menu.Item>
                </Menu.Content>
              </Menu>
            </Toolbar.Trailing>
          </Toolbar>
        </Page>
      </PhoneLayout>
    </div>
  );
}
