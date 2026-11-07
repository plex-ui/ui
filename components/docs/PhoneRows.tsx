'use client';

import { useState, type ReactNode } from 'react';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { phoneCalendarSecondRowStageClassName, phoneCalendarStageClassName, phoneCalendarTimeStageClassName, phoneRowsClassName } from './phoneRowsTemplate';
import { usePhoneViewport } from './PreviewEmbed';

export { phoneCalendarSecondRowStageClassName, phoneCalendarStageClassName, phoneCalendarTimeStageClassName, phoneRowsClassName };

/** True in a Phone preview, in the page's controls for it, and on a real narrow viewport. */
export function usePhoneRows() {
  const preview = usePhoneViewport();
  const wide = useBreakpoint('md');
  return preview || !wide;
}

/** A size or pill control is desktop-only: on a phone, where it is hidden, the demo shows its initial value. */
export function useDesktopOnlyState<T>(initial: T) {
  const phone = usePhoneRows();
  const [value, setValue] = useState(initial);
  return [value, setValue, phone ? initial : value] as const;
}

/** The grouped surface and 16px screen gutters around phone rows; pair with `PhoneRowsPreview` on the preview. */
export function PhoneRows({ children }: { children: ReactNode }) {
  return <div data-phone-rows className={phoneRowsClassName}>{children}</div>;
}

/** A demo's stage holding phone rows; the preview splits it from the demo's controls. */
export function PhoneRowsStage({ children, className = 'w-full' }: { children: ReactNode; className?: string }) {
  return (
    <div data-demo-stage className={className}>
      <PhoneRows>{children}</PhoneRows>
    </div>
  );
}
