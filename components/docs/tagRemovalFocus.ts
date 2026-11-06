/** Keeps focus within the tag row after its controlled list removes a chip. */
export function removeTagWithFocus(event: { currentTarget: EventTarget | null }, remove: () => void) {
  const source = event.currentTarget;
  if (!(source instanceof HTMLButtonElement)) return;
  const row = source.closest('[data-tag-row]');
  const buttons = Array.from(row?.querySelectorAll('[data-tag-list] [data-badge-remove]') ?? []);
  const index = buttons.indexOf(source);
  const target = buttons[index + 1] ?? buttons[index - 1] ?? row?.querySelector('[data-tag-add]');
  const doc = source.ownerDocument;
  const restore = doc.activeElement === source;
  remove();
  if (!restore || !(target instanceof HTMLElement)) return;
  queueMicrotask(() => {
    if (!source.isConnected && target.isConnected && (doc.activeElement === doc.body || doc.activeElement === source)) {
      target.focus({ preventScroll: true });
    }
  });
}

/** Plain JavaScript for the copyable React and Vue examples. */
export const tagRemovalFocusCode = `function removeTagWithFocus(event, remove) {
  const source = event.currentTarget;
  if (!(source instanceof HTMLButtonElement)) return;
  const row = source.closest('[data-tag-row]');
  const buttons = Array.from(row?.querySelectorAll('[data-tag-list] [data-badge-remove]') ?? []);
  const index = buttons.indexOf(source);
  const target = buttons[index + 1] ?? buttons[index - 1] ?? row?.querySelector('[data-tag-add]');
  const doc = source.ownerDocument;
  const restore = doc.activeElement === source;
  remove();
  if (!restore || !(target instanceof HTMLElement)) return;
  queueMicrotask(() => {
    if (!source.isConnected && target.isConnected && (doc.activeElement === doc.body || doc.activeElement === source)) {
      target.focus({ preventScroll: true });
    }
  });
}`;
