'use client';

import { useEffect } from 'react';

/**
 * Sends a link to a section that moved to another page on to that page. A
 * server redirect never sees the hash, so the page the redirect lands on
 * forwards the anchors it no longer has.
 */
export function HashForward({ to, ids }: { to: string; ids: string[] }) {
  useEffect(() => {
    let id = '';
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    if (ids.includes(id) && !document.getElementById(id)) window.location.replace(`${to}#${id}`);
  }, [to, ids]);
  return null;
}
