import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { MarkdownEditorBaseDemo, MarkdownEditorWithFieldDemo } from '../../components/docs/MarkdownEditorDemos';
import { FileUploadDemo } from '../../components/docs/FileUploadDemos';
import { VueDemo, type VueDemoControl } from '../../components/docs/vue/VueDemo';
import { VueFileUploadDemo } from '../../components/docs/vue/VueFileUploadDemos';
import { flushVue } from './harness';

vi.mock('../../components/docs/VuePreview', async () => ({
  VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));
// Direct demo mounts have no PreviewEmbed host. Non-scoped parity CSS must
// not confuse its Root filter with FileUpload.Root.
vi.mock('../../components/docs/PreviewEmbed.module.css', () => ({ default: { Root: 'PreviewEmbedRoot' } }));
vi.mock('@plexui/ui/components/MarkdownEditor', async () => import('../../packages/ui/src/components/MarkdownEditor'));
vi.mock('@plexui/vue/components/MarkdownEditor', async () => import('../../packages/vue/src/components/MarkdownEditor'));
vi.mock('@plexui/ui/components/FileUpload', async () => import('../../packages/ui/src/components/FileUpload'));
vi.mock('@plexui/vue/components/FileUpload', async () => import('../../packages/vue/src/components/FileUpload'));

function example(page: string, name: string) {
  const mdx = readFileSync(`content/vue/components/${page}.mdx`, 'utf8');
  const read = (key: string): unknown => {
    const marker = `export const ${key} = `;
    const start = mdx.indexOf(marker);
    if (start < 0) throw new Error(`Missing ${key}`);
    const rest = mdx.slice(start + marker.length);
    const boundary = rest.search(/\nexport const |\n<UsageBlock>/);
    return new Function(`return ${(boundary < 0 ? rest : rest.slice(0, boundary)).trim()}`)();
  };
  const template = read(name);
  const rawControls = read(`${name}Controls`);
  if (typeof template !== 'string' || !Array.isArray(rawControls)) throw new Error('Invalid demo');
  const controls: VueDemoControl[] = rawControls.map((control: unknown) => {
    if (!control || typeof control !== 'object' || !('name' in control) || typeof control.name !== 'string' || !('type' in control) || control.type !== 'boolean' || !('default' in control) || typeof control.default !== 'boolean') {
      throw new Error('Invalid boolean demo control');
    }
    return { name: control.name, type: 'boolean', default: control.default };
  });
  return { template, controls };
}

const editorExample = example('markdown-editor', 'base');
const fieldExample = example('markdown-editor', 'withField');
const uploadExample = example('file-upload', 'overview');
const interact = async (action: () => void) => {
  await act(async () => { action(); await flushVue(); });
};
const editorOf = (element: HTMLElement): Editor => {
  if (!('editor' in element) || !(element.editor instanceof Editor)) throw new Error('Missing Tiptap editor');
  return element.editor;
};
const describedText = (element: Element) => (element.getAttribute('aria-describedby') ?? '')
  .split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent);

// ProseMirror asks for layout while moving its selection. jsdom has none;
// use the same empty geometry for both frameworks, as the primitive suite does.
const originalGeometry = {
  getClientRects: Range.prototype.getClientRects,
  getBoundingClientRect: Range.prototype.getBoundingClientRect,
  elementFromPoint: document.elementFromPoint,
};
beforeAll(() => {
  Range.prototype.getClientRects = () => Object.assign([], { item: () => null });
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  document.elementFromPoint = () => null;
});
afterAll(() => {
  Range.prototype.getClientRects = originalGeometry.getClientRects;
  Range.prototype.getBoundingClientRect = originalGeometry.getBoundingClientRect;
  document.elementFromPoint = originalGeometry.elementFromPoint;
});

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe.each(['React', 'Vue'])('%s editor and upload demo controls', (framework) => {
  test('editor keeps content, selection and the mounted instance through invalid and disabled', async () => {
    const view = render(framework === 'React' ? <MarkdownEditorBaseDemo /> : <VueDemo {...editorExample} state={{ value: '' }} />);
    const page = within(view.container);
    const input = await page.findByRole('textbox', { name: 'Markdown content' });
    const editor = editorOf(input);
    await interact(() => {
      editor.commands.insertContent('Saved content');
      editor.commands.setTextSelection({ from: 2, to: 6 });
    });
    for (const name of ['invalid', 'disabled', 'disabled', 'invalid']) {
      await interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
      expect(page.getByRole('textbox', { name: 'Markdown content' })).toBe(input);
      expect(editorOf(input)).toBe(editor);
      expect(editor.getText()).toBe('Saved content');
      expect([editor.state.selection.from, editor.state.selection.to]).toEqual([2, 6]);
      expect(input.getAttribute('contenteditable')).toBe(page.getByRole('switch', { name: 'disabled' }).getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      expect(input.getAttribute('aria-invalid') === 'true').toBe(page.getByRole('switch', { name: 'invalid' }).getAttribute('aria-checked') === 'true');
    }
    await interact(() => editor.commands.insertContent('EDIT'));
    expect(editor.getText()).toBe('SEDIT content');
  });

  test('Field error is linked and toggles independently of the existing markdown', async () => {
    const view = render(framework === 'React' ? <MarkdownEditorWithFieldDemo /> : <VueDemo {...fieldExample} state={{ value: '' }} />);
    const page = within(view.container);
    const input = await page.findByRole('textbox', { name: 'Description' });
    const editor = editorOf(input);
    await interact(() => editor.commands.insertContent('Kept description'));
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'errorMessage' })));
    expect(editor.getText()).toBe('Kept description');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(describedText(input)).toContain('This field is required.');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'errorMessage' })));
    expect(page.getByRole('textbox', { name: 'Description' })).toBe(input);
    expect(editor.getText()).toBe('Kept description');
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    expect(describedText(input)).not.toContain('This field is required.');
    expect(page.queryByText('This field is required.')).toBeNull();
  });

  test('file states retain real selections and keep controls outside the preview stage', async () => {
    const view = render(framework === 'React' ? <FileUploadDemo /> : <VueFileUploadDemo {...uploadExample} />);
    await interact(() => {});
    const page = within(view.container);
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('Missing file input');
    const selected = new File(['document'], 'selected-document.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: Object.assign([selected], { item: (index: number) => index === 0 ? selected : null }), configurable: true });
    await interact(() => fireEvent.change(input));
    const remove = page.getByRole<HTMLButtonElement>('button', { name: 'Remove selected-document.pdf' });
    const upload = page.getByRole<HTMLButtonElement>('button', { name: 'Upload file', exact: true });
    const errorControl = page.getByRole('switch', { name: 'errorMessage' });
    expect(errorControl.closest('[data-demo-stage]')).toBeNull();
    expect(view.container.querySelectorAll('[data-demo-stage]').length).toBe(1);
    await interact(() => fireEvent.click(errorControl));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(describedText(input)).toContain('Please upload at least 2 documents.');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    expect(input.disabled).toBe(true);
    expect(upload.disabled).toBe(true);
    expect(remove.disabled).toBe(true);
    await interact(() => fireEvent.click(remove));
    expect(page.getByRole('button', { name: 'Remove selected-document.pdf' })).toBe(remove);
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    await interact(() => fireEvent.click(errorControl));
    expect(view.container.querySelector('input[type="file"]')).toBe(input);
    expect(remove.disabled).toBe(false);
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    await interact(() => fireEvent.click(remove));
    expect(page.queryByRole('button', { name: 'Remove selected-document.pdf' })).toBeNull();
    expect(upload.disabled).toBe(false);
  });
});
