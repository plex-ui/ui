'use client';

import { useRef, useState } from 'react';
import { DotsHorizontal, SettingsSlider } from '@plexui/ui/components/Icon';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Page } from '@plexui/ui/components/Page';
import { Popover } from '@plexui/ui/components/Popover';
import { Switch } from '@plexui/ui/components/Switch';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import pageStyles from './PageDemos.module.css';
import { usePhoneRows } from './PhoneRows';

/**
 * A column-visibility panel (Popover + Switch), the Popover page's Column configuration example. It lived on the
 * Select page, where it was not a Select (owner 10.11: «Делай все 6 пунктов», point 5).
 */
const ALL_COLUMNS = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Role' },
  { id: 'status', label: 'Status' },
  { id: 'created', label: 'Created at' },
  { id: 'lastLogin', label: 'Last login' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'phone', label: 'Phone' },
];

const DEFAULT_SHOWN_COLUMNS = ['name', 'email', 'role', 'status'];

export function ColumnConfigDemo() {
  const phone = usePhoneRows();
  const heading = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<string[]>(DEFAULT_SHOWN_COLUMNS);

  const toggle = (id: string) => {
    setShown((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const shownColumns = ALL_COLUMNS.filter((c) => shown.includes(c.id));
  const hiddenColumns = ALL_COLUMNS.filter((c) => !shown.includes(c.id));
  const trigger = (
    <Button color="secondary" variant="outline" size="sm">
      <SettingsSlider width={15} height={15} /> Columns
    </Button>
  );

  // A phone presents the panel as a sheet of switch rows in a fixed order: as in iOS settings,
  // a row stays in place when its switch changes. It opens from the More bar button of the screen's top bar, three
  // dots on glass, as the view options of Photos and Files do (iOS-menu IMG_5657, IMG_5704; MenuDemos.tsx); a
  // sliders symbol is not one iOS puts in a bar (owner 10.11).
  if (phone) return (
    <div data-demo-stage className={pageStyles.Stage}>
      <div className={pageStyles.Frame}>
        <Page>
          <Toolbar>
            <Toolbar.Title>Members</Toolbar.Title>
            <Toolbar.Trailing>
              <Dialog>
                <Dialog.Trigger>
                  <Button color="secondary" variant="soft" uniform pill aria-label="Columns"><DotsHorizontal /></Button>
                </Dialog.Trigger>
                <Dialog.Content mobileVariant="sheet" onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}>
                  <Dialog.Header>
                    <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>Columns</Dialog.Title></div>
                  </Dialog.Header>
                  <Dialog.Body>
                    <FieldGroup>
                      {ALL_COLUMNS.map((col) => (
                        <Field row key={col.id} label={col.label}>
                          <Switch color="accent" checked={shown.includes(col.id)} onCheckedChange={() => toggle(col.id)} />
                        </Field>
                      ))}
                    </FieldGroup>
                  </Dialog.Body>
                </Dialog.Content>
              </Dialog>
            </Toolbar.Trailing>
          </Toolbar>
        </Page>
      </div>
    </div>
  );

  return (
    <Popover>
      <Popover.Trigger>{trigger}</Popover.Trigger>
      <Popover.Content minWidth={240} side="bottom" align="start">
        <div className="py-1.5">
          {shownColumns.length > 0 && (
            <div>
              {shownColumns.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between gap-4 px-3 py-1.5 cursor-pointer hover:bg-alpha/5"
                  onClick={() => toggle(col.id)}
                >
                  <span className="text-sm">{col.label}</span>
                  <Switch checked aria-label={col.label} />
                </div>
              ))}
            </div>
          )}
          {hiddenColumns.length > 0 && (
            <div>
              {hiddenColumns.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between gap-4 px-3 py-1.5 cursor-pointer hover:bg-alpha/5"
                  onClick={() => toggle(col.id)}
                >
                  <span className="text-sm text-tertiary">{col.label}</span>
                  <Switch checked={false} aria-label={col.label} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
}
