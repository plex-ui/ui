'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Badge } from '@plexui/ui/components/Badge';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { DotsHorizontal } from '@plexui/ui/components/Icon';
import { Menu } from '@plexui/ui/components/Menu';
import { Separator } from '@plexui/ui/components/Separator';
import { CopyTooltip } from '@plexui/ui/components/Tooltip';
import { DemoControlBoolean, controlsTableStyle } from './ButtonDemos';
import { usePreviewEmbed } from './PreviewEmbed';

const CLIENT_ID = 'client_76fb07f7-78e2-4656-abdf-e77b5d7b1ed1';
const FINGERPRINT = '144BA802A02D59A260D0021EC450552A4CA2E3496F4390A6D5A8556BF617420B';
const EXTRA_ORIGINS = Array.from({ length: 24 }, (_, index) => `https://preview-${index + 1}.plexui.com`);

function CopyValue({ value, label }: { value: string; label: string }) {
  return (
    <CopyTooltip copyValue={value}>
      <Button color="secondary" variant="ghost" size="sm" opticallyAlign="start" className="-my-1 max-w-full" aria-label={label}>
        <span className="flex min-w-0 font-mono text-xs">
          <span className="truncate">{value.slice(0, -6)}</span>
          <span className="shrink-0">{value.slice(-6)}</span>
        </span>
      </Button>
    </CopyTooltip>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-x-4 gap-y-1 sm:grid-cols-4">
      <dt className="text-secondary">{label}</dt>
      <dd className="min-w-0 sm:col-span-3">{children}</dd>
    </div>
  );
}

function DetailSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-tertiary">{title}</h3>
        {action && <div className="-my-2 flex shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function DetailsDialogExample({ sections = false, long = false, showActions = true, initialOpen = false, previewOpen = false }: { sections?: boolean; long?: boolean; showActions?: boolean; initialOpen?: boolean; previewOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [paused, setPaused] = useState(false);
  const [localhost, setLocalhost] = useState(true);
  const heading = useRef<HTMLDivElement>(null);
  const origins = ['https://app.plexui.com', ...(localhost ? ['http://localhost:5173'] : []), ...(long ? EXTRA_ORIGINS : [])];
  const metadata = (
    <dl className="space-y-4 text-sm">
      <DetailRow label="Name">Plex application</DetailRow>
      <DetailRow label="Client ID"><CopyValue value={CLIENT_ID} label="Copy client ID" /></DetailRow>
      <DetailRow label="Status"><Badge color={paused ? 'secondary' : 'success'} size="sm">{paused ? 'Paused' : 'Active'}</Badge></DetailRow>
      <DetailRow label="Created">Nov 3, 2026</DetailRow>
      <DetailRow label="Last used">Nov 4, 2026</DetailRow>
    </dl>
  );

  return (
    <div data-demo-stage className="flex flex-col items-center gap-4 py-10">
      <Dialog open={previewOpen || open} onOpenChange={setOpen}>
        {!previewOpen && (!initialOpen || !open) && <Dialog.Trigger>
          <Button color="secondary" variant="outline">{long ? 'View long details' : sections ? 'View application' : 'View details'}</Button>
        </Dialog.Trigger>}
        <Dialog.Content mobileVariant="sheet" width={640} onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus(); }}>
          <Dialog.Header>
            <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>Application details</Dialog.Title></div>
            <Dialog.Description className="sr-only">Application metadata and registered platforms.</Dialog.Description>
            {sections && showActions && <Dialog.HeaderAction>
              <Menu>
                <Menu.Trigger><Button color="secondary" variant="soft" size="2xl" iconSize="2xl" uniform aria-label="Application actions"><DotsHorizontal /></Button></Menu.Trigger>
                <Menu.Content align="end" minWidth="auto">
                  <Menu.Item onSelect={() => setPaused(!paused)}>{paused ? 'Resume application' : 'Pause application'}</Menu.Item>
                </Menu.Content>
              </Menu>
            </Dialog.HeaderAction>}
          </Dialog.Header>
          <Dialog.Body>
            <div className="flex flex-col gap-5 py-2">
              {sections ? <>
                <DetailSection title="Application">{metadata}</DetailSection>
                <Separator />
                <DetailSection title="Web" action={showActions && <Menu>
                  <Menu.Trigger><Button color="secondary" variant="ghost" size="md" uniform aria-label="Web actions"><DotsHorizontal /></Button></Menu.Trigger>
                  <Menu.Content align="end" minWidth="auto">
                    <Menu.Item onSelect={() => setLocalhost(!localhost)}>{localhost ? 'Remove localhost' : 'Allow localhost'}</Menu.Item>
                  </Menu.Content>
                </Menu>}>
                  <dl className="space-y-4 text-sm"><DetailRow label="Origins">
                    <div className="space-y-4">{origins.map((origin) => <div key={origin}><CopyValue value={origin} label={`Copy origin ${origin}`} /></div>)}</div>
                  </DetailRow></dl>
                </DetailSection>
                <Separator />
                <DetailSection title="iOS">
                  <dl className="space-y-4 text-sm">
                    <DetailRow label="Team ID"><CopyValue value="AB12CD34EF" label="Copy team ID" /></DetailRow>
                    <DetailRow label="Bundle ID"><CopyValue value="com.plexui.application" label="Copy bundle ID" /></DetailRow>
                  </dl>
                </DetailSection>
                <Separator />
                <DetailSection title="Android">
                  <dl className="space-y-4 text-sm">
                    <DetailRow label="Package name"><CopyValue value="com.plexui.application" label="Copy package name" /></DetailRow>
                    <DetailRow label="SHA-256"><CopyValue value={FINGERPRINT} label="Copy certificate fingerprint" /></DetailRow>
                  </dl>
                </DetailSection>
              </> : metadata}
            </div>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}

export function DetailsDialogDemo({ sections = false, long = false }: { sections?: boolean; long?: boolean }) {
  const [showActions, setShowActions] = useState(true);
  const phonePreview = usePreviewEmbed() !== null;
  return (
    <>
      {sections && <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="showActions" value={showActions} onChange={setShowActions} />
      </div>}
      <DetailsDialogExample sections={sections} long={long} showActions={showActions} initialOpen={phonePreview} previewOpen={phonePreview} />
    </>
  );
}
