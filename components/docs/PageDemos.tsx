'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Badge } from '@plexui/ui/components/Badge';
import { Button } from '@plexui/ui/components/Button';
import { Page, type PageBarBackground, type PageWidth } from '@plexui/ui/components/Page';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { useDemoControlSync } from './PreviewEmbed';
import { BarBackgroundControl, Rows } from './ToolbarDemos';
import s from './PageDemos.module.css';

// The frame of a preview is narrower than both widths, so at their real size all three look alike.
const HALF_WIDTHS = { '--page-width-wide': '640px', '--page-width-column': '384px' } as CSSProperties;

function Frame({ children }: { children: ReactNode }) {
  return <div data-demo-stage className={s.Stage}><div className={s.Frame}>{children}</div></div>;
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
  useDemoControlSync('width', width, setWidth);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="width">
          <SegmentedControl<PageWidth> aria-label="Page width" size="xs" value={width} onChange={setWidth}>
            <SegmentedControl.Option value="full">full</SegmentedControl.Option>
            <SegmentedControl.Option value="wide">wide</SegmentedControl.Option>
            <SegmentedControl.Option value="column">column</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <Frame>
          <Page style={HALF_WIDTHS} width={width}>
            <Page.Header>
              <Page.Bar>
                <Page.Title>Orders</Page.Title>
                <Page.Actions>
                  <Button color="primary" pill size="md">Export</Button>
                </Page.Actions>
              </Page.Bar>
            </Page.Header>
            <Page.Content>
              <Rows />
            </Page.Content>
          </Page>
      </Frame>
    </>
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
              <Page.Subtitle>
                <Badge color="info" size="sm" variant="outline">Draft</Badge>
                <span>Saved a minute ago</span>
              </Page.Subtitle>
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

export function PageBackgroundDemo() {
  const [background, setBackground] = useState<PageBarBackground>('soft');

  return (
    <>
      <BarBackgroundControl value={background} onChange={setBackground} />
      <Frame>
        <Page>
          <Page.Header background={background}>
            <Page.Bar>
              <Page.Title>Orders</Page.Title>
            </Page.Bar>
          </Page.Header>
          <Page.Content>
            <Rows />
          </Page.Content>
          <Page.Footer background={background}>
            <Button color="primary" pill block>New order</Button>
          </Page.Footer>
        </Page>
      </Frame>
    </>
  );
}
