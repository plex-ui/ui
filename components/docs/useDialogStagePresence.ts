'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createDialogStageFocusReturn } from './dialogStageFocus';

/** Keep the sole form owner mounted through Dialog's real exit lifecycle. */
export function useDialogStagePresence(requestedOpen: boolean, enabled = true) {
  const open = requestedOpen && enabled;
  const [hasScope, setHasScope] = useState(false);
  const current = useRef({ open, enabled, mounted: false });
  const surface = useRef<EventTarget | null>(null);
  const [focusReturn] = useState(createDialogStageFocusReturn);

  // A disabled host must not retain a modal when it is enabled again.
  if (!enabled && hasScope) setHasScope(false);

  // Mounted means mounted: a change of open or enabled must not read as an unmount, or a Dialog
  // that leaves within the same commit reports its close while the owner seems gone and stays present.
  useLayoutEffect(() => {
    const state = current.current;
    state.mounted = true;
    return () => { state.mounted = false; };
  }, []);

  useLayoutEffect(() => {
    current.current.open = open;
    current.current.enabled = enabled;
    if (open || !enabled) focusReturn.clear();
    if (!enabled) surface.current = null;
  }, [open, enabled, focusReturn]);

  // Retain only a focus scope that actually mounted. An early close before
  // that event has no rendered surface and therefore no exit to wait for.
  const onOpenAutoFocus = useCallback((event: Event) => {
    surface.current = event.target;
    setHasScope(true);
  }, []);

  const onCloseAutoFocus = useCallback((event: Event) => {
    // A late callback from an interrupted exit must not dismiss a reopened owner.
    event.preventDefault();
    if (!current.current.mounted || current.current.open) return;
    if (surface.current && event.target !== surface.current) return;
    surface.current = null;
    if (current.current.enabled) focusReturn.prepare(event);
    else focusReturn.clear();
    setHasScope(false);
  }, [focusReturn]);

  return { open, present: enabled && (open || hasScope), onOpenAutoFocus, onCloseAutoFocus, pageRef: focusReturn.pageRef };
}
