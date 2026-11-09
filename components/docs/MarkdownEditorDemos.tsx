'use client';

import { useState } from 'react';
import { MarkdownEditor, markdownEditorStyles } from '@plexui/ui/components/MarkdownEditor';
import { Field } from '@plexui/ui/components/Field';
import { Translate } from '@plexui/ui/components/Icon';
import { controlsTableStyle, DemoControlBoolean } from './ButtonDemos';

const ALL_FORMATTING_MD = `This is regular text with **bold** and *italic* formatting.

Read our [Privacy Policy](https://example.com/privacy) and [Terms of Service](https://example.com/terms) for details.

1. First ordered item
2. Second ordered item
3. Third ordered item

- Unordered item one
- Unordered item two
- Unordered item three`;

export function MarkdownEditorBaseDemo() {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [disabled, setDisabled] = useState(false);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="py-10 w-full flex justify-center">
        <div className="w-full min-w-0 max-w-[500px]">
          <MarkdownEditor
            aria-label="Markdown content"
            placeholder="Enter text..."
            value={value}
            onChange={setValue}
            invalid={invalid}
            aria-invalid={invalid}
            disabled={disabled}
          />
        </div>
      </div>
    </>
  );
}

export function MarkdownEditorAllFormattingDemo() {
  return (
    <div className="w-full min-w-0 max-w-[500px]">
      <MarkdownEditor defaultValue={ALL_FORMATTING_MD} />
    </div>
  );
}

const FORMATS_MD = `Some **bold**, *italic* and a [link](https://example.com).

- A list item

Line one
Line two`;

export function MarkdownEditorFormatsDemo() {
  const [value, setValue] = useState(FORMATS_MD);

  return (
    <div className="w-full min-w-0 max-w-[500px]">
      <MarkdownEditor aria-label="Message" formats={['bold', 'link']} breaks value={value} onChange={setValue} />
      <p className="text-secondary text-sm mt-2 break-all">
        Markdown: <code>{JSON.stringify(value)}</code>
      </p>
    </div>
  );
}

export function MarkdownEditorWithFieldDemo() {
  const [value, setValue] = useState('');
  const [errorMessage, setErrorMessage] = useState(false);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="errorMessage" value={errorMessage} onChange={setErrorMessage} />
      </div>
      <div data-demo-stage className="py-10 w-full flex justify-center">
        <div className="w-full min-w-0 max-w-[500px]">
          <Field label="Description" description="Supports bold, italic, lists, and links."
            errorMessage={errorMessage ? 'This field is required.' : undefined}>
            <MarkdownEditor aria-label="Description" placeholder="Enter description..."
              value={value} onChange={setValue} />
          </Field>
        </div>
      </div>
    </>
  );
}

export function MarkdownEditorToolbarEndDemo() {
  return (
    <div className="w-full min-w-0 max-w-[500px]">
      <Field label="Text markdown">
        <MarkdownEditor
          placeholder="Enter text..."
          toolbarEnd={
            <button
              type="button"
              className={markdownEditorStyles.toolbarButton}
              aria-label="Edit translations"
              title="Edit translations"
            >
              <Translate />
            </button>
          }
        />
      </Field>
    </div>
  );
}

export function MarkdownEditorVariantsDemo() {
  return (
    <div className="flex flex-col gap-4 w-full min-w-0 max-w-[500px]">
      <Field label="Outline">
        <MarkdownEditor placeholder="Outline variant..." variant="outline" />
      </Field>
      <Field label="Soft">
        <MarkdownEditor placeholder="Soft variant..." variant="soft" />
      </Field>
    </div>
  );
}
