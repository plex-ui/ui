'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { VueDemo } from './VueDemo';
import confirmationStyles from '../PopoverConfirmation.module.css';

/** Responsive examples with a controller request owned by the mounted preview. */
export function VuePopoverDemo({ context, ...props }: ComponentProps<typeof VueDemo>) {
  const wide = useBreakpoint('md');
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
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
      setPrompt('');
    }
    setOpen(next);
  };

  const submitPrompt = (close: () => void, shake: () => void) => {
    if (!prompt) {
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

  return <VueDemo {...props} context={{ ...context, wide, open, prompt, submitting, setOpen: changeOpen, setPrompt, submitPrompt }} />;
}

/** The confirmation example reads the shared docs styles as `styles`. */
export function VuePopoverConfirmationDemo({ context, ...props }: ComponentProps<typeof VueDemo>) {
  return <VuePopoverDemo {...props} context={{ ...context, styles: confirmationStyles }} />;
}
