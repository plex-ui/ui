/** The Back controls in documentation examples return to the previous example. */
export function goToPreviousExample(from: Element | null | undefined): void {
  const current = from?.closest('[data-component-preview]');
  if (!current) return;
  const doc = current.ownerDocument;
  const examples = Array.from(doc.querySelectorAll('[data-component-preview]'));
  const index = examples.indexOf(current);
  const previous = index > 0 ? examples[index - 1] : current.closest('article')?.querySelector('h1');
  const reduced = doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  previous?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
}
