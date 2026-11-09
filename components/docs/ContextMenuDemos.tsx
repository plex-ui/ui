'use client';

import { useState } from 'react';
import { ContextMenu } from '@plexui/ui/components/ContextMenu';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Calendar, Copy, Home, Images, Pin, RemoveTrash, Share } from '@plexui/ui/components/Icon';
import { Sortable } from '@plexui/ui/components/Sortable';
import c from './ContextMenuDemos.module.css';
import t from './ToolbarDemos.module.css';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

const NOTES = ['Groceries', 'Trip to Lisbon', 'Book club'];
const TILES = [
  { label: 'Home', icon: <Home /> },
  { label: 'Calendar', icon: <Calendar /> },
  { label: 'Photos', icon: <Images /> },
];

function Actions() {
  return (
    <ContextMenu.Content>
      <ContextMenu.Item onSelect={() => {}}><Copy width={20} height={20} /> Copy</ContextMenu.Item>
      <ContextMenu.Item onSelect={() => {}}><Share width={20} height={20} /> Share</ContextMenu.Item>
      <ContextMenu.Item onSelect={() => {}}><Pin width={20} height={20} /> Pin</ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item danger onSelect={() => {}}><RemoveTrash width={20} height={20} /> Delete</ContextMenu.Item>
    </ContextMenu.Content>
  );
}

export function ContextMenuOverviewDemo() {
  const phone = usePhoneRows();
  const group = (
    <FieldGroup className={c.List}>
      {NOTES.map((note) => (
        <ContextMenu key={note}>
          <ContextMenu.Trigger>
            <div data-row tabIndex={0} className={`${t.Row} ${c.Row}`}>{note}</div>
          </ContextMenu.Trigger>
          <Actions />
        </ContextMenu>
      ))}
    </FieldGroup>
  );
  // On a phone the rows sit on the grouped surface of an iOS list, as on the Input page
  return phone ? <PhoneRowsStage>{group}</PhoneRowsStage> : group;
}

export function ContextMenuTilesDemo() {
  return (
    <div className={c.Tiles}>
      {TILES.map((tile) => (
        <ContextMenu key={tile.label}>
          <ContextMenu.Trigger>
            <div tabIndex={0} role="img" aria-label={tile.label} className={c.Tile}>{tile.icon}</div>
          </ContextMenu.Trigger>
          <Actions />
        </ContextMenu>
      ))}
    </div>
  );
}

export function ContextMenuSortableDemo() {
  const phone = usePhoneRows();
  const [notes, setNotes] = useState(NOTES);
  const group = (
    <FieldGroup className={c.List}>
      <Sortable value={notes} onChange={setNotes}>
        {notes.map((note) => (
          <ContextMenu key={note}>
            <ContextMenu.Trigger>
              <div data-row tabIndex={0} className={`${t.Row} ${c.Row}`}>
                {note}
                <Sortable.Handle aria-label={`Reorder ${note}`} />
              </div>
            </ContextMenu.Trigger>
            <Actions />
          </ContextMenu>
        ))}
      </Sortable>
    </FieldGroup>
  );
  return phone ? <PhoneRowsStage>{group}</PhoneRowsStage> : group;
}
