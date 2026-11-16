'use client';

import { useState } from 'react';
import { MarkdownEditor, markdownEditorStyles, type MarkdownEditorFormat } from '@plexui/ui/components/MarkdownEditor';
import { Field } from '@plexui/ui/components/Field';
import { Translate } from '@plexui/ui/components/Icon';
import { controlsTableStyle, DemoControlBoolean, Segments } from './ButtonDemos';

export const FORMATTED_MD = `This is regular text with **bold** and *italic* formatting.

Read our [Privacy Policy](https://example.com/privacy) and [Terms of Service](https://example.com/terms) for details.

1. First ordered item
2. Second ordered item

- Unordered item one
- Unordered item two`;

const SOME_FORMATS: MarkdownEditorFormat[] = ['bold', 'link'];

/**
 * The Overview, with every setting of the editor (row 33: one example per content, owner 11.11): the placeholder,
 * the formats it offers, line breaks, the variants, the Field around it with its error, the toolbar end slot and the
 * disabled state were six examples of the same editor.
 */
export function MarkdownEditorOverviewDemo() {
  const [content, setContent] = useState<'empty' | 'formatted'>('empty');
  // Each content keeps its own edits; formats and breaks are read when the editor is created, so they make a new one
  const [values, setValues] = useState({ empty: '', formatted: FORMATTED_MD });
  const value = values[content];
  const setValue = (next: string) => setValues((current) => ({ ...current, [content]: next }));
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [formats, setFormats] = useState<'all' | 'bold, link'>('all');
  const [breaks, setBreaks] = useState(false);
  const [field, setField] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [toolbarEnd, setToolbarEnd] = useState(false);

  const editor = (
    <MarkdownEditor
      key={`${content}-${formats}-${breaks}`}
      aria-label="Description"
      placeholder="Enter text..."
      value={value}
      onChange={setValue}
      variant={variant}
      formats={formats === 'all' ? undefined : SOME_FORMATS}
      breaks={breaks}
      invalid={field ? undefined : invalid}
      aria-invalid={field ? undefined : invalid}
      disabled={disabled}
      toolbarEnd={
        toolbarEnd ? (
          <button
            type="button"
            disabled={disabled}
            className={markdownEditorStyles.toolbarButton}
            aria-label="Edit translations"
            title="Edit translations"
          >
            <Translate />
          </button>
        ) : undefined
      }
    />
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments
          name="content"
          options={['empty', 'formatted'] as const}
          value={content}
          onChange={setContent}
        />
        <Segments name="variant" options={['outline', 'soft'] as const} value={variant} onChange={setVariant} />
        <Segments name="formats" options={['all', 'bold, link'] as const} value={formats} onChange={setFormats} />
        <DemoControlBoolean name="breaks" value={breaks} onChange={setBreaks} />
        <DemoControlBoolean name="field" value={field} onChange={setField} />
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="toolbarEnd" value={toolbarEnd} onChange={setToolbarEnd} />
      </div>
      <div data-demo-stage className="py-10 w-full flex justify-center">
        <div className="w-full min-w-0 max-w-[500px]">
          {field ? (
            <Field
              label="Description"
              description="Supports bold, italic, lists, and links."
              errorMessage={invalid ? 'This field is required.' : undefined}
            >
              {editor}
            </Field>
          ) : (
            editor
          )}
          <p className="text-secondary text-sm mt-2 break-all">
            Markdown: <code>{JSON.stringify(value)}</code>
          </p>
        </div>
      </div>
    </>
  );
}
