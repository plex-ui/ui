'use client';

import type { ComponentProps } from 'react';
import { markdownEditorStyles } from '@plexui/vue/components/MarkdownEditor';
import { VueDemo } from './VueDemo';

// The toolbarEnd example styles its button with `markdownEditorStyles`, a
// value the template reads from its setup scope (a real app imports it in
// <script setup>). Its class name comes from the CSS module at runtime, so
// MDX cannot write it into a client component's props.
const scope = { markdownEditorStyles };

/** A VueDemo whose template can also use `markdownEditorStyles`. */
export function VueMarkdownEditorDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return <VueDemo {...props} state={{ ...scope, ...state }} />;
}
