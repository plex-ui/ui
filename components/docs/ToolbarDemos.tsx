'use client';

import { useState, type ReactNode } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { DotsHorizontal, Filter, InfoCircle, Plus, PlusLg, Search, SearchSm, Translate } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { Page } from '@plexui/ui/components/Page';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Toolbar, type BarBackground, type ToolbarTitleAlign, type ToolbarTitleStyle } from '@plexui/ui/components/Toolbar';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { usePreviewEmbed } from './PreviewEmbed';
import s from './PageDemos.module.css';
import t from './ToolbarDemos.module.css';

const ROWS = Array.from({ length: 24 }, (_, index) => `Order ${1024 + index}`);

function Frame({ children }: { children: ReactNode }) {
  return <div data-demo-stage className={s.Stage}><div className={s.Frame}>{children}</div></div>;
}

/** Orders in the rows of a FieldGroup: an iOS list on a phone, a bordered list on a desktop. */
export function Rows() {
  return (
    <FieldGroup>
      {ROWS.map((row) => (
        <div key={row} data-row className={t.Row}>
          <span>{row}</span>
          <span className={t.Value}>Paid</span>
        </div>
      ))}
    </FieldGroup>
  );
}

export function ToolbarOverviewDemo() {
  return (
    <Frame>
      <Page surface="grouped">
        <Toolbar>
          <Toolbar.Leading>
            <NavigationButton action="back" />
          </Toolbar.Leading>
          <Toolbar.Title>Orders</Toolbar.Title>
          <Toolbar.Trailing>
            <NavigationButton action="close" />
          </Toolbar.Trailing>
        </Toolbar>
        <Page.Content>
          <Rows />
        </Page.Content>
      </Page>
    </Frame>
  );
}

const TITLE_STYLES = ['inline', 'large', 'compact-large', 'compact-medium'] as const satisfies readonly ToolbarTitleStyle[];

export function ToolbarTitlesDemo() {
  const [titleStyle, setTitleStyle] = useState<ToolbarTitleStyle>('inline');
  const [titleAlign, setTitleAlign] = useState<ToolbarTitleAlign>('center');
  const [subtitle, setSubtitle] = useState(true);
  const compact = titleStyle === 'compact-large' || titleStyle === 'compact-medium';

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="titleStyle">
          <SegmentedControl<ToolbarTitleStyle> aria-label="titleStyle" size="xs" value={titleStyle} onChange={setTitleStyle}>
            {TITLE_STYLES.map((value) => <SegmentedControl.Option key={value} value={value}>{value}</SegmentedControl.Option>)}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="titleAlign">
          <SegmentedControl<ToolbarTitleAlign> aria-label="titleAlign" size="xs" value={titleAlign} onChange={setTitleAlign}>
            <SegmentedControl.Option value="center">center</SegmentedControl.Option>
            <SegmentedControl.Option value="start">start</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="subtitle" value={subtitle} onChange={setSubtitle} />
      </div>
      <Frame>
        <Page surface="grouped">
          <Toolbar titleStyle={titleStyle} titleAlign={titleAlign}>
            {!compact && (
              <Toolbar.Leading>
                <NavigationButton action="back" />
              </Toolbar.Leading>
            )}
            <Toolbar.Title subtitle={subtitle && !compact ? '24 orders' : undefined}>Orders</Toolbar.Title>
            <Toolbar.Trailing>
              <NavigationButton action={titleStyle === 'large' ? 'confirm' : 'close'} />
            </Toolbar.Trailing>
          </Toolbar>
          <Page.Content>
            <Rows />
          </Page.Content>
        </Page>
      </Frame>
    </>
  );
}

export function ToolbarGroupDemo() {
  return (
    <Frame>
      <Page surface="grouped">
        <Toolbar>
          <Toolbar.Leading>
            <NavigationButton action="close" />
          </Toolbar.Leading>
          <Toolbar.Trailing>
            <Button color="secondary" variant="soft" uniform pill aria-label="Details"><InfoCircle /></Button>
            <Toolbar.Group aria-label="Order actions">
              <Button color="secondary" variant="soft" uniform pill aria-label="Translate"><Translate /></Button>
              <Button color="secondary" variant="soft" uniform pill aria-label="More"><DotsHorizontal /></Button>
            </Toolbar.Group>
          </Toolbar.Trailing>
        </Toolbar>
        <Page.Content>
          <Rows />
        </Page.Content>
      </Page>
    </Frame>
  );
}

export function ToolbarSearchDemo() {
  return (
    <Frame>
      <Page surface="grouped">
        <Toolbar>
          <Toolbar.Content fill>
            <Input variant="soft" pill placeholder="Search" aria-label="Search orders" startAdornment={<SearchSm />} />
          </Toolbar.Content>
          <Toolbar.Trailing>
            <NavigationButton action="close" aria-label="Close search" />
          </Toolbar.Trailing>
        </Toolbar>
        <Page.Content>
          <Rows />
        </Page.Content>
      </Page>
    </Frame>
  );
}

const BOTTOM_CONTENT = ['buttons', 'search', 'action'] as const;
type BottomContent = (typeof BOTTOM_CONTENT)[number];

