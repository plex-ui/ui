/** Focus may return to the replacement Page only after the modal scope detached. */
export function createDialogStageFocusReturn() {
  let pendingDocument: Document | null = null;

  const clear = () => { pendingDocument = null; };
  const isUnclaimed = (document: Document) => {
    const active = document.activeElement;
    return !active || active === document.body || !active.isConnected;
  };
  const prepare = (event: Event) => {
    const target = event.target;
    const document = target && 'ownerDocument' in target
      ? target.ownerDocument as Document | null
      : null;
    // In an iframe, an outer preview control can own focus in another document.
    pendingDocument = document?.hasFocus() && isUnclaimed(document) ? document : null;
  };
  const pageRef = (value: unknown) => {
    if (!pendingDocument || !value || typeof value !== 'object') return;
    // Vue's public component ref exposes $el; React supplies the element itself.
    const element = '$el' in value ? value.$el : value;
    if (!element || typeof element !== 'object' || !('nodeType' in element) || element.nodeType !== 1
      || !('ownerDocument' in element) || element.ownerDocument !== pendingDocument
      || !('focus' in element) || typeof element.focus !== 'function') return;
    const document = pendingDocument;
    pendingDocument = null;
    if (document.hasFocus() && isUnclaimed(document)) element.focus({ preventScroll: true });
  };

  return { clear, prepare, pageRef };
}
