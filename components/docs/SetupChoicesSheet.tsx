'use client';

import { useId, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Disclosure, Email, Fingerprint, InfoCircle, Key, Phone, ShieldKey } from '@plexui/ui/components/Icon';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { aboutSignInMethods, setupIntro, setupMethods, type SetupChoicesLayout, type SetupMethod, type SetupMethodId } from './setupChoicesData';
import s from './SetupChoicesSheet.module.css';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
const methodIcons: Record<SetupMethodId, Icon> = { email: Email, phone: Phone, passkey: Fingerprint, 'security-key': Key };

/** The sheet shows the choices, or the step one of them opened. */
type Step = 'choices' | 'about' | SetupMethodId;

export type SetupChoicesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `grouped`: the rows share one group, as in iOS Set Up eSIM. `separate`: each row is its own rounded cell. */
  layout?: SetupChoicesLayout;
  /** A secondary line under each row title. */
  subtitles?: boolean;
  /** Called when a method step is confirmed; the sheet then closes. */
  onAdd: (method: SetupMethod) => void;
  trigger?: ReactNode;
};

/**
 * Rows that open the next step: a leading icon, a title, an optional subtitle and a disclosure chevron. The whole
 * row is one button. On a phone the step replaces the choices in the same sheet, with Back where Close was.
 */
export function SetupChoicesSheet({ open, onOpenChange, layout = 'grouped', subtitles = false, onAdd, trigger }: SetupChoicesSheetProps) {
  const wide = useBreakpoint('md');
  const [step, setStep] = useState<Step>('choices');
  const heading = useRef<HTMLDivElement>(null);
  // Back returns focus to the control that opened the step. The choices render it again, so it takes focus as it
  // attaches, before the removed Back button leaves focus nowhere.
  const returnTo = useRef<Step | null>(null);
  const focusOnReturn = (target: Step) => (element: HTMLElement | null) => {
    if (!element || returnTo.current !== target) return;
    returnTo.current = null;
    element.focus({ preventScroll: true });
  };
  // A step that opens moves focus to its heading, in the same commit that removes the row the reader pressed.
  const focusHeading = useRef(false);
  const attachHeading = (element: HTMLDivElement | null) => {
    heading.current = element;
    if (!element || !focusHeading.current) return;
    focusHeading.current = false;
    element.focus({ preventScroll: true });
  };
  const subtitleId = useId();

  const changeOpen = (next: boolean) => {
    if (next) setStep('choices');
    onOpenChange(next);
  };
  const go = (next: Step) => () => {
    focusHeading.current = true;
    setStep(next);
  };
  const back = () => {
    returnTo.current = step;
    setStep('choices');
  };

  const method = step === 'choices' || step === 'about' ? undefined : setupMethods.find((candidate) => candidate.id === step);
  const HeroIcon = method ? methodIcons[method.id] : step === 'about' ? InfoCircle : ShieldKey;
  const title = method?.title ?? (step === 'about' ? aboutSignInMethods.title : setupIntro.title);
  const close = <Dialog.Close><NavigationButton action="close" aria-label="Close dialog" /></Dialog.Close>;

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger>{trigger ?? <Button color="primary" pill>Add sign-in method</Button>}</Dialog.Trigger>
      <Dialog.Content mobileVariant="sheet" surface="plain" width={480} showClose={wide} className={s.Sheet}
        onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}>
        {/* A phone Sheet: Close on the choices, Back and Close on a step. The toolbar takes no space from 768px. */}
        <Toolbar>
          <Toolbar.Leading>{step === 'choices' ? close : <NavigationButton action="back" onClick={back} />}</Toolbar.Leading>
          {step !== 'choices' && <Toolbar.Trailing>{close}</Toolbar.Trailing>}
        </Toolbar>
        <Dialog.Body className={s.Body}>
          {/* The step's own heading leads the content, as in the native setup sheets: no title bar. */}
          <div className={s.Hero}>
            <HeroIcon className={s.HeroIcon} aria-hidden="true" />
            <div ref={attachHeading} tabIndex={-1} className={s.Heading}><Dialog.Title className={s.Title}>{title}</Dialog.Title></div>
            <Dialog.Description className={s.Description}>{method?.detail ?? (step === 'about' ? aboutSignInMethods.paragraphs[0] : setupIntro.description)}</Dialog.Description>
          </div>
          {step === 'choices' && (
            <div className={s.Choices}>
              <div><Button ref={focusOnReturn('about')} color="info" variant="ghost" className={s.Info} data-setup-step="about" onClick={go('about')}><InfoCircle />About sign-in methods</Button></div>
              <div className={s.Rows} data-layout={layout}>
                {(layout === 'grouped' ? [setupMethods] : setupMethods.map((item) => [item])).map((group) => (
                  <FieldGroup key={group.map((item) => item.id).join()} bodyClassName={s.RowsBody} aria-label={layout === 'grouped' ? 'Sign-in methods' : undefined}>
                    {group.map((item) => {
                      const RowIcon = methodIcons[item.id];
                      return (
                        <div key={item.id} data-row>
                          <Button ref={focusOnReturn(item.id)} block color="secondary" variant="ghost" className={s.Row} data-setup-step={item.id}
                            aria-describedby={subtitles ? `${subtitleId}-${item.id}` : undefined} onClick={go(item.id)}>
                            <span className={s.RowContent}>
                              <RowIcon className={s.RowIcon} aria-hidden="true" />
                              <span className={s.RowText}>
                                <span className={s.RowTitle}>{item.title}</span>
                                {/* The row is named by its title and described by its subtitle, so the subtitle is read once. */}
                                {subtitles && <span id={`${subtitleId}-${item.id}`} aria-hidden="true" className={s.RowSubtitle}>{item.subtitle}</span>}
                              </span>
                              <Disclosure className={s.Disclosure} aria-hidden="true" />
                            </span>
                          </Button>
                        </div>
                      );
                    })}
                  </FieldGroup>
                ))}
              </div>
            </div>
          )}
          {step === 'about' && aboutSignInMethods.paragraphs.slice(1).map((paragraph) => <p key={paragraph} className={s.Paragraph}>{paragraph}</p>)}
        </Dialog.Body>
        {(method || (step === 'about' && wide)) && (
          <Dialog.Footer>
            {wide && <Button color="secondary" variant="soft" onClick={back}>Back</Button>}
            {method && <Button color="primary" onClick={() => { onAdd(method); onOpenChange(false); }}>Add {method.title}</Button>}
          </Dialog.Footer>
        )}
      </Dialog.Content>
    </Dialog>
  );
}
