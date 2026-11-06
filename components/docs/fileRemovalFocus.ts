/** Preserve the keyboard position when a standalone file-card demo removes a row. */
export function removeFileWithFocus(root: HTMLElement | null, index: number, remove: () => void) {
  const buttons = Array.from(root?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
  const source = buttons[index];
  const target = buttons[index + 1] ?? buttons[index - 1] ?? root?.querySelector('[data-file-removal-status]');
  const doc = source?.ownerDocument;
  const restore = source !== undefined && doc?.activeElement === source;
  remove();
  if (!restore || !source || !doc || !(target instanceof HTMLElement)) return;
  queueMicrotask(() => {
    if (!source.isConnected && target.isConnected && (doc.activeElement === doc.body || doc.activeElement === source)) {
      target.focus({ preventScroll: true });
    }
  });
}

/** Plain JavaScript for the copyable React and Vue examples. */
export const fileRemovalFocusCode = `function removeFileWithFocus(root, index, remove) {
  const buttons = Array.from(root?.querySelectorAll('button:not(:disabled)') ?? []);
  const source = buttons[index];
  const target = buttons[index + 1] ?? buttons[index - 1] ?? root?.querySelector('[data-file-removal-status]');
  const doc = source?.ownerDocument;
  const restore = source !== undefined && doc?.activeElement === source;
  remove();
  if (!restore || !source || !doc || !(target instanceof HTMLElement)) return;
  queueMicrotask(() => {
    if (!source.isConnected && target.isConnected && (doc.activeElement === doc.body || doc.activeElement === source)) {
      target.focus({ preventScroll: true });
    }
  });
}`;