export function ToolbarBottomDemo() {
  const [content, setContent] = useState<BottomContent>('buttons');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="content">
          <SegmentedControl<BottomContent> aria-label="content" size="xs" value={content} onChange={setContent}>
            {BOTTOM_CONTENT.map((value) => <SegmentedControl.Option key={value} value={value}>{value}</SegmentedControl.Option>)}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <Frame>
        <Page surface="grouped">
          <Toolbar>
            <Toolbar.Title>Orders</Toolbar.Title>
          </Toolbar>
          <Page.Content>
            <Rows />
          </Page.Content>
          {content === 'buttons' ? (
            <Toolbar placement="bottom">
              <Toolbar.Leading>
                <Button color="secondary" variant="soft" uniform pill aria-label="Filter"><Filter /></Button>
              </Toolbar.Leading>
              <Toolbar.Content>
                <Button color="primary" pill>New order</Button>
              </Toolbar.Content>
              <Toolbar.Trailing>
                <Button color="secondary" variant="soft" uniform pill aria-label="Search"><Search /></Button>
              </Toolbar.Trailing>
            </Toolbar>
          ) : content === 'search' ? (
            <Toolbar placement="bottom">
              <Toolbar.Content fill>
                <Input variant="soft" pill placeholder="Search" aria-label="Search orders" startAdornment={<SearchSm />} />
              </Toolbar.Content>
              <Toolbar.Trailing>
                <Button color="secondary" variant="soft" uniform pill iconSize="sm" aria-label="New order"><PlusLg /></Button>
              </Toolbar.Trailing>
            </Toolbar>
          ) : (
            <Toolbar placement="bottom">
              <Toolbar.Content fill>
                <Button color="primary" pill block><Plus /> New order</Button>
              </Toolbar.Content>
            </Toolbar>
          )}
        </Page>
      </Frame>
    </>
  );
}

export const BAR_BACKGROUNDS = ['soft', 'hard', 'glass', 'solid'] as const satisfies readonly BarBackground[];

/** The `background` control of the bar demos: one SegmentedControl over the four scroll edge styles. */
export function BarBackgroundControl({ value, onChange, phoneOnly = false }: { value: BarBackground; onChange: (value: BarBackground) => void; phoneOnly?: boolean }) {
  return (
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlRow name="background" phoneOnly={phoneOnly}>
        <SegmentedControl<BarBackground> aria-label="background" size="xs" value={value} onChange={onChange}>
          {BAR_BACKGROUNDS.map((background) => <SegmentedControl.Option key={background} value={background}>{background}</SegmentedControl.Option>)}
        </SegmentedControl>
      </DemoControlRow>
    </div>
  );
}

export function ToolbarBackgroundDemo() {
  const [background, setBackground] = useState<BarBackground>('glass');

  return (
    <>
      <BarBackgroundControl value={background} onChange={setBackground} />
      <Frame>
        <Page surface="grouped">
          <Toolbar background={background}>
            <Toolbar.Leading>
              <NavigationButton action="back" />
            </Toolbar.Leading>
            <Toolbar.Title>Orders</Toolbar.Title>
          </Toolbar>
          <Page.Content>
            <Rows />
          </Page.Content>
          <Toolbar placement="bottom" background={background}>
            <Toolbar.Content>
              <Button color="primary" pill>New order</Button>
            </Toolbar.Content>
          </Toolbar>
        </Page>
      </Frame>
    </>
  );
}

export function ToolbarDisabledDemo() {
  const [disabled, setDisabled] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <Frame>
        <Page surface="grouped">
          <Toolbar>
            <Toolbar.Leading>
              <Button color="secondary" variant="soft" pill>Cancel</Button>
            </Toolbar.Leading>
            <Toolbar.Title>New order</Toolbar.Title>
            <Toolbar.Trailing>
              <NavigationButton action="confirm" disabled={disabled} />
            </Toolbar.Trailing>
          </Toolbar>
          <Page.Content>
            <Rows />
          </Page.Content>
          <Toolbar placement="bottom">
            <Toolbar.Leading>
              <Button color="secondary" variant="soft" uniform pill aria-label="Filter" disabled={disabled}><Filter /></Button>
            </Toolbar.Leading>
            <Toolbar.Content>
              <Button color="primary" pill disabled={disabled}>Place order</Button>
            </Toolbar.Content>
            <Toolbar.Trailing>
              <Toolbar.Group aria-label="Order actions">
                <Button color="secondary" variant="soft" uniform pill aria-label="Translate" disabled={disabled}><Translate /></Button>
                <Button color="secondary" variant="soft" uniform pill aria-label="More"><DotsHorizontal /></Button>
              </Toolbar.Group>
            </Toolbar.Trailing>
          </Toolbar>
        </Page>
      </Frame>
    </>
  );
}

export function ToolbarSheetDemo() {
  const phonePreview = usePreviewEmbed() !== null;
  const [open, setOpen] = useState(phonePreview);

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <Dialog open={phonePreview || open} onOpenChange={setOpen}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline">Show orders</Button>
        </Dialog.Trigger>
        <Dialog.Content mobileVariant="sheet" surface="grouped" onOpenAutoFocus={(event) => { if (phonePreview) event.preventDefault(); }}>
          <Toolbar>
            <Toolbar.Leading>
              <Dialog.Close>
                <NavigationButton action="close" />
              </Dialog.Close>
            </Toolbar.Leading>
            <Toolbar.Title>Orders</Toolbar.Title>
          </Toolbar>
          <Dialog.Header>
            <Dialog.Title>Orders</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Rows />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
