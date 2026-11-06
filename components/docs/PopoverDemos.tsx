'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Textarea } from '@plexui/ui/components/Textarea';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import {
  Bolt,
  Code,
  Functions,
  Globe,
  ImageSquare,
  Search,
  Sparkles,
} from '@plexui/ui/components/Icon';
import { Popover, usePopoverController } from '@plexui/ui/components/Popover';
import confirmationStyles from './PopoverConfirmation.module.css';
import demoStyles from './PopoverDemos.module.css';

export function PopoverBaseDemo() {
  const wide = useBreakpoint('md');
  return (
    <Popover>
      <Popover.Trigger>
        <Button color="primary" pill={false}>Generate</Button>
      </Popover.Trigger>
      <Popover.Content side={wide ? 'right' : 'bottom'}>
        <div className="p-4">
          <p className="text-sm text-secondary">Popover content. Use with any floating UI.</p>
        </div>
      </Popover.Content>
    </Popover>
  );
}

export function PopoverNaturalSizingDemo() {
  return (
    <Popover>
      <Popover.Trigger>
        <Button color="primary" size="sm" variant="ghost" pill={false} gutterSize="xs" className="gap-1.5">
          <Bolt /> Actions
        </Button>
      </Popover.Trigger>
      <Popover.Content className="flex p-1.5" minWidth="auto" side="top">
        <Button color="primary" variant="ghost" pill={false} size="sm" gutterSize="2xs">
          <Functions height={18} width={18} />
        </Button>
        <Button color="primary" variant="ghost" pill={false} size="sm" gutterSize="2xs">
          <Search height={18} width={18} />
        </Button>
        <Button color="primary" variant="ghost" pill={false} size="sm" gutterSize="2xs">
          <Globe height={18} width={18} />
        </Button>
        <Button color="primary" variant="ghost" pill={false} size="sm" gutterSize="2xs">
          <Code height={18} width={18} />
        </Button>
        <Button color="primary" variant="ghost" pill={false} size="sm" gutterSize="2xs">
          <ImageSquare height={18} width={18} />
        </Button>
      </Popover.Content>
    </Popover>
  );
}

function InteractiveContent() {
  const { close } = usePopoverController();
  return (
    <div className="p-3">
      <h3 className="mb-0.5 text-sm font-semibold">Popover with actions</h3>
      <p className="text-sm text-secondary">Try using tab to navigate</p>
      <div className="mt-3 flex gap-2">
        <Button color="secondary" variant="soft" pill={false} onClick={close}>
          Cancel
        </Button>
        <Button color="primary" pill={false} onClick={close}>
          Confirm
        </Button>
      </div>
    </div>
  );
}

export function PopoverHoverDemo() {
  const wide = useBreakpoint('md');
  return (
    <div className="flex flex-col gap-4">
      <Popover showOnHover>
        <Popover.Trigger>
          <Button color="primary" pill={false}>Static content</Button>
        </Popover.Trigger>
        <Popover.Content width={320} side={wide ? 'right' : 'bottom'}>
          <div className="p-3">
            <h3 className="mb-0.5 font-semibold">Popover Title</h3>
            <p className="text-sm text-secondary">
              This is an example of a hoverable popover containing presentational content.
            </p>
            <footer className="mt-2 text-xs text-tertiary">Last updated June 20, 2025</footer>
          </div>
        </Popover.Content>
      </Popover>
      <Popover showOnHover>
        <Popover.Trigger>
          <Button color="primary" pill={false}>Interactive content</Button>
        </Popover.Trigger>
        <Popover.Content minWidth={230} side={wide ? 'right' : 'bottom'}>
          <InteractiveContent />
        </Popover.Content>
      </Popover>
    </div>
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
