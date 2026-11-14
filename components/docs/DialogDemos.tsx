'use client';

import { useRef, useState } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Input } from '@plexui/ui/components/Input';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { usePhoneRows } from './PhoneRows';
import { usePhoneViewport, usePreviewEmbed } from './PreviewEmbed';
import type { BarBackground } from '@plexui/ui/components/Toolbar';
import { BarBackgroundControls } from './ToolbarDemos';
import { SetupChoicesSheet } from './SetupChoicesSheet';
import setupStyles from './SetupChoicesSheet.module.css';
import type { SetupChoicesLayout } from './setupChoicesData';
import { ViewOptionsSheetDemo } from './ViewOptionsSheet';

export function DialogViewOptionsDemo() {
  const phonePreview = usePreviewEmbed() !== null;
  return <ViewOptionsSheetDemo initialOpen={phonePreview} />;
}

const SETUP_LAYOUTS = ['grouped', 'separate'] as const satisfies readonly SetupChoicesLayout[];

export function DialogSetupChoicesDemo() {
  const phonePreview = usePreviewEmbed() !== null;
  const [open, setOpen] = useState(phonePreview);
  const [layout, setLayout] = useState<SetupChoicesLayout>('grouped');
  const [subtitles, setSubtitles] = useState(false);
  const [status, setStatus] = useState('');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="layout">
          <SegmentedControl<SetupChoicesLayout> value={layout} onChange={setLayout} aria-label="Layout" size="xs">
            {SETUP_LAYOUTS.map((value) => <SegmentedControl.Option key={value} value={value}>{value}</SegmentedControl.Option>)}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="subtitles" value={subtitles} onChange={setSubtitles} />
      </div>
      <div data-demo-stage className={setupStyles.Stage}>
        <SetupChoicesSheet open={phonePreview || open} onOpenChange={setOpen} layout={layout} subtitles={subtitles}
          onAdd={(method) => setStatus(`${method.title} added in this preview.`)} />
        <p role="status" className={setupStyles.Status}>{status}</p>
      </div>
    </>
  );
}

function useDialogDemoState() {
  const phonePreview = usePreviewEmbed() !== null;
  const [open, setOpen] = useState(phonePreview);
  return [phonePreview || open, setOpen, phonePreview] as const;
}

const ALERT_ACTIONS = ['1', '2', '3'] as const;
type AlertActions = (typeof ALERT_ACTIONS)[number];

/** What the alert says for each kind: an alert's title, its message and the label of its main action. */
export function alertText(field: boolean, actions: AlertActions, destructive: boolean) {
  if (field) return { title: 'Rename document', message: 'Enter a new name for this document.', action: 'Rename' };
  if (actions === '1') return { title: 'Unable to save', message: 'Check your connection and try again.', action: 'OK' };
  if (destructive) return { title: 'Delete document?', message: 'This document will be deleted. You can’t undo this.', action: 'Delete' };
  return { title: 'Save changes?', message: 'Do you want to save the changes you made to this document?', action: 'Save' };
}

/**
 * The alert of iOS 27 with every setting (owner 12.11: «какие настройки должны быть согласно iOS 27 фигмы и xcode?»):
 * one, two or three actions (Xcode 27.2: alert-1, alert-2, alert-3), the main one preferred, plain or destructive
 * (kit Alerts _Buttons: Default, None, Destructive), with or without a message (alert-title), a text field
 * (alert-field), and two actions side by side or stacked (kit Alert: Button Layout).
 */
