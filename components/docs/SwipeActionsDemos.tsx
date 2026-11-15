'use client';

import { useState } from 'react';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Archive, Flag, Pin, RemoveTrash } from '@plexui/ui/components/Icon';
import { Page } from '@plexui/ui/components/Page';
import { SwipeActions } from '@plexui/ui/components/SwipeActions';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { SWIPE_LISTS, SWIPE_MESSAGES } from './swipeActionsData';
import s from './PageDemos.module.css';
import r from './SwipeActionsDemos.module.css';

function ListsDemo({ labelPlacement }: { labelPlacement?: 'hidden' | 'inside' }) {
  const [lists, setLists] = useState(SWIPE_LISTS);
  const [pinned, setPinned] = useState<string[]>(['Groceries']);
  const remove = (name: string) => setLists((current) => current.filter((item) => item !== name));
  const row = (name: string) => {
    const isPinned = pinned.includes(name);
    return (
      <SwipeActions
        key={name}
        labelPlacement={labelPlacement}
        leading={[{
          id: 'pin',
          label: isPinned ? 'Unpin' : 'Pin',
          Icon: Pin,
          color: 'warning',
          onSelect: () => setPinned((current) => isPinned ? current.filter((item) => item !== name) : [...current, name]),
        }]}
        trailing={[
          { id: 'delete', label: 'Delete', Icon: RemoveTrash, color: 'danger', role: 'destructive', onSelect: () => remove(name) },
          { id: 'archive', label: 'Archive', Icon: Archive, color: 'info', role: 'destructive', onSelect: () => remove(name) },
        ]}
      >
        <div className={r.Row}>
          <span className={r.Title}>{name}</span>
        </div>
      </SwipeActions>
    );
  };
  return (
    <div data-demo-stage className={s.Stage}>
      <div className={s.Frame}>
        <Page surface="grouped">
          <Toolbar>
            <Toolbar.Title>Lists</Toolbar.Title>
          </Toolbar>
          <Page.Content>
            {/* A pinned list moves to the Pinned group, as iOS pins a note. */}
            {lists.some((name) => pinned.includes(name)) && (
              <FieldGroup title="Pinned">{lists.filter((name) => pinned.includes(name)).map(row)}</FieldGroup>
            )}
            <FieldGroup title="My Lists">{lists.filter((name) => !pinned.includes(name)).map(row)}</FieldGroup>
          </Page.Content>
        </Page>
      </div>
    </div>
  );
}

export function SwipeActionsOverviewDemo() {
  return <ListsDemo />;
}

export function SwipeActionsLabelsInsideDemo() {
  return <ListsDemo labelPlacement="inside" />;
}

export function SwipeActionsLabelsBelowDemo() {
  const [messages, setMessages] = useState(SWIPE_MESSAGES);
  const [flagged, setFlagged] = useState<string[]>([]);
  const remove = (id: string) => setMessages((current) => current.filter((item) => item.id !== id));
  return (
    <div data-demo-stage className={s.Stage}>
      <div className={s.Frame}>
        <Page surface="grouped">
          <Toolbar>
            <Toolbar.Title>Inbox</Toolbar.Title>
          </Toolbar>
          <Page.Content>
            <FieldGroup>
              {messages.map((message) => {
                const isFlagged = flagged.includes(message.id);
                return (
                  <SwipeActions
                    key={message.id}
                    labelPlacement="below"
                    leading={[{
                      id: 'flag',
                      label: isFlagged ? 'Unflag' : 'Flag',
                      Icon: Flag,
                      color: 'warning',
                      onSelect: () => setFlagged((current) => isFlagged ? current.filter((item) => item !== message.id) : [...current, message.id]),
                    }]}
                    trailing={[
                      { id: 'delete', label: 'Delete', Icon: RemoveTrash, color: 'danger', role: 'destructive', onSelect: () => remove(message.id) },
                      { id: 'archive', label: 'Archive', Icon: Archive, color: 'info', role: 'destructive', onSelect: () => remove(message.id) },
                    ]}
                  >
                    <div className={`${r.Row} ${r.Tall}`}>
                      <div className={r.Title}>
                        <div className={r.From}>{message.from}</div>
                        <div className={r.Subject}>{message.subject}</div>
                      </div>
                      {isFlagged && <Flag className={r.Mark} aria-label="Flagged" />}
                    </div>
                  </SwipeActions>
                );
              })}
            </FieldGroup>
          </Page.Content>
        </Page>
      </div>
    </div>
  );
}
