'use client';

import type { ReactNode } from 'react';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { usePhoneViewport } from './PreviewEmbed';

// A compact slice of a grouped settings screen, at the phone's actual width. It fills the preview's height,
// so a short example keeps the grouped surface from edge to edge.
export const phoneRowsClassName = 'flex w-full grow flex-col gap-6 bg-[var(--mobile-surface-grouped-primary)] px-4 py-6 [--field-group-background:var(--mobile-surface-grouped-secondary)]';

/** True in a Phone preview, in the page's controls for it, and on a real narrow viewport. */
export function usePhoneRows() {
  const preview = usePhoneViewport();
  const wide = useBreakpoint('md');
  return preview || !wide;
}

/** The grouped surface and 16px screen gutters around phone rows; pair with `PhoneRowsPreview` on the preview. */
export function PhoneRows({ children }: { children: ReactNode }) {
  return <div data-phone-rows className={phoneRowsClassName}>{children}</div>;
}
