'use client';

import { useState } from 'react';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Archive, Flag, Pin, RemoveTrash } from '@plexui/ui/components/Icon';
import { Page } from '@plexui/ui/components/Page';
import { SwipeActions } from '@plexui/ui/components/SwipeActions';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { SWIPE_LISTS, SWIPE_MESSAGES } from './swipeActionsData';
import { controlsTableStyle, Segments } from './ButtonDemos';
import s from './PageDemos.module.css';
import r from './SwipeActionsDemos.module.css';

type ListsState = { lists: readonly string[]; pinned: string[] };
type MessagesState = { messages: typeof SWIPE_MESSAGES; flagged: string[] };

function ListsDemo({ labelPlacement, state: { lists, pinned }, onState }: { labelPlacement: 'hidden' | 'inside'; state: ListsState; onState: (update: (state: ListsState) => ListsState) => void }) {
  const setLists = (update: (current: readonly string[]) => readonly string[]) => onState((state) => ({ ...state, lists: update(state.lists) }));
  const setPinned = (update: (current: string[]) => string[]) => onState((state) => ({ ...state, pinned: update(state.pinned) }));
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

const PLACEMENTS = ['hidden', 'inside', 'below'] as const;

/**
 * The Overview, with every setting of the actions (row 33: one example per content, owner 11.11): the labels hidden,
 * inside or below the capsules were three examples of one list. iOS 27.2 sets its labels below from a row of 60px, so
 * `below` shows the two-line rows of an inbox and the others the one-line rows of the lists.
 */
export function SwipeActionsOverviewDemo() {
  const [labelPlacement, setLabelPlacement] = useState<(typeof PLACEMENTS)[number]>('hidden');
  // Each list keeps what was removed, pinned or flagged while the other one shows
  const [lists, setLists] = useState<ListsState>({ lists: SWIPE_LISTS, pinned: ['Groceries'] });
  const [messages, setMessages] = useState<MessagesState>({ messages: SWIPE_MESSAGES, flagged: [] });
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="labelPlacement" options={PLACEMENTS} value={labelPlacement} onChange={setLabelPlacement} />
      </div>
      {labelPlacement === 'below'
        ? <MessagesDemo state={messages} onState={setMessages} />
        : <ListsDemo labelPlacement={labelPlacement} state={lists} onState={setLists} />}
    </>
  );
}

function MessagesDemo({ state: { messages, flagged }, onState }: { state: MessagesState; onState: (update: (state: MessagesState) => MessagesState) => void }) {
  const setMessages = (update: (current: MessagesState['messages']) => MessagesState['messages']) => onState((state) => ({ ...state, messages: update(state.messages) }));
  const setFlagged = (update: (current: string[]) => string[]) => onState((state) => ({ ...state, flagged: update(state.flagged) }));
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
