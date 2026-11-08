'use client';

import { useRef, type ReactNode } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { X } from '@plexui/ui/components/Icon';
import { Page } from '@plexui/ui/components/Page';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { usePhoneViewport, usePreviewEmbed } from './PreviewEmbed';
import { DemoBackButton } from './DemoBackButton';
import { useDialogStagePresence } from './useDialogStagePresence';
import s from './AuthFormStage.module.css';
import { DemoNavigationView } from './DemoNavigation';
import type { DemoNavigation } from './demoNavigationMotion';

/** On a phone, a Toolbar holds Back or Close and a bottom Toolbar holds the action, in a Page and in a Sheet. */
export function AuthFormStage({
  title,
  children,
  footer,
  dialog = false,
  onDialogChange,
  keyboard,
  surface = 'grouped',
  onBack,
  backLabel,
  navigation,
}: {
  title: string;
  children: ReactNode;
  /** Pinned mobile action; desktop forms keep their inline action placement. */
  footer?: ReactNode;
  dialog?: boolean;
  onDialogChange?: (open: boolean) => void;
  /** Docs-only Phone simulator; native mobile still uses the system keyboard. */
  keyboard?: 'numeric';
  /** A flow chooses its mobile palette independently of its Page or Sheet layout. */
  surface?: 'plain' | 'grouped';
  /** A multi-step example may handle its own Back action in the Page toolbar. */
  onBack?: () => void;
  backLabel?: string;
  navigation?: DemoNavigation;
}) {
  const wide = useBreakpoint('md');
  const phonePreview = usePreviewEmbed() !== null;
  const phoneHost = usePhoneViewport() && !phonePreview;
  const headingRef = useRef<HTMLDivElement>(null);
  const { open: dialogOpen, present: dialogPresent, onOpenAutoFocus: onDialogScopeOpen, onCloseAutoFocus: onDialogScopeClose, pageRef: bindPage } = useDialogStagePresence(dialog, !phoneHost && !wide);
  const motion = !wide ? navigation : undefined;
  const back = <DemoBackButton onBack={onBack} label={backLabel} />;
  const formContent = motion ? <DemoNavigationView navigation={motion}><div className={s.Form}>{children}</div></DemoNavigationView> : children;
  // The title stays in the form; the bars carry only the way out and the action.
  const bar = (leading: ReactNode, control: 'back' | 'close') => (
    <Toolbar>
      <Toolbar.Leading>{motion ? <DemoNavigationView navigation={motion} part="bar" control={control}>{leading}</DemoNavigationView> : leading}</Toolbar.Leading>
    </Toolbar>
  );
  const close = <Dialog.Close><NavigationButton action="close" aria-label="Close dialog" /></Dialog.Close>;
  const phoneFooter = footer && <Toolbar placement="bottom"><Toolbar.Content fill className={s.PhoneFooter}>{footer}</Toolbar.Content></Toolbar>;

  return (
    <div data-demo-stage className={s.Stage}>
      {dialogPresent || (dialog && !phoneHost) ? (
        dialogPresent ? (
          <Dialog open={dialogOpen} onOpenChange={phonePreview ? undefined : onDialogChange}>
            <Dialog.Content
              mobileVariant="sheet"
              className={s.Sheet}
              surface={surface}
              // The top Toolbar holds Close or Back.
              showClose={false}
              onCloseAutoFocus={onDialogScopeClose}
              onOpenAutoFocus={(event) => { onDialogScopeOpen(event);
                event.preventDefault();
                if (!phonePreview) headingRef.current?.focus({ preventScroll: true });
              }}
            >
              {onBack ? bar(back, 'back') : bar(close, 'close')}
              <Dialog.Header>
                <div ref={headingRef} tabIndex={-1}>
                  <Dialog.Title className="sr-only">{title}</Dialog.Title>
                </div>
                <Dialog.Description className="sr-only">Review and submit this form.</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <div className={s.Form} data-preview-keyboard={keyboard}>{formContent}</div>
              </Dialog.Body>
              {phoneFooter}
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
        <Page ref={bindPage} tabIndex={-1} role="region" aria-label={title} surface={surface} className={s.Screen}>
          {bar(back, 'back')}
          <Page.Content className={s.Content}>
            <div className={s.Form} data-preview-keyboard={keyboard}>{formContent}</div>
          </Page.Content>
          {!wide && phoneFooter}
        </Page>
      )}
    </div>
  );
}
