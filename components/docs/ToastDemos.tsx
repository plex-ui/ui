'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Toaster, toast, compact as compactOptions } from '@plexui/ui/components/Toast';
import { controlsTableStyle, DemoControlBoolean, Segments } from './ButtonDemos';
import { TOAST_LONG_DESCRIPTION, TOAST_MESSAGES } from './toastMessages';

export function ToastDemosHost() {
  return <div data-preview-support><Toaster /></div>;
}

function DemoStage({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-stage
      className="flex-1 w-full py-12 flex flex-wrap items-center justify-center gap-3"
    >
      {children}
    </div>
  );
}

const TYPE_OPTIONS = ['default', 'success', 'error', 'warning', 'info', 'promise'] as const;
const DESCRIPTION_OPTIONS = ['none', 'short', 'long'] as const;
const ACTION_OPTIONS = [
  { value: 'none', label: 'none' },
  { value: 'action', label: 'action' },
  { value: 'cancel', label: 'action + cancel' },
] as const;

/** Resolves with the saved profile after 1.5 seconds, for the promise toast */
const saveProfile = () =>
  new Promise<{ name: string }>((resolve) => {
    setTimeout(() => resolve({ name: 'Profile' }), 1500);
  });

/** The Overview, with every setting of a toast: what the page's examples once showed one by one (Variants,
 * Description, Action, Long content, Compact, Persistent, Promise) are its settings (owner 11.11: «в первом примере
 * можно сразу показать все со всеми настройками»; 13.11 «что это и почему отдельно?» of Promise). A promise is one more
 * type, as Sonner's own docs list it: the toast shows a loading state, then the default type's success. A persistent
 * toast waits to be closed, so it is offered with an action or a close button; the button shows the toast with the
 * settings chosen. */
export function ToastOverviewDemo() {
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>('default');
  const [icon, setIcon] = useState(true);
  const [description, setDescription] = useState<(typeof DESCRIPTION_OPTIONS)[number]>('none');
  const [action, setAction] = useState<(typeof ACTION_OPTIONS)[number]['value']>('none');
  const [closeButton, setCloseButton] = useState(false);
  const [compact, setCompact] = useState(false);
  const [persistent, setPersistent] = useState(false);
  const closable = action !== 'none' || closeButton;
  // A promise ends as the default type's message: "Profile saved", its description and its action
  const message = TOAST_MESSAGES[type === 'promise' ? 'default' : type];
  const show = () => {
    const options = {
      description: description === 'none' ? undefined : description === 'short' ? message.description : TOAST_LONG_DESCRIPTION,
      action: action === 'none' ? undefined : { label: message.action, onClick: () => {} },
      cancel: action === 'cancel' ? { label: 'Cancel', onClick: () => {} } : undefined,
      closeButton,
      duration: closable && persistent ? Infinity : undefined,
      ...(compact ? compactOptions : {}),
    };
    if (type === 'promise') {
      toast.promise(saveProfile(), { loading: 'Saving…', success: (data) => `${data.name} saved`, error: 'Save failed', ...options });
    } else {
      // A typed toast's icon; null leaves it out (owner 12.11: «как отключить иконку?»). A promise keeps its loader.
      (type === 'default' ? toast : toast[type])(message.title, { ...options, icon: icon ? undefined : null });
    }
  };
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="type" options={TYPE_OPTIONS} value={type} onChange={setType} />
        {type !== 'default' && type !== 'promise' && <DemoControlBoolean name="icon" value={icon} onChange={setIcon} />}
        <Segments name="description" options={DESCRIPTION_OPTIONS} value={description} onChange={setDescription} />
        <Segments name="action" options={ACTION_OPTIONS} value={action} onChange={setAction} />
        <DemoControlBoolean name="closeButton" value={closeButton} onChange={setCloseButton} />
        <DemoControlBoolean name="compact" value={compact} onChange={setCompact} />
        {closable && <DemoControlBoolean name="persistent" value={persistent} onChange={setPersistent} />}
      </div>
      <DemoStage>
        <Button color="secondary" variant="outline" onClick={show}>
          Show toast
        </Button>
      </DemoStage>
    </>
  );
}
