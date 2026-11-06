import { computed, onScopeDispose, ref, watch } from 'vue';
import { createDialogStageFocusReturn } from '../dialogStageFocus';

/** Vue counterpart: the Page replaces the modal only after its scope detached. */
export function useDialogStagePresence(requestedOpen: () => boolean, enabled: () => boolean = () => true) {
  const open = computed(() => requestedOpen() && enabled());
  const retained = ref(open.value);
  const focusReturn = createDialogStageFocusReturn();
  let disposed = false;
  let surface: EventTarget | null = null;

  watch([open, enabled], ([active, available]) => {
    if (active) retained.value = true;
    if (!available) { retained.value = false; surface = null; }
    if (active || !available) focusReturn.clear();
  }, { flush: 'sync' });
  onScopeDispose(() => { disposed = true; focusReturn.clear(); });

  // Closing before the first portal mount has no detached scope callback.
  watch(open, (active) => {
    if (!active && !surface) retained.value = false;
  }, { flush: 'post' });
  const onOpenAutoFocus = (event: Event) => { surface = event.target; };
  const onCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    if (disposed || open.value) return;
    if (surface && event.target !== surface) return;
    surface = null;
    if (enabled()) focusReturn.prepare(event);
    else focusReturn.clear();
    retained.value = false;
  };

  return {
    open,
    present: computed(() => enabled() && (open.value || retained.value)),
    onOpenAutoFocus,
    onCloseAutoFocus,
    pageRef: focusReturn.pageRef,
  };
}
