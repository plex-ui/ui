'use client';

import type { ReactNode } from 'react';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { phoneRowsClassName } from './phoneRowsTemplate';
import { usePhoneViewport } from './PreviewEmbed';

export { phoneRowsClassName };

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

/** A demo's stage holding phone rows; the preview splits it from the demo's controls. */
export function PhoneRowsStage({ children }: { children: ReactNode }) {
  return (
    <div data-demo-stage className="w-full">
      <PhoneRows>{children}</PhoneRows>
    </div>
  );
}
