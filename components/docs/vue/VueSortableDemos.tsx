'use client';

import type { ComponentProps } from 'react';
import { markRaw } from 'vue';
import { TableBody } from '@plexui/vue/components/Table';
import { VueDemo } from './VueDemo';

// `:as="TableBody"` reads the component from the setup scope. MDX cannot pass a
// component to a client component, so it comes in through this wrapper.

export function VueSortableTableDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ TableBody: markRaw(TableBody), ...state }} />;
}

type Move = { item: string; from: string; to: string; toIndex?: number };

// The handler of `@move` updates both lists. The demo copies its state for each preview, so the template hands it the
// lists the preview shows: a handler that kept the lists it was made with would change a copy nobody sees.
const move = (lists: Record<string, string[]>, { item, from, to, toIndex }: Move) => {
  lists[from].splice(lists[from].indexOf(item), 1);
  lists[to].splice(toIndex ?? lists[to].length, 0, item);
};

export function VueSortableGroupDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return (
    <VueDemo
      {...props}
      state={{
        lists: { Today: ['Check the invoices', 'Call the supplier', 'Update the price list'], Later: ['Plan the summer menu'], Done: [] },
        move,
        ...state,
      }}
    />
  );
}

// Files dragged onto a folder: the folders, the one that is open, and the move that takes a file to another
export function VueSortableTargetsDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return (
    <VueDemo
      {...props}
      state={{
        folders: {
          Inbox: ['Lease agreement.pdf', 'Electricity bill.pdf', 'Passport scan.jpg', 'Tax return 2025.pdf'],
          Contracts: ['Employment contract.pdf'],
          Invoices: [],
          Archive: ['Old insurance policy.pdf'],
        },
        view: { open: 'Inbox' },
        move,
        ...state,
      }}
    />
  );
}
