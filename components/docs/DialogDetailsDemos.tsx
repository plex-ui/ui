'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Badge } from '@plexui/ui/components/Badge';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { CopyTooltip } from '@plexui/ui/components/Tooltip';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { usePreviewEmbed } from './PreviewEmbed';
import styles from './DialogDetailsDemos.module.css';

const CLIENT_ID = 'client_76fb07f7-78e2-4656-abdf-e77b5d7b1ed1';

function CopyValue({ value, label }: { value: string; label: string }) {
  const wide = useBreakpoint('md');
  return (
    <CopyTooltip copyValue={value} sideOffset={wide ? 5 : 24} align={wide ? 'center' : 'start'}>
      <Button data-detail-copy color="secondary" variant="ghost" size="sm" opticallyAlign="start" className="-my-1 max-w-full" aria-label={label}>
        <span data-detail-value className="flex min-w-0 font-mono text-xs">
          <span className="truncate">{value.slice(0, -6)}</span>
          <span className="shrink-0">{value.slice(-6)}</span>
        </span>
      </Button>
    </CopyTooltip>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div data-detail-row className="grid grid-cols-1 items-start gap-x-4 gap-y-1 sm:grid-cols-4">
      <dt className="text-secondary">{label}</dt>
      <dd className="min-w-0 sm:col-span-3">{children}</dd>
    </div>
  );
}

export function DetailsDialogExample({ initialOpen = false, previewOpen = false }: { initialOpen?: boolean; previewOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const heading = useRef<HTMLDivElement>(null);

  return (
    <div data-demo-stage className="flex flex-col items-center gap-4 py-10">
      <Dialog open={previewOpen || open} onOpenChange={setOpen}>
        {!previewOpen && (!initialOpen || !open) && <Dialog.Trigger>
          <Button color="secondary" variant="outline">View details</Button>
        </Dialog.Trigger>}
        <Dialog.Content mobileVariant="sheet" width={640} onOpenAutoFocus={(event) => { event.preventDefault(); if (!previewOpen) heading.current?.focus({ preventScroll: true }); }}>
          <Dialog.Header>
            <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>Application details</Dialog.Title></div>
            <Dialog.Description className="sr-only">Application metadata.</Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <div className={`${styles.Content} py-2`}>
              <dl data-detail-list className="space-y-4 text-sm">
                <DetailRow label="Name">Plex application</DetailRow>
                <DetailRow label="Client ID"><CopyValue value={CLIENT_ID} label="Copy client ID" /></DetailRow>
                <DetailRow label="Status"><Badge color="success" size="sm">Active</Badge></DetailRow>
                <DetailRow label="Created">Nov 3, 2026</DetailRow>
                <DetailRow label="Last used">Nov 4, 2026</DetailRow>
              </dl>
            </div>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}

export function DetailsDialogDemo() {
  const phonePreview = usePreviewEmbed() !== null;
  return <DetailsDialogExample initialOpen={phonePreview} previewOpen={phonePreview} />;
}