export function DialogOverviewDemo() {
  const [open, setOpen, phonePreview] = useDialogDemoState();
  const heading = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const phone = usePhoneRows();
  const [actions, setActions] = useState<AlertActions>('2');
  const [destructiveValue, setDestructive] = useState(false);
  const [preferredValue, setPreferred] = useState(true);
  const [message, setMessage] = useState(true);
  const [fieldValue, setField] = useState(false);
  const [stackedValue, setStacked] = useState(false);
  const [name, setName] = useState('Untitled');
  // A setting shows only where it acts: a destructive action and a field stand with two actions, apart; a
  // preferred action is not destructive; two actions stack on a phone only.
  const destructive = actions === '2' && !fieldValue && destructiveValue;
  const field = actions === '2' && !destructive && fieldValue;
  const preferred = !destructive && preferredValue;
  const stacked = phone && actions === '2' && stackedValue;
  const text = alertText(field, actions, destructive);

  const main = (
    <Button color={destructive ? 'danger' : 'primary'} variant={destructive || preferred ? 'solid' : 'soft'}
      disabled={field && !name.trim()} onClick={() => setOpen(false)}>
      {text.action}
    </Button>
  );
  const cancel = (
    <Dialog.Close>
      <Button color="primary" variant="soft">Cancel</Button>
    </Dialog.Close>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="actions">
          <SegmentedControl<AlertActions> value={actions} onChange={setActions} aria-label="Actions" size="xs">
            {ALERT_ACTIONS.map((value) => <SegmentedControl.Option key={value} value={value}>{value}</SegmentedControl.Option>)}
          </SegmentedControl>
        </DemoControlRow>
        {actions === '2' && !fieldValue && <DemoControlBoolean name="destructive" value={destructiveValue} onChange={setDestructive} />}
        {!destructive && <DemoControlBoolean name="preferred" value={preferredValue} onChange={setPreferred} />}
        <DemoControlBoolean name="message" value={message} onChange={setMessage} />
        {actions === '2' && !destructive && <DemoControlBoolean name="field" value={fieldValue} onChange={setField} />}
        {actions === '2' && <DemoControlBoolean name="stacked" value={stackedValue} onChange={setStacked} phoneOnly />}
      </div>
      <div data-demo-stage className="py-10 flex justify-center">
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setName('Untitled'); }}>
          <Dialog.Trigger>
            <Button color="secondary" variant="outline">Open alert</Button>
          </Dialog.Trigger>
          <Dialog.Content mobileVariant="alert" onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (phonePreview) return;
            if (field) input.current?.select();
            else heading.current?.focus({ preventScroll: true });
          }}>
            <Dialog.Header>
              <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>{text.title}</Dialog.Title></div>
              {message && <Dialog.Description>{text.message}</Dialog.Description>}
            </Dialog.Header>
            {field && (
              <Dialog.Body>
                <Input ref={input} aria-label="Document name" variant="soft" size="3xl" pill value={name}
                  onChange={(event) => setName(event.target.value)} />
              </Dialog.Body>
            )}
            {/* Two actions stand side by side, Cancel first; three stack with Cancel last, as iOS sets them */}
            <Dialog.Footer mobileLayout={stacked ? 'stacked' : undefined}>
              {actions === '1' && main}
              {actions === '2' && <>{cancel}{main}</>}
              {actions === '3' && (
                <>
                  {main}
                  <Button color="danger" variant="soft" onClick={() => setOpen(false)}>Don’t Save</Button>
                  {cancel}
                </>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      </div>
    </>
  );
}

const TERMS = [
  'Accounts. You are responsible for the activity on your account and for keeping its password safe.',
  'Content. You keep the rights to what you upload; you give us the rights we need to run the service.',
  'Acceptable use. Do not use the service to break the law, to harm others or to probe its security.',
  'Payments. Paid plans renew until cancelled; you can cancel at any time from the billing page.',
  'Changes. We tell you about material changes to these terms at least 30 days before they apply.',
  'Termination. You can stop using the service at any time; we can suspend accounts that break these terms.',
  'Liability. The service is provided as is, to the extent the law allows.',
  'Contact. Questions about these terms go to the support address in your account settings.',
];

export function DialogBodyDemo() {
  const [open, setOpen, phonePreview] = useDialogDemoState();
  const heading = useRef<HTMLDivElement>(null);
  // The bars of a phone Sheet only: a desktop dialog keeps its own header and footer.
  const [top, setTop] = useState<BarBackground>('glass');
  const [bottom, setBottom] = useState<BarBackground>('soft');

  return (
    <BarBackgroundControls phoneOnly top={top} onTopChange={setTop} bottom={bottom} onBottomChange={setBottom}>
    <div data-demo-stage className="py-10 flex justify-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline">Review terms</Button>
        </Dialog.Trigger>
        <Dialog.Content mobileVariant="sheet" onOpenAutoFocus={(event) => { event.preventDefault(); if (!phonePreview) heading.current?.focus({ preventScroll: true }); }}>
          <Dialog.Header background={top}>
            <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>Terms of service</Dialog.Title></div>
          </Dialog.Header>
          <Dialog.Body>
            <div className="flex flex-col gap-4 text-sm text-secondary max-md:text-[length:var(--dialog-mobile-type-size)] max-md:leading-[var(--dialog-mobile-type-leading)]">
              {[...TERMS, ...TERMS].map((term, index) => (
                <p key={index}>{term}</p>
              ))}
            </div>
          </Dialog.Body>
          <Dialog.Footer background={bottom}>
            <Dialog.Close>
              <Button color="secondary" variant="soft">Decline</Button>
            </Dialog.Close>
            <Button color="primary" onClick={() => setOpen(false)}>Accept</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
    </BarBackgroundControls>
  );
}

