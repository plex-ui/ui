/** Docs-only input bridge. No input values ever leave the preview document. */
export type PreviewKeyboardKind = 'numeric' | 'text';
export type PreviewKeyboardState = { available: boolean; open: boolean; kind: PreviewKeyboardKind | null };

const characters = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  ' ', '-', '/', ':', ';', '(', ')', '$', '&', '@', '“', '.', ',', '?', '!', '‘', '[', ']', '{', '}', '#', '%', '^', '*', '+', '=', '_', '\\', '|', '~', '<', '>', '€', '£', '¥', '·',
] as const;
type PreviewKeyboardCharacter = typeof characters[number] | Uppercase<typeof characters[number]>;
export type PreviewKeyboardCommand = 'activate' | 'show' | 'hide' | 'Backspace' | 'Enter' | PreviewKeyboardCharacter;
const textKeys = new Set<string>(characters.flatMap((character) => [character, character.toUpperCase()]));
const textInputTypes = new Set(['text', 'search', 'email', 'url', 'tel', 'password']);
const blockingInputTypes = new Set([...textInputTypes, 'date', 'month', 'week', 'time', 'datetime-local', 'number']);

/** Touch hardware must keep its real OS keyboard, even in a wide docs viewport. */
export function canSimulatePreviewKeyboard(doc: Document): boolean {
  const view = doc.defaultView;
  return Boolean(view?.matchMedia?.('(hover: hover) and (pointer: fine)').matches) && (view?.navigator.maxTouchPoints ?? 0) === 0;
}

export function isPreviewKeyboardCommand(value: unknown): value is PreviewKeyboardCommand {
  return typeof value === 'string' && (['activate', 'show', 'hide', 'Backspace', 'Enter'].includes(value) || textKeys.has(value));
}

function inputKind(input: HTMLInputElement): PreviewKeyboardKind | null {
  if (!input.isConnected || input.matches(':disabled') || input.readOnly || input.closest('[inert], [aria-hidden="true"]')) return null;
  const marker = input.closest('[data-preview-keyboard]')?.getAttribute('data-preview-keyboard');
  if (marker === 'numeric' && input.inputMode === 'numeric') return 'numeric';
  return marker === 'text' && textInputTypes.has(input.type) ? 'text' : null;
}

/** Follow implicit submission: activate the form's first submitter, including a pinned CTA. */
function submitFromInput(input: HTMLInputElement) {
  const form = input.form;
  const view = input.ownerDocument.defaultView;
  if (!form || !view) return;
  const submitter = Array.from(input.ownerDocument.querySelectorAll('button, input')).find((element) =>
    (element instanceof view.HTMLButtonElement || element instanceof view.HTMLInputElement)
    && element.form === form && (element.type === 'submit' || element.type === 'image'));
  if (submitter instanceof view.HTMLElement) {
    if (!submitter.matches(':disabled')) submitter.click();
    return;
  }
  const blockers = Array.from(form.elements).filter((element) => element instanceof view.HTMLInputElement && blockingInputTypes.has(element.type));
  if (blockers.length <= 1) form.requestSubmit();
}

/** Native events let React and Vue keep ownership of value, validation and OTP focus. */
export function typePreviewKey(input: HTMLInputElement, key: string) {
  const view = input.ownerDocument.defaultView;
  if (!view || input.matches(':disabled') || input.readOnly || !input.isConnected) return;
  const keyboard = { key, bubbles: true, cancelable: true };
  try {
    if (!input.dispatchEvent(new view.KeyboardEvent('keydown', keyboard))) return;
    if (key === 'Enter') { submitFromInput(input); return; }
    const deleting = key === 'Backspace';
    const inputType = deleting ? 'deleteContentBackward' : 'insertText';
    if (!input.dispatchEvent(new view.InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType, data: deleting ? null : key }))) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const previous = Array.from(input.value.slice(0, start)).at(-1);
    const from = deleting && start === end ? start - (previous?.length ?? 0) : start;
    // Only OTP cells replace a filled character; a maxLength=1 text field keeps native limits.
    const replacingOTP = !deleting && inputKind(input) === 'numeric' && input.maxLength === 1;
    const next = replacingOTP ? key : input.value.slice(0, from) + (deleting ? '' : key) + input.value.slice(end);
    if (input.maxLength >= 0 && next.length > input.maxLength) return;
    const setter = Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, next);
    const caret = deleting ? from : replacingOTP ? key.length : from + key.length;
    // Email inputs expose no selection API; appending remains valid without throwing.
    if (input.selectionStart !== null) input.setSelectionRange(caret, caret);
    input.dispatchEvent(new view.InputEvent('input', { bubbles: true, inputType, data: deleting ? null : key }));
  } finally {
    input.dispatchEvent(new view.KeyboardEvent('keyup', keyboard));
  }
}

