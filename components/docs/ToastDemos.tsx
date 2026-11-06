'use client';

import { Button } from '@plexui/ui/components/Button';
import { Toaster, toast, compact } from '@plexui/ui/components/Toast';

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

export function ToastOverviewDemo() {
  return (
    <DemoStage>
      <Button
        color="secondary"
        variant="outline"
        onClick={() => toast('Inquiry ID copied')}
      >
        Show toast
      </Button>
    </DemoStage>
  );
}

export function ToastVariantsDemo() {
  return (
    <DemoStage>
      <Button color="secondary" variant="outline" onClick={() => toast('Changes saved')}>
        Default
      </Button>
      <Button
        color="secondary"
        variant="outline"
        onClick={() => toast.success('Inquiry ID copied')}
      >
        Success
      </Button>
      <Button
        color="secondary"
        variant="outline"
        onClick={() => toast.error('Failed to assign owner')}
      >
        Error
      </Button>
      <Button
        color="secondary"
        variant="outline"
        onClick={() => toast.warning('Session expires in 2 minutes')}
      >
        Warning
      </Button>
      <Button
        color="secondary"
        variant="outline"
        onClick={() => toast.info('New version available')}
      >
        Info
      </Button>
    </DemoStage>
  );
}

export function ToastWithDescriptionDemo() {
  return (
    <DemoStage>
      <Button
        color="secondary"
        variant="outline"
        onClick={() =>
          toast('Changes saved', {
            description: 'Your profile is live for everyone on the team.',
          })
        }
      >
        Show toast
      </Button>
    </DemoStage>
  );
}

export function ToastWithActionDemo() {
  return (
    <DemoStage>
      <Button
        color="secondary"
        variant="outline"
        onClick={() =>
          toast('Message sent', {
            description: 'Delivered to #design channel.',
            action: {
              label: 'Undo',
              onClick: () => toast.success('Message recalled'),
            },
          })
        }
      >
        Show toast with action
      </Button>
    </DemoStage>
  );
}

export function ToastPromiseDemo() {
  const fakeSave = () =>
    new Promise<{ name: string }>((resolve) => {
      setTimeout(() => resolve({ name: 'Profile' }), 1500);
    });

  return (
    <DemoStage>
      <Button
        color="secondary"
        variant="outline"
        onClick={() =>
          toast.promise(fakeSave(), {
            loading: 'Saving…',
            success: (data) => `${data.name} saved`,
            error: 'Save failed',
          })
        }
      >
        Run promise
      </Button>
    </DemoStage>
  );
}

export function ToastLongContentDemo() {
  return (
    <DemoStage>
      <Button
        color="secondary"
        variant="outline"
        onClick={() =>
          toast('Your deployment is still running', {
            description:
              'This is a long message to show how the toast handles multi-line content without clipping or awkward wrapping. The title and description should both wrap cleanly.',
          })
        }
      >
        Long content
      </Button>
    </DemoStage>
  );
}

export function ToastCompactDemo() {
  return (
    <DemoStage>
      <Button
        color="secondary"
        variant="outline"
        onClick={() => toast.success('Inquiry ID copied', compact)}
      >
        Compact toast
      </Button>
    </DemoStage>
  );
}

export function ToastDismissibleDemo() {
  return (
    <DemoStage>
      <Button
        color="secondary"
        variant="outline"
        onClick={() => {
          const id = toast('Backup scheduled for 2:00 AM UTC', {
            description: 'This stays open until you dismiss it.',
            duration: Infinity,
            action: {
              label: 'Dismiss',
              onClick: () => toast.dismiss(id),
            },
          });
        }}
      >
        Persistent toast
      </Button>
    </DemoStage>
  );
}
