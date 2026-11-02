'use client';

import { useState, type ComponentProps } from 'react';
import { markRaw, reactive } from 'vue';
import { TableBody } from '@plexui/vue/components/Table';
import { VueDemo } from './VueDemo';

// `:as="TableBody"` reads the component from the setup scope. MDX cannot pass a
// component to a client component, so it comes in through this wrapper.

export function VueSortableTableDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ TableBody: markRaw(TableBody), ...state }} />;
}

type Move = { item: string; from: string; to: string; toIndex?: number };

// The handler of `@move` updates both lists, so it lives with them.
function taskLists() {
  const lists = reactive<Record<string, string[]>>({
    Today: ['Check the invoices', 'Call the supplier', 'Update the price list'],
    Later: ['Plan the summer menu'],
    Done: [],
  });
  const move = ({ item, from, to, toIndex }: Move) => {
    lists[from].splice(lists[from].indexOf(item), 1);
    lists[to].splice(toIndex ?? lists[to].length, 0, item);
  };
  return { lists, move };
}

export function VueSortableGroupDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  const [tasks] = useState(taskLists);
  return <VueDemo {...props} state={{ ...tasks, ...state }} />;
}
