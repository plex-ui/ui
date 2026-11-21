'use client';

import type { ComponentProps } from 'react';
import { markdownEditorStyles } from '@plexui/vue/components/MarkdownEditor';
import { VueDemo } from './VueDemo';
import { VuePhoneRowsDemo } from './VuePhoneRowsDemo';

// The toolbarEnd example styles its button with `markdownEditorStyles`, a
// value the template reads from its setup scope (a real app imports it in
// <script setup>). Its class name comes from the CSS module at runtime, so
// MDX cannot write it into a client component's props.
const scope = { markdownEditorStyles };

/** A VueDemo whose template can also use `markdownEditorStyles`; with a phone template, its phone layout too. */
export function VueMarkdownEditorDemo({ state, ...props }: ComponentProps<typeof VuePhoneRowsDemo>) {
  if (props.phoneTemplate) return <VuePhoneRowsDemo {...props} state={{ ...scope, ...state }} />;
  return <VueDemo {...props} state={{ ...scope, ...state }} />;
}
