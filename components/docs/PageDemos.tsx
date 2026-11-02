'use client';

import { useState, type ReactNode } from 'react';
import { Badge } from '@plexui/ui/components/Badge';
import { Button } from '@plexui/ui/components/Button';
import { Page, type PageWidth } from '@plexui/ui/components/Page';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';

const ROWS = Array.from({ length: 24 }, (_, index) => `Order ${1024 + index}`);

function Frame({ children }: { children: ReactNode }) {
  return <div className="h-[420px] w-full overflow-hidden rounded-xl border border-default">{children}</div>;
}

function Rows() {
  return (
    <div className="divide-y divide-default rounded-xl border border-default">
      {ROWS.map((row) => (
        <div key={row} className="flex items-center justify-between px-4 py-3 text-sm">
          <span>{row}</span>
          <span className="text-secondary">Paid</span>
        </div>
      ))}
    </div>
  );
}

export function PageOverviewDemo() {
  return (
    <Frame>
      <Page>
        <Page.Header>
          <Page.Bar>
            <Page.Title>Orders</Page.Title>
            <Page.Actions>
              <Button color="primary" pill size="md">New order</Button>
            </Page.Actions>
          </Page.Bar>
        </Page.Header>
        <Page.Content>
          <Rows />
        </Page.Content>
      </Page>
    </Frame>
  );
}

export function PageWidthsDemo() {
  const [width, setWidth] = useState<PageWidth>('column');

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <SegmentedControl<PageWidth> aria-label="Page width" value={width} onChange={setWidth}>
        <SegmentedControl.Option value="full">Full</SegmentedControl.Option>
        <SegmentedControl.Option value="wide">Wide</SegmentedControl.Option>
        <SegmentedControl.Option value="column">Column</SegmentedControl.Option>
      </SegmentedControl>
      <Frame>
        <Page width={width}>
          <Page.Header>
            <Page.Bar>
              <Page.Title>Settings</Page.Title>
              <Page.Actions>
                <Button color="primary" pill size="md">Save</Button>
              </Page.Actions>
            </Page.Bar>
          </Page.Header>
          <Page.Content>
            <Rows />
          </Page.Content>
        </Page>
      </Frame>
    </div>
  );
}

export function PageHeadingDemo() {
  return (
    <Frame>
      <Page width="wide">
        <Page.Header>
          <Page.Bar>
            <Page.Heading>
              <Page.Title>Menu</Page.Title>
              <Badge color="info" size="sm" variant="outline">Draft</Badge>
              <Page.Subtitle>Saved a minute ago</Page.Subtitle>
            </Page.Heading>
            <Page.Actions>
              <Button color="primary" pill size="md">Publish</Button>
            </Page.Actions>
          </Page.Bar>
        </Page.Header>
        <Page.Content>
          <Rows />
        </Page.Content>
      </Page>
    </Frame>
  );
}

export function PageFillDemo() {
  return (
    <Frame>
      <Page>
        <Page.Header divider={false}>
          <Page.Bar>
            <Page.Title>Orders</Page.Title>
          </Page.Bar>
        </Page.Header>
        <Page.Content fill>
          <div className="min-h-0 flex-1 overflow-auto pb-6">
            <Rows />
          </div>
        </Page.Content>
      </Page>
    </Frame>
  );
}
