'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button, NavigationButton, type ButtonProps } from '@plexui/ui/components/Button';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Disclosure } from '@plexui/ui/components/Icon';
import { Menu } from '@plexui/ui/components/Menu';
import { Page } from '@plexui/ui/components/Page';
import { DropdownIcon } from '@plexui/ui/components/SelectControl';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { TransitionGroup } from '@plexui/ui/components/Transition';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { DemoBackButton } from './DemoBackButton';
import { usePhoneViewport, usePreviewEmbed } from './PreviewEmbed';
import { controlsTableStyle } from './ButtonDemos';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';
import authStyles from './AuthFormStage.module.css';
import { checklistSettings, checklistSummary, initialChecklistSelection, type SettingId } from './settingsChecklistData';
import { hideExitingSettingsScreen, settingsNavigationTiming, showEnteringSettingsScreen } from './settingsChecklistMotion';
import { useDialogStagePresence } from './useDialogStagePresence';
import s from './SettingsChecklistDemo.module.css';
import motionStyles from './DemoNavigation.module.css';

/** A settings row: its label, the current choice, and a trailing glyph. As a Menu trigger it receives
 * the trigger's props and ref, so they reach the button. */
function SettingRow({ id, label, summary, trailing, ...props }: { id: SettingId; label: string; summary: string; trailing: ReactNode }
  & Omit<ButtonProps, 'id' | 'color' | 'children'>) {
  return (
    <Button {...props} type="button" color="secondary" variant="ghost" block
      className={s.RowButton} data-setting={id} aria-label={`${label}: ${summary}`}>
      <span className={s.RowContent}>
        <span className={s.RowText}>
          <span className={s.RowLabel}>{label}</span>
          <span className={s.RowValue}>{summary}</span>
        </span>
        {trailing}
      </span>
    </Button>
  );
}

/** A picker saved immediately: on a phone a row opens its own screen and Back returns to settings;
 * on desktop the row opens a menu of checkboxes, so no screen needs a top bar. */