const PLACEMENTS = ['center', 'top', 'bottom', 'start', 'end', 'fullscreen'] as const;

export function DialogPlacementDemo() {
  const [open, setOpen, phonePreview] = useDialogDemoState();
  const heading = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<(typeof PLACEMENTS)[number]>('end');
  const phoneViewport = usePhoneViewport();
  // An iOS sheet has no line under its title: on a phone the note is the footer of the group it explains.
  const phone = usePhoneRows();
  const placements = phoneViewport ? PLACEMENTS.filter((value) => value === 'bottom' || value === 'fullscreen') : PLACEMENTS;
  const activePlacement = placements.some((value) => value === placement) ? placement : 'bottom';

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="placement">
          <SegmentedControl<(typeof PLACEMENTS)[number]> value={activePlacement} onChange={setPlacement} aria-label="Placement" size="xs">
            {placements.map((value) => (
              <SegmentedControl.Option key={value} value={value}>
                {value}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="py-10 flex justify-center">
        <Dialog open={open} onOpenChange={setOpen}>
          <Dialog.Trigger>
            <Button color="secondary" variant="outline">Open filters</Button>
          </Dialog.Trigger>
          <Dialog.Content mobileVariant="sheet" surface="grouped" mobilePlacement={activePlacement === 'fullscreen' ? 'fullscreen' : 'bottom'} onOpenAutoFocus={(event) => { event.preventDefault(); if (!phonePreview) heading.current?.focus({ preventScroll: true }); }} placement={activePlacement} width={activePlacement === 'start' || activePlacement === 'end' ? 360 : 480}>
            <Dialog.Header>
              <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>Filters</Dialog.Title></div>
              <Dialog.Description className={phone ? 'sr-only' : undefined}>Narrow the list down.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <FieldGroup columns footer={phone ? 'Narrow the list down.' : undefined}>
                <Field row label="Status">
                  <Input placeholder="Any status" />
                </Field>
                <Field row label="Owner">
                  <Input placeholder="Anyone" />
                </Field>
                <Field row label="Created after">
                  <Input placeholder="YYYY-MM-DD" />
                </Field>
              </FieldGroup>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Close>
                <Button color="secondary" variant="soft">Clear filters</Button>
              </Dialog.Close>
              <Button color="primary" onClick={() => setOpen(false)}>Done</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      </div>
    </>
  );
}

// Plan 176: a sign-in that asks for an email and then a code, each step pushed in the same sheet. On a phone it is
// Apple Account's Add Email Address (IMG_5501): the text, a soft capsule field and Continue under it, and the second
// step's Back in the bar where Close was (owner 12.11: «поля десктопные»).
export function DialogStepsDemo() {
  const [open, setOpen] = useDialogDemoState();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [email, setEmail] = useState('');
  const go = (next: 'email' | 'code', to: 'forward' | 'back') => { setDirection(to); setStep(next); };
  const note = 'flex flex-col gap-4 text-sm text-secondary max-md:gap-5 max-md:text-[length:var(--dialog-mobile-type-size)] max-md:leading-[var(--dialog-mobile-type-leading)]';

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setStep('email'); setDirection('forward'); } }}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline">Sign in</Button>
        </Dialog.Trigger>
        <Dialog.Content mobileVariant="sheet" width={420}>
          <Dialog.Header>
            {step === 'code' && (
              <Dialog.HeaderAction side="leading">
                <NavigationButton action="back" variant="ghost" onClick={() => go('email', 'back')} />
              </Dialog.HeaderAction>
            )}
            <Dialog.Title>Sign in</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Dialog.Steps step={step} direction={direction}>
              {step === 'email' ? (
                <div className={note}>
                  <p>We send a code to this address.</p>
                  <Input aria-label="Email" type="email" autoComplete="email" placeholder="Email address" variant="soft" size="3xl" pill
                    value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
              ) : (
                <div className={note}>
                  <p>Enter the code we sent to {email || 'your email'}.</p>
                  <Input aria-label="Code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" variant="soft" size="3xl" pill />
                </div>
              )}
            </Dialog.Steps>
          </Dialog.Body>
          <Dialog.Footer>
            {step === 'email'
              ? <Button color="primary" onClick={() => go('code', 'forward')}>Continue</Button>
              : <Button color="primary" onClick={() => setOpen(false)}>Verify</Button>}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}

