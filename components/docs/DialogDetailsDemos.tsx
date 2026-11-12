'use client';

import { useRef, useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { CopyTooltip } from '@plexui/ui/components/Tooltip';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { usePreviewEmbed } from './PreviewEmbed';

const CLIENT_ID = 'client_76fb07f7-78e2-4656-abdf-e77b5d7b1ed1';

function CopyValue({ value, label }: { value: string; label: string }) {
  const wide = useBreakpoint('md');
  return (
    <CopyTooltip copyValue={value} sideOffset={wide ? 5 : 24} align={wide ? 'center' : 'start'}>
      <Button color="secondary" variant="ghost" size="sm" opticallyAlign="start" className="-my-1 min-w-0 max-w-full" aria-label={label}>
        <span className="flex min-w-0 md:font-mono md:text-xs">
          <span className="truncate">{value.slice(0, -6)}</span>
          <span className="shrink-0">{value.slice(-6)}</span>
        </span>
      </Button>
    </CopyTooltip>
  );
}

export function DetailsDialogExample({ initialOpen = false, previewOpen = false }: { initialOpen?: boolean; previewOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const heading = useRef<HTMLDivElement>(null);
  const wide = useBreakpoint('md');

  return (
    <div data-demo-stage className="flex flex-col items-center gap-4 py-10">
      <Dialog open={previewOpen || open} onOpenChange={setOpen}>
        {!previewOpen && (!initialOpen || !open) && <Dialog.Trigger>
          <Button color="secondary" variant="outline">View details</Button>
        </Dialog.Trigger>}
        <Dialog.Content mobileVariant="sheet" surface="grouped" width={640} onOpenAutoFocus={(event) => { event.preventDefault(); if (!previewOpen) heading.current?.focus({ preventScroll: true }); }}>
          <Dialog.Header>
            <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>Application details</Dialog.Title></div>
            <Dialog.Description className="sr-only">Application metadata.</Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <FieldGroup>
              <Field row label="Name"><output>Plex application</output></Field>
              {/* On a phone a value too long for the row goes under its label, as iOS lays out a value cell */}
              <Field row label="Client ID" orientation={wide ? undefined : 'vertical'}><CopyValue value={CLIENT_ID} label="Copy client ID" /></Field>
              <Field row label="Status"><output>Active</output></Field>
              <Field row label="Created"><output>Nov 3, 2026</output></Field>
              <Field row label="Last used"><output>Nov 4, 2026</output></Field>
            </FieldGroup>
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
