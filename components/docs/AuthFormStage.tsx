'use client';

import { useRef, type ReactNode } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { X } from '@plexui/ui/components/Icon';
import { Page } from '@plexui/ui/components/Page';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { usePreviewEmbed } from './PreviewEmbed';
import s from './AuthFormStage.module.css';

/** A form screen reserves the mobile toolbar; a sheet supplies its own toolbar. */
export function AuthFormStage({
  title,
  children,
  dialog = false,
  onDialogChange,
}: {
  title: string;
  children: ReactNode;
  dialog?: boolean;
  onDialogChange?: (open: boolean) => void;
}) {
  const wide = useBreakpoint('md');
  const phonePreview = usePreviewEmbed() !== null;
  const headingRef = useRef<HTMLDivElement>(null);

  return (
    <div data-demo-stage className={s.Stage}>
      {dialog ? (
        !wide ? (
          <Dialog open onOpenChange={phonePreview ? undefined : onDialogChange}>
            <Dialog.Content
              mobileVariant="sheet"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                headingRef.current?.focus();
              }}
            >
              <Dialog.Header>
                <div ref={headingRef} tabIndex={-1}>
                  <Dialog.Title className="sr-only">{title}</Dialog.Title>
                </div>
                <Dialog.Description className="sr-only">Review and submit this form.</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <div className={s.Form}>{children}</div>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog>
        ) : (
          <div className={s.DesktopOverlay}>
            <div className={s.DesktopPanel}>
              <div className={s.DesktopToolbar}>
                <Button color="secondary" variant="ghost" size="lg" uniform aria-label="Close" onClick={() => onDialogChange?.(false)}>
                  <X />
                </Button>
              </div>
              <div className={s.DesktopBody}>{children}</div>
            </div>
          </div>
        )
      ) : (
        <Page className={s.Screen}>
          <Page.Header className={s.Header} aria-hidden="true" divider={false}>
            <Page.Bar />
          </Page.Header>
          <Page.Content className={s.Content}>
            <div className={s.Form}>{children}</div>
          </Page.Content>
        </Page>
      )}
    </div>
  );
}
