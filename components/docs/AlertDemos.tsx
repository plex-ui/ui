'use client';

import React, { useState } from 'react';
import { Alert } from '@plexui/ui/components/Alert';
import { Button } from '@plexui/ui/components/Button';
import { TextLink } from '@plexui/ui/components/TextLink';
import { Lightbulb } from '@plexui/ui/components/Icon';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';

const COLOR_OPTIONS = [
  'primary',
  'success',
  'danger',
  'warning',
  'caution',
  'info',
  'discovery',
] as const;

const VARIANT_OPTIONS = ['solid', 'soft', 'outline'] as const;

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',

  width: '100%',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function RowMatrix({
  rowLabels,
  renderRow,
}: {
  rowLabels: Readonly<string[]>;
  renderRow: (rowIndex: number) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      {rowLabels.map((row, ri) => (
        <div key={ri} className="flex items-center">
          <div
            className="text-right text-sm mr-8 min-w-[4rem]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {row}
          </div>
          <div className="flex-1">{renderRow(ri)}</div>
        </div>
      ))}
    </div>
  );
}

export function AlertColorsDemo() {
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('outline');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl<(typeof VARIANT_OPTIONS)[number]>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 w-full py-12 flex items-center justify-center">
        <div className="w-fit min-w-full max-w-[500px]">
          <RowMatrix
            rowLabels={[...COLOR_OPTIONS]}
            renderRow={(row) => (
              <Alert
                color={COLOR_OPTIONS[row]}
                variant={variant}
                title="Scheduled maintenance on Saturday, 2-4 AM PT"
                description={
                  <>
                    Track status updates on{' '}
                    <TextLink color="currentcolor" href="#">
                      status page
                    </TextLink>
                  </>
                }
              />
            )}
          />
        </div>
      </div>
    </>
  );
}

export function AlertIndicatorDemo() {
  return (
    <div data-demo-stage className="flex-1 w-full py-12 flex flex-col items-center justify-center gap-6">
      <Alert
        indicator={<Lightbulb />}
        description={
          <>
            We&apos;re working on centralizing SCIM and invite settings. For now, setup is handled within individual product settings. <TextLink href="#">Learn more</TextLink>
          </>
        }
      />
      <Alert
        indicator={false}
        description="Version 2.18.5 rolls out behind-the-scenes tweaks to caching and background sync. You don't need to do anything."
      />
    </div>
  );
}

export function AlertActionsDemo() {
  return (
    <div data-demo-stage className="flex-1 w-full py-12 flex flex-col items-center justify-center gap-6">
      <Alert
        variant="soft"
        color="warning"
        title="Password expires in 3 days"
        description="Update it now to avoid losing access to your account."
        actions={<Button color="primary" pill>Update password</Button>}
      />
      <Alert
        variant="soft"
        color="warning"
        title="Your API key will be rotated soon"
        description="Automatic key rotation is scheduled for March 10. Download the new key afterward to keep your integrations running."
        actions={
          <Button color="warning" variant="soft" pill>
            Remind me later
          </Button>
        }
        onDismiss={() => {}}
      />
    </div>
  );
}

export function AlertDismissibleDemo() {
  return (
    <div data-demo-stage className="flex-1 w-full py-12 flex flex-col items-center justify-center gap-6">
      <Alert
        className="items-start"
        title="Try our new dashboard layout"
        description="We've introduced a streamlined layout that makes using the dashboard even easier. You can switch back any time."
        actions={
          <>
            <Button color="primary" variant="soft" pill>
              Dismiss
            </Button>
            <Button color="primary" variant="solid" pill>
              Try it
            </Button>
          </>
        }
      />
      <Alert
        title="Thank you!"
        description="Your application has been received. We will review your application and respond within the next 48 hours."
        onDismiss={() => {}}
      />
    </div>
  );
}

export function AlertBannerDemo() {
  return (
    <div data-demo-stage className="flex-1 w-full py-12 flex flex-col items-stretch justify-center gap-6">
      <Alert
        banner
        color="caution"
        variant="soft"
        indicator={false}
        description="You are offline. Changes will sync when the connection is back."
      />
      <Alert
        banner
        color="info"
        variant="outline"
        description="A new version is available."
        actions={
          <Button color="primary" variant="soft" size="sm">
            Reload
          </Button>
        }
      />
    </div>
  );
}