// Plan 176: a form with unsaved changes stays open on Escape, on a press outside and, on a phone, when its sheet is
// pulled down. On a phone it is a sheet as Photos' New Album (IMG_5454): Close discards, the bar's checkmark saves,
// the name is a row of a grouped list (owner 12.11: «нет такого в iOS»).
export function DialogKeepOpenDemo() {
  const [open, setOpen] = useDialogDemoState();
  const phone = usePhoneRows();
  const [name, setName] = useState('Mia');
  const [held, setHeld] = useState(false);
  const dirty = name !== 'Mia';
  const hold = (event: Event) => { if (dirty) { event.preventDefault(); setHeld(true); } };
  const how = phone ? 'Pulling it down or a tap above it closes it' : 'Escape or a press outside closes it';
  const note = held ? 'Save or discard your changes to close.' : `${how} until you change the name.`;

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setName('Mia'); setHeld(false); } }}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline">Edit profile</Button>
        </Dialog.Trigger>
        <Dialog.Content mobileVariant="sheet" surface="grouped" width={420} onEscapeKeyDown={hold} onInteractOutside={hold}>
          <Dialog.Header>
            <Dialog.Title>Edit profile</Dialog.Title>
            {/* On a phone the note stands under the field, as a list's footer */}
            <Dialog.Description className={phone ? 'sr-only' : undefined}>{note}</Dialog.Description>
            {phone && (
              <Dialog.HeaderAction>
                <NavigationButton action="confirm" aria-label="Save" onClick={() => setOpen(false)} />
              </Dialog.HeaderAction>
            )}
          </Dialog.Header>
          <Dialog.Body>
            <FieldGroup footer={phone ? note : undefined}>
              <Field row label="Name" hideLabel={phone}>
                <Input value={name} placeholder="Name" onChange={(event) => { setName(event.target.value); setHeld(false); }} />
              </Field>
            </FieldGroup>
          </Dialog.Body>
          {!phone && (
            <Dialog.Footer>
              <Dialog.Close>
                <Button color="primary" variant="soft">Discard</Button>
              </Dialog.Close>
              <Button color="primary" onClick={() => setOpen(false)}>Save</Button>
            </Dialog.Footer>
          )}
        </Dialog.Content>
      </Dialog>
    </div>
  );
}

// R11: a sheet with changes asks before it closes. On a phone the question stands at the bar's Close, as iOS 27
// presents a confirmation from the sheet's Close (measured on the 27.2 simulator); on a desktop it is an alert.
export function DialogConfirmCloseDemo() {
  const [open, setOpen] = useDialogDemoState();
  const phone = usePhoneRows();
  const [note, setNote] = useState('');
  const dirty = note.trim() !== '';

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setNote(''); }}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline">New note</Button>
        </Dialog.Trigger>
        <Dialog.Content
          mobileVariant="sheet"
          surface="grouped"
          width={420}
          confirmClose={dirty && { message: 'Are you sure you want to discard this new note?' }}
        >
          <Dialog.Header>
            <Dialog.Title>New Note</Dialog.Title>
            {phone && (
              <Dialog.HeaderAction>
                <NavigationButton action="confirm" aria-label="Save" disabled={!dirty} onClick={() => setOpen(false)} />
              </Dialog.HeaderAction>
            )}
          </Dialog.Header>
          <Dialog.Body>
            <FieldGroup footer="Type a note, then close: the sheet asks before it loses it.">
              <Field row label="Note" hideLabel={phone}>
                <Input value={note} placeholder="Note" onChange={(event) => setNote(event.target.value)} />
              </Field>
            </FieldGroup>
          </Dialog.Body>
          {!phone && (
            <Dialog.Footer>
              <Dialog.Close>
                <Button color="primary" variant="soft">Cancel</Button>
              </Dialog.Close>
              <Button color="primary" disabled={!dirty} onClick={() => setOpen(false)}>Save</Button>
            </Dialog.Footer>
          )}
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