/** Only the explicitly activated iframe may focus a field; passive mounting never does. */
export function createPreviewKeyboardController(doc: Document, report: (state: PreviewKeyboardState) => void) {
  const view = doc.defaultView;
  let current: HTMLInputElement | null = null;
  let activated = false;
  let dismissed = false;
  let signature = '';
  const screen = () => canSimulatePreviewKeyboard(doc) && Boolean(doc.querySelector('[data-preview-presentation="screen"]'));
  const eligible = (node: Element | null): node is HTMLInputElement => Boolean(view && node instanceof view.HTMLInputElement && inputKind(node));
  const candidate = () => screen() ? Array.from(doc.querySelectorAll('input')).find(eligible) ?? null : null;
  const selected = () => current && eligible(current) ? current : candidate();
  const publish = () => {
    const input = screen() ? selected() : null;
    const kind = input ? inputKind(input) : null;
    const state: PreviewKeyboardState = { available: kind !== null, open: kind !== null && !dismissed, kind };
    const next = JSON.stringify(state);
    if (next === signature) return;
    signature = next;
    doc.documentElement.toggleAttribute('data-preview-keyboard-open', state.open);
    report(state);
  };
  const reveal = () => {
    if (!current || !activated || dismissed || !view) return;
    // Scroll only this iframe's own scroll containers, never its parent docs page.
    const bounds = current.getBoundingClientRect();
    for (let ancestor = current.parentElement; ancestor; ancestor = ancestor.parentElement) {
      if (ancestor.scrollHeight <= ancestor.clientHeight || !/(auto|scroll)/.test(view.getComputedStyle(ancestor).overflowY)) continue;
      const viewport = ancestor.getBoundingClientRect();
      if (bounds.bottom > viewport.bottom - 12) ancestor.scrollTop += bounds.bottom - viewport.bottom + 12;
      else if (bounds.top < viewport.top + 12) ancestor.scrollTop -= viewport.top - bounds.top + 12;
      break;
    }
  };
  const focus = () => {
    current = selected();
    current?.focus({ preventScroll: true });
    reveal();
  };
  const refresh = () => {
    if (!current || !eligible(current)) {
      current = candidate();
      if (activated && !dismissed) focus();
    }
    publish();
  };
  const onFocus = (event: FocusEvent) => {
    const target = event.target;
    if (view && target instanceof view.Element && eligible(target) && screen()) {
      current = target;
      activated = true;
      dismissed = false;
      publish();
      reveal();
    }
  };
  const onResize = () => reveal();
  doc.addEventListener('focusin', onFocus);
  view?.addEventListener('resize', onResize);
  const observer = view ? new view.MutationObserver(refresh) : null;
  observer?.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'readonly', 'type', 'inputmode', 'inert', 'aria-hidden', 'data-preview-keyboard', 'data-preview-presentation'] });
  refresh();
  return {
    command(command: PreviewKeyboardCommand) {
      if (!canSimulatePreviewKeyboard(doc)) return;
      // Hydration may mount the selected example after demoReady. Remember only
      // an explicit activation until its field exists, never a passive mount.
      if (command === 'activate') {
        activated = true;
        dismissed = false;
        focus();
        publish();
        return;
      }
      if (!screen()) return;
      if (command === 'hide') {
        dismissed = true;
        publish();
        return;
      }
      // A valid text command is still inappropriate for a numeric-only preview.
      const input = selected();
      if (input && inputKind(input) === 'numeric' && command !== 'show' && command !== 'Backspace' && command !== 'Enter' && !/^\d$/.test(command)) return;
      activated = true;
      dismissed = false;
      focus();
      publish();
      if (command !== 'show' && current) typePreviewKey(current, command);
    },
    destroy() {
      observer?.disconnect();
      doc.removeEventListener('focusin', onFocus);
      view?.removeEventListener('resize', onResize);
      doc.documentElement.removeAttribute('data-preview-keyboard-open');
    },
  };
}
