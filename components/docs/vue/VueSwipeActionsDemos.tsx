'use client';

import { markRaw } from 'vue';
import { Archive, Flag, Pin, RemoveTrash } from '@plexui/vue/components/Icon';
import { SWIPE_LISTS, SWIPE_MESSAGES } from '../swipeActionsData';
import pageStyles from '../PageDemos.module.css';
import rowStyles from '../SwipeActionsDemos.module.css';
import { VueDemo } from './VueDemo';

// The icons go into a reactive scope: raw, so Vue keeps them components.
const icons = { Archive: markRaw(Archive), Flag: markRaw(Flag), Pin: markRaw(Pin), RemoveTrash: markRaw(RemoveTrash) };

const listsTemplate = (labelPlacement?: 'inside') => `<div class="${pageStyles.Frame}">
  <Page surface="grouped">
    <Toolbar>
      <ToolbarTitle>Lists</ToolbarTitle>
    </Toolbar>
    <PageContent>
      <FieldGroup>
        <SwipeActions
          v-for="list in lists"
          :key="list.name"${labelPlacement ? `\n          label-placement="${labelPlacement}"` : ''}
          :leading="[{ id: 'pin', label: list.pinned ? 'Unpin' : 'Pin', Icon: icons.Pin, color: 'warning', onSelect: () => (list.pinned = !list.pinned) }]"
          :trailing="[
            { id: 'delete', label: 'Delete', Icon: icons.RemoveTrash, color: 'danger', onSelect: () => lists.splice(lists.indexOf(list), 1) },
            { id: 'archive', label: 'Archive', Icon: icons.Archive, color: 'info', onSelect: () => lists.splice(lists.indexOf(list), 1) },
          ]"
        >
          <div class="${rowStyles.Row}">
            <span class="${rowStyles.Title}">{{ list.name }}</span>
            <component :is="icons.Pin" v-if="list.pinned" class="${rowStyles.Mark}" aria-label="Pinned" />
          </div>
        </SwipeActions>
      </FieldGroup>
    </PageContent>
  </Page>
</div>`;

const messagesTemplate = `<div class="${pageStyles.Frame}">
  <Page surface="grouped">
    <Toolbar>
      <ToolbarTitle>Inbox</ToolbarTitle>
    </Toolbar>
    <PageContent>
      <FieldGroup>
        <SwipeActions
          v-for="message in messages"
          :key="message.id"
          label-placement="below"
          :leading="[{ id: 'flag', label: message.flagged ? 'Unflag' : 'Flag', Icon: icons.Flag, color: 'warning', onSelect: () => (message.flagged = !message.flagged) }]"
          :trailing="[
            { id: 'delete', label: 'Delete', Icon: icons.RemoveTrash, color: 'danger', onSelect: () => messages.splice(messages.indexOf(message), 1) },
            { id: 'archive', label: 'Archive', Icon: icons.Archive, color: 'info', onSelect: () => messages.splice(messages.indexOf(message), 1) },
          ]"
        >
          <div class="${rowStyles.Row} ${rowStyles.Tall}">
            <div class="${rowStyles.Title}">
              <div class="${rowStyles.From}">{{ message.from }}</div>
              <div class="${rowStyles.Subject}">{{ message.subject }}</div>
            </div>
            <component :is="icons.Flag" v-if="message.flagged" class="${rowStyles.Mark}" aria-label="Flagged" />
          </div>
        </SwipeActions>
      </FieldGroup>
    </PageContent>
  </Page>
</div>`;

const lists = () => SWIPE_LISTS.map((name) => ({ name, pinned: name === 'Groceries' }));

export function VueSwipeActionsOverviewDemo() {
  return <VueDemo stageClassName={pageStyles.Stage} template={listsTemplate()} state={{ lists: lists() }} context={{ icons }} />;
}

export function VueSwipeActionsLabelsInsideDemo() {
  return <VueDemo stageClassName={pageStyles.Stage} template={listsTemplate('inside')} state={{ lists: lists() }} context={{ icons }} />;
}

export function VueSwipeActionsLabelsBelowDemo() {
  return (
    <VueDemo
      stageClassName={pageStyles.Stage}
      template={messagesTemplate}
      state={{ messages: SWIPE_MESSAGES.map((message) => ({ ...message, flagged: false })) }}
      context={{ icons }}
    />
  );
}
