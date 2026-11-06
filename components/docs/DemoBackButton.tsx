'use client';

import { NavigationButton } from '@plexui/ui/components/Button';
import { usePreviewEmbed } from './PreviewEmbed';
import { goToPreviousExample } from './previewNavigation';

/** The documentation supplies the destination for the example's Back control. */
export function DemoBackButton({ onBack, label = 'Back to previous example' }: { onBack?: () => void; label?: string }) {
  const previewKey = usePreviewEmbed();
  return (
    <NavigationButton action="back"
      aria-label={label}
      onClick={(event) => {
        if (onBack) { onBack(); return; }
        if (previewKey && window.parent !== window) window.parent.postMessage({ previewKey, previewBack: true }, window.location.origin);
        else goToPreviousExample(event.currentTarget);
      }} />
  );
}
