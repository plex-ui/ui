'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Textarea } from '@plexui/ui/components/Textarea';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { Sparkles } from '@plexui/ui/components/Icon';
import { Popover, usePopoverController } from '@plexui/ui/components/Popover';
import confirmationStyles from './PopoverConfirmation.module.css';
import demoStyles from './PopoverDemos.module.css';
import { DemoControlBoolean, Segments, controlsTableStyle } from './ButtonDemos';
import { usePhoneRows } from './PhoneRows';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const ALIGNS = ['start', 'center', 'end'] as const;
const MIN_WIDTHS = ['300', 'auto'] as const;

/**
 * The Overview, one popover with every setting: what the page's examples once showed one by one (Sizing the popover,
 * Open on hover) are its settings (owner 11.11: «в первом примере можно сразу показать все со всеми настройками»);
 * the controller, the confirmation, the column configuration and nesting stay, each other content. `side` and `align`
 * place the panel beside the trigger on a desktop; a phone has no room beside it, so the panel opens below, centered,
 * and a phone has no hover, so `showOnHover` stays on the desktop too. `minWidth` is 300 by default: `auto` lets the
 * panel hug its content. A setting that is not offered gives its default, as the Vue demo's hidden controls do.
 */
export function PopoverOverviewDemo() {
  const phone = usePhoneRows();
  const [shownSide, setSide] = useState<(typeof SIDES)[number]>('right');
  const [shownAlign, setAlign] = useState<(typeof ALIGNS)[number]>('center');
  const [minWidth, setMinWidth] = useState<(typeof MIN_WIDTHS)[number]>('300');
  const [shownShowOnHover, setShowOnHover] = useState(false);
  const [translucent, setTranslucent] = useState(false);
  const side = phone ? 'bottom' : shownSide;
  const align = phone ? 'center' : shownAlign;
  const showOnHover = !phone && shownShowOnHover;
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="side" options={SIDES} value={shownSide} onChange={setSide} desktopOnly />
        <Segments name="align" options={ALIGNS} value={shownAlign} onChange={setAlign} desktopOnly />
        <Segments name="minWidth" options={MIN_WIDTHS} value={minWidth} onChange={setMinWidth} />
        <DemoControlBoolean name="showOnHover" value={shownShowOnHover} onChange={setShowOnHover} desktopOnly />
        <DemoControlBoolean name="translucent" value={translucent} onChange={setTranslucent} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center w-full py-10">
        <Popover showOnHover={showOnHover}>
          <Popover.Trigger>
            <Button color="primary" pill={false}>Generate</Button>
          </Popover.Trigger>
          <Popover.Content side={side} align={align} minWidth={minWidth === 'auto' ? 'auto' : 300} translucent={translucent}>
            <div className="p-4">
              <p className="text-sm text-secondary">Use with any floating UI.</p>
            </div>
          </Popover.Content>
        </Popover>
      </div>
    </>
  );
}

function PopoverTextarea({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (next: string) => void;
}) {
  return (
    <Textarea
      value={value}
      onChange={(evt) => onChange?.(evt.target.value)}
      aria-label="Prompt"
      variant="ghost"
      gutterSize="xl"
      rows={3}
      className="w-full"
      placeholder="Describe what you're using the model for, and we'll generate system instructions."
    />
  );
}

function PopoverActionBar({ loading }: { loading?: boolean }) {
  return (
    <div className="px-3 pb-3 flex items-center justify-between">
      <div className="flex gap-1.5 items-center font-normal text-sm text-tertiary">
        <Sparkles width={16} height={16} />
        Free beta
      </div>
      <Button color="primary" size="xs" pill={false} loading={loading} type="submit">
        Create
      </Button>
    </div>
  );
}

function PopoverControllerForm({ value, onChange, submitting, onSubmit }: {
  value: string;
  onChange: (value: string) => void;
  submitting: boolean;
  onSubmit: (close: () => void, shake: () => void) => void;
}) {
  const { shake, close } = usePopoverController();

  const handleSubmit = (evt: FormEvent) => {
    evt.preventDefault();
    onSubmit(close, shake);
  };

  return (
    <form className="pt-2" onSubmit={handleSubmit}>
      <PopoverTextarea value={value} onChange={onChange} />
      <PopoverActionBar loading={submitting} />
    </form>
  );
}

export function PopoverControllerDemo() {
  const wide = useBreakpoint('md');
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const session = useRef(0);

  useEffect(() => () => {
    session.current++;
    clearTimeout(timer.current);
  }, []);

  const changeOpen = (next: boolean) => {
    session.current++;
    clearTimeout(timer.current);
    timer.current = undefined;
    if (next) {
      setSubmitting(false);
      setValue('');
    }
    setOpen(next);
  };

  const submitPrompt = (close: () => void, shake: () => void) => {
    if (!value) {
      shake();
      return;
    }
    if (timer.current !== undefined) return;
    setSubmitting(true);
    const currentSession = session.current;
    timer.current = setTimeout(() => {
      if (session.current !== currentSession) return;
      timer.current = undefined;
      close();
    }, 2000);
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <Popover.Trigger>
        <Button color="primary" pill={false}>Generate</Button>
      </Popover.Trigger>
      <Popover.Content side={wide ? 'right' : 'bottom'}>
        <PopoverControllerForm value={value} onChange={setValue} submitting={submitting} onSubmit={submitPrompt} />
      </Popover.Content>
    </Popover>
  );
}

function ConfirmationBody({ wide }: { wide: boolean }) {
  const { close } = usePopoverController();
  return (
    <>
      <p className={confirmationStyles.Message}>Are you sure you want to delete this event?</p>
      <Button color="danger" variant="soft" block pill={!wide} className={confirmationStyles.Action} onClick={close}>
        Delete event
      </Button>
    </>
  );
}

export function PopoverConfirmationDemo() {
  const wide = useBreakpoint('md');
  return (
    <Popover>
      <Popover.Trigger>
        <Button color="danger" variant="soft" size={wide ? 'md' : '3xl'} block={!wide} pill={!wide}>
          Delete event
        </Button>
      </Popover.Trigger>
      {/* On a phone the panel covers its 50px button and ends 16px above the button's bottom edge. */}
      <Popover.Content side="top" sideOffset={wide ? 8 : -34} className={confirmationStyles.Confirmation}>
        <ConfirmationBody wide={wide} />
      </Popover.Content>
    </Popover>
  );
}

/** Docs stage of the confirmation example in React and Vue: on a phone its button sits at the bottom. */
export function PopoverConfirmationStage({ children }: { children: ReactNode; 'data-demo-stage'?: boolean }) {
  return <div data-demo-stage className={demoStyles.ConfirmationStage}>{children}</div>;
}