export function SettingsChecklistDemo() {
  const presentation = useScreenPresentation();
  const phonePreview = usePreviewEmbed() !== null;
  const phoneViewport = usePhoneViewport();
  const wide = useBreakpoint('md');
  const phone = phoneViewport || !wide;
  const hiddenPhoneHost = phoneViewport && !phonePreview;
  const { open: dialogOpen, present: dialogPresent, onOpenAutoFocus: onDialogScopeOpen, onCloseAutoFocus: onDialogScopeClose, pageRef: bindPage } = useDialogStagePresence(presentation.dialog, !hiddenPhoneHost);
  const [active, setActive] = useState<SettingId | null>(null);
  const [navigation, setNavigation] = useState({ step: 0, direction: 'forward', scrollOffset: 0 });
  const [selection, setSelection] = useState(initialChecklistSelection);
  const contentRoot = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLElement | null>(null);
  const previous = useRef<SettingId | null>(null);
  const savedScroll = useRef(0);
  // Only a phone navigates into a setting.
  const setting = phone ? checklistSettings.find((item) => item.id === active) : undefined;

  // Dialog's transition can commit this subtree after its parent has updated.
  // Restore navigation only when the destination content is actually mounted.
  const bindContentRoot = useCallback((node: HTMLDivElement | null) => {
    // An outgoing screen unmounts after the incoming screen has taken ownership.
    if (!node) return;
    contentRoot.current = node;
    if (previous.current === active) return;
    const content = node.closest<HTMLElement>('[data-settings-content]');
    if (active) {
      if (content) content.scrollTop = 0;
      heading.current?.focus({ preventScroll: true });
    } else if (previous.current) {
      if (content) content.scrollTop = savedScroll.current;
      node.querySelector<HTMLButtonElement>(`[data-setting="${previous.current}"]`)?.focus({ preventScroll: true });
    }
    previous.current = active;
  }, [active]);

  const open = (id: SettingId) => {
    savedScroll.current = contentRoot.current?.closest<HTMLElement>('[data-settings-content]')?.scrollTop ?? 0;
    setNavigation((current) => ({ step: current.step + 1, direction: 'forward', scrollOffset: -savedScroll.current }));
    setActive(id);
  };

  const returnToSettings = () => {
    const scroll = contentRoot.current?.closest<HTMLElement>('[data-settings-content]')?.scrollTop ?? 0;
    setNavigation((current) => ({ step: current.step + 1, direction: 'back', scrollOffset: savedScroll.current - scroll }));
    setActive(null);
  };

  const title = setting?.label ?? 'Notifications';
  const desktopRoot = !phone && !presentation.dialog;
  const toggle = (id: SettingId, value: string, checked: boolean) => setSelection((current) => ({
    ...current,
    [id]: checked ? [...current[id], value] : current[id].filter((item) => item !== value),
  }));
  const transition = { ...settingsNavigationTiming, overlay: true, onExit: hideExitingSettingsScreen, onEnter: showEnteringSettingsScreen };
  // Both screens of a Page show Back, so it stays in place; in a Dialog the root's Close and Back change places.
  const back = <span className={s.BackViewport} data-demo-navigation-direction={navigation.direction} data-settings-direction={navigation.direction} data-demo-navigation-same=""><TransitionGroup {...transition} className={motionStyles.Bar}>
    <DemoBackButton key={navigation.step} onBack={setting ? returnToSettings : undefined} label={setting ? 'Back to notifications' : undefined} />
  </TransitionGroup></span>;
  const titleContent = <>
    <span className="sr-only">{title}</span>
    <span aria-hidden="true" className={`${s.BarViewport} ${motionStyles.BarViewport}`} data-demo-navigation-direction={navigation.direction} data-settings-direction={navigation.direction}>
      <TransitionGroup {...transition} className={motionStyles.Bar}><span key={navigation.step}>{title}</span></TransitionGroup>
    </span>
  </>;
  const dialogAction = <span className={s.BackViewport} data-demo-navigation-direction={navigation.direction} data-settings-direction={navigation.direction}><TransitionGroup {...transition} className={motionStyles.Bar}>
    <span key={navigation.step}>
      {setting ? <DemoBackButton onBack={returnToSettings} label="Back to notifications" /> : (
        <Dialog.Close><NavigationButton action="close" aria-label="Close dialog" /></Dialog.Close>
      )}
    </span>
  </TransitionGroup></span>;
  const content = <div className={motionStyles.Viewport} data-demo-navigation-direction={navigation.direction} data-settings-direction={navigation.direction}>
    <TransitionGroup {...transition} className={`${s.ContentTransition} ${motionStyles.Content}`} transitionId="settings-content"
      style={{ '--settings-exit-scroll-offset': `${navigation.scrollOffset}px` } as React.CSSProperties}>
      <div key={navigation.step} ref={bindContentRoot} data-settings-screen={active ?? 'root'} data-settings-step={navigation.step}>
          {setting ? (
            <FieldGroup key={setting.id} aria-label={setting.label} footer="Choose the updates you want to receive.">
              {setting.options.map((option) => (
                <Field key={option.value} row label={option.label}>
                  <Checkbox variant="ghost" checked={selection[setting.id].includes(option.value)}
                    onCheckedChange={(checked) => toggle(setting.id, option.value, checked === true)} />
                </Field>
              ))}
            </FieldGroup>
          ) : (
            <FieldGroup title={desktopRoot ? title : undefined} aria-label={desktopRoot ? undefined : "Notification settings"}>
              {checklistSettings.map((item) => {
                const summary = checklistSummary(item, selection[item.id]);
                return (
                  <div key={item.id} data-row>
                    {phone ? (
                      <SettingRow id={item.id} label={item.label} summary={summary} disabled={item.disabled}
                        trailing={<Disclosure className={s.Disclosure} data-no-autosize />} onClick={() => open(item.id)} />
                    ) : (
                      <Menu>
                        <Menu.Trigger>
                          <SettingRow id={item.id} label={item.label} summary={summary} disabled={item.disabled}
                            trailing={<DropdownIcon iconType="dropdown" />} />
                        </Menu.Trigger>
                        <Menu.Content align="end">
                          {item.options.map((option) => (
                            <Menu.CheckboxItem key={option.value} checked={selection[item.id].includes(option.value)}
                              onCheckedChange={(checked) => toggle(item.id, option.value, checked === true)}
                              onSelect={(event) => event.preventDefault()}>
                              {option.label}
                            </Menu.CheckboxItem>
                          ))}
                        </Menu.Content>
                      </Menu>
                    )}
                  </div>
                );
              })}
            </FieldGroup>
          )}
      </div>
    </TransitionGroup>
  </div>;

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
      <div data-demo-stage className={s.Stage}>
        {dialogPresent ? (
          <Dialog open={dialogOpen} onOpenChange={phonePreview ? undefined : presentation.setDialog}>
            <Dialog.Content mobileVariant="sheet" surface={presentation.surface} showClose={!phone}
              className={`${s.Dialog} ${authStyles.Sheet}`}
              onCloseAutoFocus={onDialogScopeClose}
              onOpenAutoFocus={(event) => { onDialogScopeOpen(event); event.preventDefault(); if (!phonePreview) heading.current?.focus({ preventScroll: true }); }}>
              {phone && <Toolbar>
                <Toolbar.Leading>{dialogAction}</Toolbar.Leading>
                <Toolbar.Title>{titleContent}</Toolbar.Title>
              </Toolbar>}
              <Dialog.Header>
                <Dialog.Title><span ref={(node) => { if (node) heading.current = node; }} data-settings-title tabIndex={-1}>{title}</span></Dialog.Title>
                <Dialog.Description className="sr-only">Choose your notification preferences.</Dialog.Description>
              </Dialog.Header>
              <Dialog.Body className={s.DialogBody}><div data-settings-content className={s.DialogContent}>{content}</div></Dialog.Body>
            </Dialog.Content>
          </Dialog>
        ) : (
          <Page ref={bindPage} tabIndex={-1} role="region" aria-label={title} surface={presentation.surface} className={s.Screen} data-settings-root={desktopRoot ? "" : undefined} data-settings-direction={navigation.direction}>
            {phone && <Toolbar>
              <Toolbar.Leading>{back}</Toolbar.Leading>
              <Toolbar.Title ref={(node) => { if (node) heading.current = node; }} data-settings-title tabIndex={-1}>{titleContent}</Toolbar.Title>
            </Toolbar>}
            <Page.Content data-settings-content>{content}</Page.Content>
          </Page>
        )}
      </div>
    </>
  );
}
